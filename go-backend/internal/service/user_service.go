package service

import (
	"context"
	crand "crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"math/rand"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

const (
	emailCodeExpire   = time.Minute * 5
	emailCodeCacheKey = "email_code:%s:%s" // 命名空间 by mode，跨 mode 互不串
	nomuLogoURL       = "https://kanocifer.chat/logo/logo.png"
)

type LoginResponse struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

// UserRepositoryer 定义 Userer 依赖的持久层能力集合。
// 由 postgres.UserRepo 实现；service 仅依赖此接口，便于测试替换。
type UserRepositoryer interface {
	Create(ctx context.Context, user *model.User, profile *model.Profile) error
	GetByID(ctx context.Context, id uint) (*model.User, error)
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, *model.Profile, error)
	GetByGithubID(ctx context.Context, githubID int) (*model.User, error)
	SetGithubID(ctx context.Context, userID uint, githubID int) error
	ClearGithubID(ctx context.Context, userID uint) error
	UsernameExists(ctx context.Context, username string) bool
	EmailExists(ctx context.Context, email string) bool
	ListUsersWithLoginRecords(ctx context.Context) ([]model.User, error)
	Update(ctx context.Context, user *model.User) error
	UpdateProfile(ctx context.Context, profile *model.Profile) error
	GetProfile(ctx context.Context, userID uint) (*model.Profile, error)
	CreateProfile(ctx context.Context, userID uint) (*model.Profile, error)
	Delete(ctx context.Context, user *model.User) error
}

// Userer 定义 user handler 依赖的业务能力集合。
// 由 *userService 实现；handler 仅依赖此接口，便于测试替换。
type Userer interface {
	GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error)
	GetByUsername(ctx context.Context, username string) (*model.User, *model.Profile, error)
	CreateUser(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error)
	SendEmailCode(ctx context.Context, email, mode string) bool
	SendMagicLoginEmail(ctx context.Context, email, mode string) bool
	Authenticate(ctx context.Context, username, password string) (*model.User, error)
	AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error)
	CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error)
	RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error)
	Logout(ctx context.Context, userID uint)
	UserToDict(u *model.User, p *model.Profile) map[string]any
}

// userService 持有 repo 和 redis，负责编排业务逻辑。
//
// adminUserIDs / frontendURLs 由调用方从 config 注入，避免本包直接读取全局 config.Cfg。
// frontendURLs 按 mode 索引（blog / nomu），用于魔法登录邮件链接选 host + 路径。
type userService struct {
	repo         UserRepositoryer
	redis        *redis.Client
	adminUserIDs []int
	frontendURLs map[string]string
}

func NewUserService(repo UserRepositoryer, redis *redis.Client, adminUserIDs []int, frontendURLs map[string]string) *userService {
	trimmed := make(map[string]string, len(frontendURLs))
	for k, v := range frontendURLs {
		trimmed[k] = strings.TrimRight(v, "/")
	}
	return &userService{
		repo:         repo,
		redis:        redis,
		adminUserIDs: adminUserIDs,
		frontendURLs: trimmed,
	}
}

// ---------- 查询 ----------

func (s *userService) GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, usererrs.ErrUserNotFound
	}
	return u, u.Profile, nil
}

func (s *userService) GetByUsername(ctx context.Context, username string) (*model.User, *model.Profile, error) {
	u, err := s.repo.GetByUsername(ctx, username)
	if err != nil {
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, nil
	}
	return u, u.Profile, nil
}

// ---------- 注册 ----------

func (s *userService) CreateUser(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
	if s.repo.UsernameExists(ctx, username) {
		return nil, nil, usererrs.ErrUserExists
	}
	if email != "" && s.repo.EmailExists(ctx, email) {
		return nil, nil, usererrs.ErrEmailExists
	}

	if emailCode != "" {
		if !s.verifyEmailCode(ctx, email, emailCode, mode) {
			return nil, nil, usererrs.ErrInvalidEmailCode
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, err
	}

	u := &model.User{
		Username:     username,
		PasswordHash: string(hash),
	}
	var p *model.Profile
	if email != "" {
		p = &model.Profile{Email: &email}
	}
	if avatarURL != "" {
		p = &model.Profile{Photo: avatarURL}
	}
	if err := s.repo.Create(ctx, u, p); err != nil {
		return nil, nil, err
	}
	slog.InfoContext(ctx, "user register", "user_id", u.ID, "username", u.Username)
	return u, p, nil
}

func (s *userService) SendEmailCode(ctx context.Context, email, mode string) bool {
	mode = normalizeMode(mode)
	var ch notification.Channel = &notification.EmailChannel{}
	code := generateCode()

	key := emailCodeKey(email, mode)
	if err := s.redis.Set(ctx, key, code, emailCodeExpire).Err(); err != nil {
		slog.ErrorContext(ctx, "email code redis set failed", "err", err, "email", email, "mode", mode)
	}

	msg := buildVerificationEmail(code, mode)
	return ch.Send(ctx, msg, notification.NotificationContext{Email: email})
}

// buildVerificationEmail 构造注册验证码邮件内容与纯文本 fallback。
//
// mode 决定：
//  1. 邮件标题 + HTML 模板（blog 走编辑式极简，nomu 走 logo + 品牌副标）
//  2. Redis 缓存 key 命名空间（email_code:<email>:<mode>）——
//     同邮箱同时申请 blog 和 nomu 验证码互不覆盖，注册时按 mode 取回。
func buildVerificationEmail(code, mode string) notification.Message {
	title := "kanocifer.chat 注册验证码"
	if mode == modeNomu {
		title = "Nomu 注册验证码"
	}
	plain := fmt.Sprintf("您的验证码：%s\n请在5分钟内使用。", code)
	return notification.Message{
		Title: title,
		Body:  plain,
		HTML:  renderVerificationHTML(code, mode),
	}
}

// ---------- 登录 / 鉴权 ----------

func (s *userService) CheckPassword(u *model.User, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

func (s *userService) Authenticate(ctx context.Context, username, password string) (*model.User, error) {
	u, _, err := s.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, usererrs.ErrInvalidCredentials
	}
	if !s.CheckPassword(u, password) {
		return nil, usererrs.ErrInvalidCredentials
	}
	slog.InfoContext(ctx, "user login", "user_id", u.ID)
	return u, nil
}

// CreateTokens 生成 access + refresh token，refresh 入库 Redis
func (s *userService) CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error) {
	refreshTTL := 7 * 24 * time.Hour
	accessExpiry := time.Now().UTC().Add(24 * time.Hour)
	refreshExpiry := time.Now().UTC().Add(refreshTTL)

	accessToken, err := jwt.GenerateToken(u.ID, accessExpiry)
	if err != nil {
		return nil, err
	}
	refreshToken, err := jwt.GenerateToken(u.ID, refreshExpiry)
	if err != nil {
		return nil, err
	}

	// refresh token 写入 Redis，key = refresh:{userID}
	if s.redis != nil {
		s.redis.Set(ctx, "refresh:"+itoa(int(u.ID)), refreshToken, refreshTTL)
	}

	slog.InfoContext(ctx, "tokens issued", "user_id", u.ID)
	return &dto.TokensResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// RefreshTokens 校验 refresh token 并轮换
func (s *userService) RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error) {
	claims, err := jwt.ParseToken(refreshToken)
	if err != nil {
		return nil, usererrs.ErrInvalidToken
	}
	userID, err := parseUint(claims.Subject)
	if err != nil {
		return nil, usererrs.ErrInvalidToken
	}

	// 校验 Redis 里存的和传入的是否一致（防止重放/盗用）
	if s.redis != nil {
		stored, err := s.redis.Get(ctx, "refresh:"+claims.Subject).Result()
		if err != nil || stored != refreshToken {
			return nil, usererrs.ErrInvalidToken
		}
	}

	return s.CreateTokens(ctx, &model.User{Model: gormModel(userID)})
}

// Logout 登出：从 Redis 删掉 refresh token
func (s *userService) Logout(ctx context.Context, userID uint) {
	if s.redis != nil {
		s.redis.Del(ctx, "refresh:"+itoa(int(userID)))
	}
	slog.InfoContext(ctx, "user logout", "user_id", userID)
}

// ---------- 响应构造 ----------

func (s *userService) IsAdmin(u *model.User) bool {
	return slices.Contains(s.adminUserIDs, int(u.ID))
}

func (s *userService) UserToDict(u *model.User, p *model.Profile) map[string]any {
	d := map[string]any{
		"id":           u.ID,
		"username":     u.Username,
		"name":         u.Name,
		"is_admin":     s.IsAdmin(u),
		"login_count":  u.LoginCount,
		"active":       u.Active,
		"has_passkey":  u.PasskeyCredential != nil,
		"github_bound": u.GithubID != nil,
	}
	if u.GithubID != nil {
		d["github_id"] = *u.GithubID
	}
	if p != nil && p.ID != 0 {
		if p.Email != nil {
			d["email"] = *p.Email
		}
		if p.Gender != nil {
			d["gender"] = *p.Gender
		}
		if p.Mobile != nil {
			d["mobile"] = *p.Mobile
		}
		if p.Photo != "" {
			d["photo"] = p.Photo
		}
	}
	return d
}

// ----- 通用 mode 常量 -----
//
// mode 区分同一后端服务下的不同前端：blog = kanocifer.chat 落地页 SPA，
// nomu = Nomu Chrome 扩展。email code 和 magic login 都按 mode
// 路由：HTML 模板选型 + Redis 缓存 key 命名空间。
//
// 非法 mode 走 blog 兜底（normalizeMode），handler 层 DTO 用 oneof 拦截。
const (
	modeBlog = "blog"
	modeNomu = "nomu"
)

// emailCodeKey 拼出 email 验证码的 redis key；mode 段隔离 blog / nomu，
// 同邮箱同时申两个 mode 的验证码互不覆盖。
func emailCodeKey(email, mode string) string {
	return fmt.Sprintf(emailCodeCacheKey, email, normalizeMode(mode))
}

// normalizeMode 兜底非法 mode 为 blog。email code 和 magic login 共用。
func normalizeMode(mode string) string {
	if mode == modeBlog || mode == modeNomu {
		return mode
	}
	return modeBlog
}

// ----- Email 魔法登录 ----
//
// 邮箱未注册时静默返回 true，由 handler 一律 200 OK 兜底，避免枚举。
//
// mode 决定两件事：
//  1. 邮件里链接的 host + 路径（blog → kanocifer.chat SPA；nomu → 扩展 options.html）；
//  2. Redis 缓存 key 的命名空间（<token>:<mode>）。
//     跨 mode 即便 hex 撞上也不会互相消费——blog token 写到 magiclogintoken:<h>:blog，
//     nomu token 写到 magiclogintoken:<h>:nomu，两个独立 key。
const (
	magicLoginTokenBytes = 32
	magicLoginTokenHex   = magicLoginTokenBytes * 2
	magicLoginTokenTTL   = time.Minute * 10
	magicLoginCacheKey   = "magiclogintoken:%s:%s"
)

// magicLoginLinkPathFor 给出 mode 对应的"路径?token=%s"模板。
// nomu 走 hash 路由（#/login/magic），所以 path 里必须含 "#"。
func magicLoginLinkPathFor(mode string) string {
	if mode == modeNomu {
		return "/options.html#/login/magic?token=%s"
	}
	return "/auth/magic?token=%s"
}

// SendMagicLoginEmail 向已注册邮箱发送一次性登录链接；邮箱不存在时静默返回 true。
//
// mode 决定链接 host + 路径以及 Redis key 命名空间。未知 mode 兜底为 blog 并 warn。
func (s *userService) SendMagicLoginEmail(ctx context.Context, email, mode string) bool {
	// 一次查询同时承担"邮箱是否存在"判断和后续 user 解析，
	// 避免 EmailExists + GetByEmail 之间被并发注册/删除留下不一致窗口。
	u, _, err := s.repo.GetByEmail(ctx, email)
	if err != nil || u == nil {
		return true
	}
	if s.redis == nil {
		slog.WarnContext(ctx, "magic login aborted: redis not configured")
		return false
	}

	normalized := normalizeMode(mode)
	if normalized != mode {
		slog.WarnContext(ctx, "magic login unknown mode, fallback to blog",
			"requested_mode", mode, "effective_mode", normalized)
		mode = normalized
	} else {
		mode = normalized
	}

	hex := generateRandomToken(magicLoginTokenBytes)
	cacheKey := fmt.Sprintf(magicLoginCacheKey, hex, mode)
	if err := s.redis.Set(ctx, cacheKey, email, magicLoginTokenTTL).Err(); err != nil {
		slog.ErrorContext(ctx, "magic login redis set failed", "err", err)
		return false
	}

	// 邮件里给出的 token 包含 mode 段，consume 端据此反查正确的 redis key。
	token := hex + ":" + mode
	link := s.magicLoginLink(token, mode)
	msg := buildMagicLoginEmail(link, mode)
	ok := (&notification.EmailChannel{}).Send(ctx, msg, notification.NotificationContext{Email: email})
	if !ok {
		s.redis.Del(ctx, cacheKey)
		return false
	}
	slog.InfoContext(ctx, "magic login email sent", "email", email, "mode", mode)
	return true
}

// magicLoginLink 拼出邮件里用的完整登录链接。
//
// 缺省回退到纯相对路径（<path>?token=<token>）：对应 mode 的 host 未注入时
// 仍能给出可用的相对链接，便于 dev / 配置漂移时排查。
func (s *userService) magicLoginLink(token, mode string) string {
	rel := fmt.Sprintf(magicLoginLinkPathFor(mode), token)
	host := s.frontendURLs[mode]
	if host == "" {
		return rel
	}
	return host + rel
}

// splitMagicLoginToken 把 "<64-hex>:<mode>" 拆成 (hex, mode)。
// 任何一段不合法都返回 ok=false，调用方应回 ErrInvalidMagicToken。
func splitMagicLoginToken(token string) (hex, mode string, ok bool) {
	idx := strings.LastIndex(token, ":")
	if idx < 0 {
		return "", "", false
	}
	hex, mode = token[:idx], token[idx+1:]
	if len(hex) != magicLoginTokenHex {
		return "", "", false
	}
	if mode != modeBlog && mode != modeNomu {
		return "", "", false
	}
	return hex, mode, true
}

// AuthenticateMagicLogin 用一次性 token 换取登录态；token 校验后立即消费。
//
// token 形态: "<64-hex>:<mode>"，hex 段进 redis key，mode 段决定走哪个命名空间。
func (s *userService) AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error) {
	if s.redis == nil || token == "" {
		return nil, nil, usererrs.ErrInvalidMagicToken
	}
	hex, mode, ok := splitMagicLoginToken(token)
	if !ok {
		return nil, nil, usererrs.ErrInvalidMagicToken
	}
	cacheKey := fmt.Sprintf(magicLoginCacheKey, hex, mode)
	email, err := s.redis.GetDel(ctx, cacheKey).Result()
	if errors.Is(err, redis.Nil) || err != nil || email == "" {
		return nil, nil, usererrs.ErrInvalidMagicToken
	}

	u, p, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, usererrs.ErrUserNotFound
	}
	slog.InfoContext(ctx, "magic login consumed", "user_id", u.ID, "mode", mode)
	return u, p, nil
}

// buildMagicLoginEmail 构造魔法登录邮件内容与纯文本 fallback。
//
// mode 决定标题 + HTML 模板（blog 编辑式极简，nomu logo + 品牌副标）。
func buildMagicLoginEmail(link, mode string) notification.Message {
	title := "kanocifer.chat 登录链接"
	if mode == modeNomu {
		title = "Nomu 登录链接"
	}
	plain := fmt.Sprintf("点击下方链接登录（10 分钟内有效）：\n%s\n若非本人操作，请忽略此邮件。", link)
	return notification.Message{
		Title: title,
		Body:  plain,
		HTML:  renderMagicLoginHTML(link, mode),
	}
}

// renderMagicLoginHTML 渲染魔法登录邮件 HTML。
//
// 两种 mode 共用同一调性（克制编辑式），但通过品牌头部差异化：
//   - blog：纯文字 wordmark，无 logo，编辑式极简；
//   - nomu：logo + "Nomu" 副标，CTA 文案改成"完成 Nomu 登录"，
//     页脚多一行"由 kanocifer.chat 代 Nomu 发送"。
//
// 末尾明文链接 fallback 保留，兼容屏蔽按钮/图片的客户端。
func renderMagicLoginHTML(link, mode string) string {
	if mode == modeNomu {
		return renderMagicLoginHTMLNomu(link)
	}
	return renderMagicLoginHTMLBlog(link)
}

func renderMagicLoginHTMLBlog(link string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>kanocifer.chat 登录链接</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
<tr><td style="padding:0 0 24px;text-align:left;">
  <span style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:#1a1a1a;">kanocifer.chat</span>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececec;border-radius:14px;padding:36px 32px;">
  <p style="margin:0 0 6px;font-size:13px;color:#888888;letter-spacing:0.2px;">魔法登录</p>
  <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;line-height:1.4;color:#1a1a1a;letter-spacing:-0.2px;">点击下方按钮登录</h1>
  <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#6b6b6b;">无需输入密码，单击按钮即可登录您的账号。</p>
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:4px 0 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="background:#1a1a1a;border-radius:10px;">
      <a href="%[1]s" target="_blank" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:600;letter-spacing:0.2px;color:#ffffff;text-decoration:none;">登录 kanocifer.chat</a>
    </td></tr>
    </table>
  </td></tr>
  </table>
  <p style="margin:28px 0 8px;font-size:13px;color:#888888;">按钮无法使用？复制以下链接到浏览器打开：</p>
  <p style="margin:0;padding:12px 14px;background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;font-size:12px;line-height:1.6;word-break:break-all;color:#555555;font-family:'SF Mono','JetBrains Mono',Consolas,Menlo,monospace;">%[1]s</p>
  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#999999;">链接 10 分钟内有效，仅可使用一次。若非本人操作，请忽略此邮件。</p>
</td></tr>
<tr><td style="padding:20px 4px 0;text-align:left;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">kanocifer.chat · 魔法登录</p>
</td></tr>
</table>
</body>
</html>`, htmlEscape(link))
}

func renderMagicLoginHTMLNomu(link string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nomu 登录链接</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
<tr><td style="padding:0 0 28px;text-align:center;">
  <img src="%[1]s" alt="Nomu" width="64" height="64" style="display:inline-block;width:64px;height:64px;border:0;outline:none;text-decoration:none;" />
  <p style="margin:14px 0 0;font-size:13px;font-weight:600;letter-spacing:0.4px;color:#1a1a1a;">Nomu</p>
  <p style="margin:4px 0 0;font-size:12px;color:#888888;letter-spacing:0.2px;">Chrome 扩展 · 一键登录</p>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececec;border-radius:14px;padding:32px 28px;">
  <h1 style="margin:0 0 6px;font-size:20px;font-weight:600;line-height:1.3;color:#1a1a1a;letter-spacing:-0.2px;">点击下方按钮完成登录</h1>
  <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#6b6b6b;">点击后会自动打开 Nomu 并完成登录。</p>
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:4px 0 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="background:#1a1a1a;border-radius:10px;">
      <a href="%[2]s" target="_blank" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:600;letter-spacing:0.2px;color:#ffffff;text-decoration:none;">完成 Nomu 登录</a>
    </td></tr>
    </table>
  </td></tr>
  </table>
  <p style="margin:28px 0 8px;font-size:13px;color:#888888;">按钮无法使用？复制以下链接到浏览器打开：</p>
  <p style="margin:0;padding:12px 14px;background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;font-size:12px;line-height:1.6;word-break:break-all;color:#555555;font-family:'SF Mono','JetBrains Mono',Consolas,Menlo,monospace;">%[2]s</p>
  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#999999;">链接 10 分钟内有效，仅可使用一次。若非本人操作，请忽略此邮件。</p>
</td></tr>
<tr><td style="padding:20px 4px 0;text-align:center;">
  <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#aaaaaa;">这封邮件由 <span style="color:#888888;">kanocifer.chat</span> 代 Nomu 发送</p>
  <p style="margin:0;font-size:12px;line-height:1.6;color:#cccccc;">Nomu · 魔法登录</p>
</td></tr>
</table>
</body>
</html>`, nomuLogoURL, htmlEscape(link))
}

// ---------- 辅助 ----------

func generateCode() string {
	return itoa(rand.Intn(999999))
}

// renderVerificationHTML 渲染注册验证码邮件 HTML。
//
// 两种 mode 共用同一调性（克制编辑式），但通过品牌头部差异化：
//   - blog：纯文字 wordmark，无 logo，编辑式极简；
//   - nomu：logo + "Nomu · 邮箱验证" 副标，验证码说明改成
//     "用于完成 Nomu 账号注册"，页脚多一行"由 kanocifer.chat 代发"。
//
// 验证码本身仍用 36px monospace + 8px letter-spacing，跨 mode 一致。
func renderVerificationHTML(code, mode string) string {
	if mode == modeNomu {
		return renderVerificationHTMLNomu(code)
	}
	return renderVerificationHTMLBlog(code)
}

func renderVerificationHTMLBlog(code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>kanocifer.chat 注册验证码</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
<tr><td style="padding:0 0 24px;text-align:left;">
  <span style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:#1a1a1a;">kanocifer.chat</span>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececec;border-radius:14px;padding:36px 32px;">
  <p style="margin:0 0 6px;font-size:13px;color:#888888;letter-spacing:0.2px;">注册验证码</p>
  <h1 style="margin:0 0 28px;font-size:18px;font-weight:600;line-height:1.4;color:#1a1a1a;letter-spacing:-0.2px;">这是您的验证码</h1>
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;">
  <tr><td style="padding:24px 16px;text-align:center;">
    <span style="font-family:'SF Mono','JetBrains Mono',Consolas,Menlo,monospace;font-size:36px;font-weight:600;letter-spacing:8px;color:#1a1a1a;">%s</span>
  </td></tr>
  </table>
  <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6b6b6b;">请在 5 分钟内使用。验证码仅用于本次注册，不会以任何形式再次索取。</p>
  <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#999999;">若非本人操作，请忽略此邮件。</p>
</td></tr>
<tr><td style="padding:20px 4px 0;text-align:left;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#aaaaaa;">kanocifer.chat · 注册验证码</p>
</td></tr>
</table>
</body>
</html>`, htmlEscape(code))
}

func renderVerificationHTMLNomu(code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nomu 注册验证码</title>
</head>
<body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
<tr><td style="padding:0 0 28px;text-align:center;">
  <img src="%s" alt="Nomu" width="64" height="64" style="display:inline-block;width:64px;height:64px;border:0;outline:none;text-decoration:none;" />
  <p style="margin:14px 0 0;font-size:13px;font-weight:600;letter-spacing:0.4px;color:#1a1a1a;">Nomu</p>
  <p style="margin:4px 0 0;font-size:12px;color:#888888;letter-spacing:0.2px;">Chrome 扩展 · 邮箱验证</p>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #ececec;border-radius:14px;padding:32px 28px;">
  <h1 style="margin:0 0 6px;font-size:20px;font-weight:600;line-height:1.3;color:#1a1a1a;letter-spacing:-0.2px;">这是您的验证码</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b6b6b;">用于完成 Nomu 账号注册，请妥善保管。</p>
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;">
  <tr><td style="padding:24px 16px;text-align:center;">
    <span style="font-family:'SF Mono','JetBrains Mono',Consolas,Menlo,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a;">%s</span>
  </td></tr>
  </table>
  <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6b6b6b;">请在 5 分钟内使用。验证码仅用于本次注册，不会以任何形式再次索取。</p>
  <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#999999;">若非本人操作，请忽略此邮件。</p>
</td></tr>
<tr><td style="padding:20px 4px 0;text-align:center;">
  <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#aaaaaa;">这封邮件由 <span style="color:#888888;">kanocifer.chat</span> 代 Nomu 发送</p>
  <p style="margin:0;font-size:12px;line-height:1.6;color:#cccccc;">Nomu · 注册验证码</p>
</td></tr>
</table>
</body>
</html>`, nomuLogoURL, htmlEscape(code))
}

// htmlEscape 转义 HTML 特殊字符，防止验证码中含 < > & 等破坏模板。
func htmlEscape(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch r {
		case '<':
			b.WriteString("&lt;")
		case '>':
			b.WriteString("&gt;")
		case '&':
			b.WriteString("&amp;")
		case '"':
			b.WriteString("&quot;")
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

func parseUint(s string) (uint, error) {
	n, err := strconv.ParseUint(s, 10, 64)
	return uint(n), err
}

// gormModel 快速构造仅带 ID 的 model.User
func gormModel(id uint) gorm.Model {
	return gorm.Model{ID: id}
}

func generateRandomToken(n int) string {
	raw := make([]byte, n)
	if _, err := crand.Read(raw); err != nil {
		return ""
	}
	return hex.EncodeToString(raw)
}

func (s *userService) verifyEmailCode(ctx context.Context, email, code, mode string) bool {
	if s.redis == nil || email == "" {
		return false
	}
	key := emailCodeKey(email, mode)
	stored, err := s.redis.Get(ctx, key).Result()
	if err != nil || stored != code {
		return false
	}
	s.redis.Del(ctx, key)
	return true
}
