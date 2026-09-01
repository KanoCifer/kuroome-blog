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

	"github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

const (
	emailCodeExpire = time.Minute * 5
	emailCodePrefix = "email_code:"
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
	CreateUser(ctx context.Context, username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error)
	SendEmailCode(ctx context.Context, email string) bool
	SendMagicLoginEmail(ctx context.Context, email string) bool
	Authenticate(ctx context.Context, username, password string) (*model.User, error)
	AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error)
	CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error)
	RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error)
	Logout(ctx context.Context, userID uint)
	UserToDict(u *model.User, p *model.Profile) map[string]any
}

// userService 持有 repo 和 redis，负责编排业务逻辑。
//
// adminUserIDs 由调用方从 config 注入，避免本包直接读取全局 config.Cfg。
type userService struct {
	repo         UserRepositoryer
	redis        *redis.Client
	adminUserIDs []int
}

func NewUserService(repo UserRepositoryer, redis *redis.Client, adminUserIDs []int) *userService {
	return &userService{repo: repo, redis: redis, adminUserIDs: adminUserIDs}
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

func (s *userService) CreateUser(ctx context.Context, username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error) {
	if s.repo.UsernameExists(ctx, username) {
		return nil, nil, usererrs.ErrUserExists
	}
	if email != "" && s.repo.EmailExists(ctx, email) {
		return nil, nil, usererrs.ErrEmailExists
	}

	if emailCode != "" {
		if !s.verifyEmailCode(ctx, email, emailCode) {
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

func (s *userService) SendEmailCode(ctx context.Context, email string) bool {
	var ch notification.Channel = &notification.EmailChannel{}
	code := generateCode()

	key := emailCodePrefix + email
	s.redis.Set(ctx, key, code, emailCodeExpire)

	msg := buildVerificationEmail(code)
	return ch.Send(ctx, msg, notification.NotificationContext{Email: email})
}

// buildVerificationEmail 构造注册验证码邮件内容与纯文本 fallback。
func buildVerificationEmail(code string) notification.Message {
	plain := fmt.Sprintf("您的验证码：%s\n请在5分钟内使用。", code)
	return notification.Message{
		Title: "kanocifer.chat 注册验证码",
		Body:  plain,
		HTML:  renderVerificationHTML(code),
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

// ----- Email 魔法登录 ----
//
// 邮箱未注册时静默返回 true，由 handler 一律 200 OK 兜底，避免枚举。
const (
	magicLoginTokenBytes = 32
	magicLoginTokenHex   = magicLoginTokenBytes * 2
	magicLoginTokenTTL   = time.Minute * 10
	magicLoginCacheKey   = "magiclogintoken:%s"
	magicLoginLinkPath   = "/v3/magic-login?token=%s"
)

// SendMagicLoginEmail 向已注册邮箱发送一次性登录链接；邮箱不存在时静默返回 true。
func (s *userService) SendMagicLoginEmail(ctx context.Context, email string) bool {
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

	token := generateRandomToken(magicLoginTokenBytes)
	cacheKey := fmt.Sprintf(magicLoginCacheKey, token)
	if err := s.redis.Set(ctx, cacheKey, email, magicLoginTokenTTL).Err(); err != nil {
		slog.ErrorContext(ctx, "magic login redis set failed", "err", err)
		return false
	}

	link := fmt.Sprintf(magicLoginLinkPath, token)
	msg := buildMagicLoginEmail(link)
	ok := (&notification.EmailChannel{}).Send(ctx, msg, notification.NotificationContext{Email: email})
	if !ok {
		s.redis.Del(ctx, cacheKey)
		return false
	}
	slog.InfoContext(ctx, "magic login email sent", "email", email)
	return true
}

// AuthenticateMagicLogin 用一次性 token 换取登录态；token 校验后立即消费。
func (s *userService) AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error) {
	if s.redis == nil || token == "" {
		return nil, nil, usererrs.ErrInvalidMagicToken
	}
	// 仅放行 64 位 hex，避免恶意 token 污染 Redis key。
	if len(token) != magicLoginTokenHex {
		return nil, nil, usererrs.ErrInvalidMagicToken
	}
	cacheKey := fmt.Sprintf(magicLoginCacheKey, token)
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
	slog.InfoContext(ctx, "magic login consumed", "user_id", u.ID)
	return u, p, nil
}

// buildMagicLoginEmail 构造魔法登录邮件内容与纯文本 fallback。
func buildMagicLoginEmail(link string) notification.Message {
	plain := fmt.Sprintf("点击下方链接登录（10 分钟内有效）：\n%s\n若非本人操作，请忽略此邮件。", link)
	return notification.Message{
		Title: "kanocifer.chat 登录链接",
		Body:  plain,
		HTML:  renderMagicLoginHTML(link),
	}
}

// renderMagicLoginHTML 渲染魔法登录邮件 HTML —— 与验证码同调性：
// 深色大字号 CTA 按钮 + 末尾明文链接 fallback，兼容屏蔽按钮的客户端。
func renderMagicLoginHTML(link string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="padding:32px 24px 24px;">
<p style="margin:0 0 16px;font-size:14px;color:#333333;">点击下方按钮登录您的账号：</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#1a1a1a;border-radius:6px;">
<a href="%s" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:1px;">登录 kanocifer.chat</a>
</td></tr></table>
<p style="margin:0 0 8px;font-size:13px;color:#888888;">按钮无法使用？复制以下链接到浏览器打开：</p>
<p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#555555;font-family:'SF Mono',Consolas,monospace;">%s</p>
<p style="margin:16px 0 0;font-size:13px;color:#888888;">链接 10 分钟内有效。若非本人操作，请忽略此邮件。</p>
</td></tr>
</table>
</body>
</html>`, htmlEscape(link), htmlEscape(link))
}

// ---------- 辅助 ----------

func generateCode() string {
	return itoa(rand.Intn(999999))
}

// renderVerificationEmail 渲染验证码邮件 HTML —— 克制样式，与 design-system
// "适" 调性对齐：深色大字号 + 等宽字体突出验证码，不用花哨色彩。
func renderVerificationHTML(code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="padding:32px 24px 16px;">
<p style="margin:0 0 16px;font-size:14px;color:#333333;">这是您的验证码：</p>
<p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:4px;color:#1a1a1a;font-family:'SF Mono',Consolas,monospace;">%s</p>
<p style="margin:0;font-size:13px;color:#888888;">请在5分钟内使用。若非本人操作，请忽略此邮件。</p>
</td></tr>
</table>
</body>
</html>`, htmlEscape(code))
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

// verifyEmailCode 校验 Redis 中的注册验证码（signup_code:{email}）。
func (s *userService) verifyEmailCode(ctx context.Context, email, code string) bool {
	if s.redis == nil || email == "" {
		return false
	}
	key := "signup_code:" + email
	stored, err := s.redis.Get(ctx, key).Result()
	if err != nil || stored != code {
		return false
	}
	s.redis.Del(ctx, key)
	return true
}
