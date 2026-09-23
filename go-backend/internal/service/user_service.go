package service

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"log/slog"
	"math/big"
	"slices"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/emailtemplates"
)

const (
	emailCodeExpire = time.Minute * 5
	// 命名空间 by mode，跨 mode 互不串
	emailCodeCacheKeyFmt           = "email_code:%s:%s"
	emailResetCacheKeyFmt          = "email_reset:%s:%s"
	emailResetChallengeCacheKeyFmt = "email_reset_challenge:%s:%s"

	// 登录验证码专用 redis 命名空间（与注册 / 重置不互通，避免发错邮件却能
	// 拿同一码登录）。key 段：
	//   email_login_code:<email>:nomu             6 位验证码，TTL 5min
	//   email_login_attempts:<email>:nomu         单码失败计数，TTL 与 code 同步
	//   email_login_send_cooldown:<email>:nomu    发码冷却 60s（防邮件轰炸）
	emailLoginCodeKeyFmt        = "email_login_code:%s:%s"
	emailLoginAttemptsKeyFmt    = "email_login_attempts:%s:%s"
	emailLoginCooldownKeyFmt    = "email_login_send_cooldown:%s:%s"
	emailLoginCooldown          = time.Second * 60
	emailLoginMaxAttempts       = 5
	emailLoginCodeLength        = 6

	// bcryptCost 密码 hash cost。12 = 2^12 key schedule rounds，
	// 2026 年推荐值（bcrypt.DefaultCost=10 已偏弱）。
	// 升级只需改这个数字；旧 hash 仍可校验（cost 写在 hash 字符串里）。
	bcryptCost = 12
)

// mode 常量：区分同一后端服务下的不同前端
//
//	blog = kanocifer.chat 落地页 SPA
//	nomu = Nomu Chrome 扩展
//
// 非法 mode 走 blog 兜底（normalizeMode），handler 层 DTO 用 oneof 拦截。
const (
	modeBlog = "blog"
	modeNomu = "nomu"
)

// UserRepositoryer 抽象出 user_service 对持久层的依赖，便于 mock。
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

// Userer 是 handler 层注入面。方法实现散落在 auth_service.go /
// magic_login_service.go / user_service.go（CRUD+Register+Response）。

// registerBonuser 是 UserService.RegisterFlow 依赖的注册赠送积分能力
// （*CreditService 满足）。本地窄接口，避免 user_service ← service 的包方向反转。
type registerBonuser interface {
	GrantRegisterBonus(ctx context.Context, userID uint, meta map[string]any) (*model.CreditTransaction, error)
}

type UserService struct {
	repo         UserRepositoryer
	redis        *redis.Client
	adminUserIDs []int
	frontendURLs map[string]string
	maxDevices   int
	// bonusSvc RegisterFlow 调的注册赠送积分（可选，nil 时跳过赠送，测试/未装配兜底）。
	bonusSvc registerBonuser
	// mailer 邮件发送器（SendEmailCode / SendMagicLoginEmail 都走它）。
	// nil 时静默跳过发送，行为对齐"mailer 未装配 / SMTP 未配置"。
	mailer *emailtemplates.Mailer
}

func NewUserService(
	repo UserRepositoryer,
	redis *redis.Client,
	adminUserIDs []int,
	frontendURLs map[string]string,
	maxDevices int,
	bonusSvc registerBonuser,
	mailer *emailtemplates.Mailer,
) *UserService {
	trimmed := make(map[string]string, len(frontendURLs))
	for k, v := range frontendURLs {
		trimmed[k] = strings.TrimRight(v, "/")
	}
	return &UserService{
		repo:         repo,
		redis:        redis,
		adminUserIDs: adminUserIDs,
		frontendURLs: trimmed,
		maxDevices:   maxDevices,
		bonusSvc:     bonusSvc,
		mailer:       mailer,
	}
}

// ---------- 查询 ----------

func (s *UserService) GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, usererrs.ErrUserNotFound
	}
	return u, u.Profile, nil
}

func (s *UserService) GetByUsername(ctx context.Context, username string) (*model.User, *model.Profile, error) {
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

func (s *UserService) CreateUser(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
	if s.repo.UsernameExists(ctx, username) {
		return nil, nil, usererrs.ErrUserExists
	}
	if email != "" && s.repo.EmailExists(ctx, email) {
		return nil, nil, usererrs.ErrEmailExists
	}

	if emailCode != "" {
		if !s.verifyEmailCode(ctx, email, emailCode, mode, false) {
			return nil, nil, usererrs.ErrInvalidEmailCode
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
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

// RegisterFlow 是 register handler 的编排入口：建账号 + （可选）注册赠送积分。
//
// 仅密码注册 handler 这一条路径触发；GitHub 自动建号 / magic-login 不走。赠送
// 失败仅记日志、不阻断 200——积分是增值服务，注册必须落。
// GrantRegisterBonus 内部 bizID 由 userID 推导、命中唯一键、幂等不双发。
func (s *UserService) RegisterFlow(
	ctx context.Context,
	username, password, email, emailCode, mode string,
) (*model.User, *model.Profile, error) {
	u, p, err := s.CreateUser(ctx, username, password, email, emailCode, "", mode)
	if err != nil {
		return nil, nil, err
	}
	if s.bonusSvc != nil {
		if _, gerr := s.bonusSvc.GrantRegisterBonus(ctx, u.ID, nil); gerr != nil {
			slog.ErrorContext(ctx, "register bonus grant failed",
				"user_id", u.ID, "error", gerr)
		}
	}
	return u, p, nil
}


// ResetPasswordFlow 给指定邮箱发密码重置邮件，并把一次性 challenge 写到
// redis 独立命名空间（不与 email code 共用 key），把 challenge return 给
// handler，由 handler 回给浏览器。浏览器要在 confirm 请求里把 challenge
// 原样回传，作为"我刚刚申请过重置"的不可伪造证明。
//
// challenge 不进邮件（邮件只有 6 位 code），因为：
//   - 攻击者拿到邮件就能拿到 challenge，等于没设防；
//   - 真正的防御点是：只有真正请求 reset 的浏览器才持有 challenge。
//
// mode=blog/nomu 决定走博客版还是 Nomu 版邮件模板（无 mode 校验步骤；
// 邮箱不存在也照常返 200 防枚举，但邮件不会送达）。
func (s *UserService) ResetPasswordFlow(ctx context.Context, email, mode string) (challenge string, err error) {
	if email == "" {
		return "", usererrs.ErrEmailRequired
	}
	mode = normalizeMode(mode)

	b := make([]byte, 4) // 32 bit = 8 hex chars
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	challenge = hex.EncodeToString(b)

	// 独立 redis key，与 email code 互不干扰；TTL 同 emailCodeExpire。
	chKey := fmt.Sprintf(emailResetChallengeCacheKeyFmt, email, mode)
	if err := s.redis.Set(ctx, chKey, challenge, emailCodeExpire).Err(); err != nil {
		slog.ErrorContext(ctx, "reset challenge redis set failed",
			"err", err, "email", email, "mode", mode)
	}

	emailCtx , cancel := context.WithTimeout(ctx, time.Second*30)
	defer cancel()
	go s.sendPasswordReset(emailCtx, email, mode)
	return challenge, nil
}

// ConfirmPasswordReset 用邮箱验证码 + 新密码完成密码重置。
//
// 校验顺序：邮箱必填 → 用户存在 → 新密码不能复用旧值 → email code 正确
//
//	→ challenge 正确 → bcrypt 重哈希 → 写回 User.PasswordHash。
//
// 任一步骤失败回退并返回错误。challenge 与 email code 都在"对应校验成功
// 之后、写库之前"一次性消费：业务拒绝（同旧密码 / 验证码错）时不会误删，
// 用户改正输入再提交还能复用。
func (s *UserService) ConfirmPasswordReset(ctx context.Context, email, code, newPassword, mode, challenge string) (err error) {
	if email == "" {
		return usererrs.ErrEmailRequired
	}
	if challenge == "" {
		return usererrs.ErrInvalidToken
	}
	mode = normalizeMode(mode)

	u, _, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		slog.ErrorContext(ctx, "password reset get-by-email failed",
			"err", err, "email", email)
		return err
	}
	// 不暴露邮箱是否注册：未注册走 ErrInvalidEmailCode（400 + "验证码无效"），
	// 与错码错误同响应码 + 同文案，攻击者无法靠 HTTP code 区分。
	if u == nil {
		return usererrs.ErrInvalidEmailCode
	}

	// 同旧密码的拒绝路径必须早于 challenge 消费，否则用户改正密码再提交
	// 时 challenge 已被 Del，会被误判 ErrInvalidToken。
	if s.CheckPassword(u, newPassword) {
		return usererrs.ErrPasswordHashExists
	}

	if !s.verifyEmailCode(ctx, email, code, mode, true) {
		return usererrs.ErrInvalidEmailCode
	}

	if !challengeMatches(ctx, s.redis, email, mode, challenge) {
		return usererrs.ErrInvalidToken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hash)

	if err := s.repo.Update(ctx, u); err != nil {
		slog.ErrorContext(ctx, "password reset update failed", "err", err, "user_id", u.ID)
		return err
	}
	return nil
}

func (s *UserService) SendEmailCode(ctx context.Context, email, mode string) bool {
	mode = normalizeMode(mode)
	if s.mailer == nil {
		return false
	}
	code := generateCode()

	key := emailCodeKey(email, mode, false)
	if err := s.redis.Set(ctx, key, code, emailCodeExpire).Err(); err != nil {
		slog.ErrorContext(ctx, "email code redis set failed", "err", err, "email", email, "mode", mode)
	}

	return s.mailer.SendVerificationCode(ctx, email, mode, code)
}

// ---------- 邮箱验证码登录（Nomu 专用） ----------

// emailLoginKey / attemptsKey / cooldownKey 是登录验证码三段 redis key 的拼装。
//
// 段组成：email + 强制 mode=nomu（登录码场景不接 blog，避免与注册 / 重置混用）。
// 即便调用方漏传 mode，这里也强制 nomu，使不同 mode 互不串。
func emailLoginKey(email string) string {
	return fmt.Sprintf(emailLoginCodeKeyFmt, email, modeNomu)
}
func emailLoginAttemptsKey(email string) string {
	return fmt.Sprintf(emailLoginAttemptsKeyFmt, email, modeNomu)
}
func emailLoginCooldownKey(email string) string {
	return fmt.Sprintf(emailLoginCooldownKeyFmt, email, modeNomu)
}

// loginCodeVerifyScript 原子核验登录码：传入 code → 检查 → 命中则 DEL code+attempts
// 返回 1；未命中则 INCR attempts，达到上限则 DEL code+attempts 返回 -1；其他返 0。
//
// 三件事必须在同一 Redis 调用里完成：
//   - 拿到 code 的当前值；
//   - 错误输入时 INCR 错误计数；
//   - 错误达上限时清空 code（防止继续猜），或正确时清空 code（一次性消费）。
//
// ponytail: 用 Lua 而非 GET+DEL+INCR，理由是并发请求下 GET+DEL+INCR 之间存在
// 竞态（两个并发都拿到正确码 → 都 DEL → 都返回成功；或两个并发错误计数都
// 没到上限 → 绕过阈值）。升级路径：无 —— 真要拆就改用 HASH 字段（attempts 作
// field、code 作 value），脚本继续单 key 即可。
var loginCodeVerifyScript = redis.NewScript(`
local stored = redis.call('GET', KEYS[1])
if stored == false then
  return 0
end
if stored == ARGV[1] then
  redis.call('DEL', KEYS[1])
  redis.call('DEL', KEYS[2])
  return 1
end
local attempts = redis.call('INCR', KEYS[2])
if attempts >= tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[1])
  redis.call('DEL', KEYS[2])
  return -1
end
return 0
`)

// SendLoginEmailCode 申请 Nomu 邮箱验证码登录：
//   - 仅对已注册账户真正写 redis + 发邮件（未知邮箱静默吞掉，防枚举）；
//   - 60s 内同邮箱重复申请不发新码（per-email cooldown），跨 IP 仍生效；
//   - 邮件发送失败时清理已写入的 code / cooldown key，不留可登录凭证。
//
// 返回 true 表示「已成功发出或该邮箱无需发邮件」；false 表示「redis / mailer
// 不可用或发送失败」。handler 不关心细节，统一对外回成功响应防枚举。
func (s *UserService) SendLoginEmailCode(ctx context.Context, email string) bool {
	if s.redis == nil || s.mailer == nil {
		return false
	}

	u, _, err := s.repo.GetByEmail(ctx, email)
	if err != nil || u == nil {
		// 未知邮箱静默成功；仓库故障同样静默以防侧信道。
		slog.InfoContext(ctx, "login email code: email not registered, silent skip",
			"mode", modeNomu)
		return true
	}

	// 60s 冷却：避免跨 IP 邮件轰炸。SETNX 不覆盖仍在倒计的窗口。
	ok, err := s.redis.SetNX(ctx, emailLoginCooldownKey(email), "1", emailLoginCooldown).Result()
	if err != nil {
		slog.ErrorContext(ctx, "login email code cooldown set failed",
			"err", err)
		return false
	}
	if !ok {
		// 冷却中：仍按"已发"对待，对客户端统一响应。code 不覆盖旧值。
		slog.InfoContext(ctx, "login email code send skipped by cooldown",
			"mode", modeNomu)
		return true
	}

	code := generateCode()
	codeKey := emailLoginKey(email)
	if err := s.redis.Set(ctx, codeKey, code, emailCodeExpire).Err(); err != nil {
		// redis 写失败：清掉 cooldown 放行重试，避免 cooldown 卡死。
		s.redis.Del(ctx, emailLoginCooldownKey(email))
		slog.ErrorContext(ctx, "login email code redis set failed",
			"err", err)
		return false
	}

	if !s.mailer.SendEmailCodeLogin(ctx, email, code) {
		// 发送失败：清理已落 redis 的 code + cooldown，让调用方下一次重试有机会成功。
		s.redis.Del(ctx, codeKey, emailLoginCooldownKey(email))
		slog.ErrorContext(ctx, "login email code mail send failed",
			"err", "mailer returned false")
		return false
	}

	slog.InfoContext(ctx, "login email code sent", "user_id", u.ID)
	return true
}

// AuthenticateEmailCode 用邮箱 + 6 位验证码登录 Nomu。
//
// 流程：
//   1. redis 为 nil → fail closed（ErrInvalidEmailCode，避免缺 redis 时跳过验证）；
//   2. 仓库按邮箱查 user，未注册 → ErrInvalidEmailCode（与错码同响应，隐藏存在性）；
//   3. Lua 脚本原子核验 + 错误计数 + 消费；返回 0/-1/1，分别对应：
//      0 = 验证码错但未到上限；-1 = 验证码错且达到 5 次上限（code 被清）；
//      1 = 验证码正确（code 被一次性消费）；
//   4. 成功 → 返回 user/profile，由 handler 走 CreateTokens 流程。
//
// 错误码与未知账户同响应：service 透传 ErrInvalidEmailCode，handler → 400。
func (s *UserService) AuthenticateEmailCode(
	ctx context.Context,
	email, code string,
) (*model.User, *model.Profile, error) {
	if s.redis == nil || email == "" || code == "" {
		return nil, nil, usererrs.ErrInvalidEmailCode
	}
	if len(code) != emailLoginCodeLength {
		return nil, nil, usererrs.ErrInvalidEmailCode
	}

	u, p, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		slog.ErrorContext(ctx, "auth email code get-by-email failed",
			"err", err, "mode", modeNomu)
		// 仓库故障 → 返回内部错误而不是 ErrInvalidEmailCode，
		// 避免把 DB 故障误表为验证码错（隐藏账户存在性不能盖过排障线索）。
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, usererrs.ErrInvalidEmailCode
	}

	res, err := loginCodeVerifyScript.Run(ctx, s.redis,
		[]string{emailLoginKey(email), emailLoginAttemptsKey(email)},
		code, emailLoginMaxAttempts,
	).Int()
	if err != nil {
		slog.ErrorContext(ctx, "auth email code redis script failed",
			"err", err, "mode", modeNomu)
		return nil, nil, err
	}
	if res != 1 {
		return nil, nil, usererrs.ErrInvalidEmailCode
	}

	// 命中：清掉 cooldown，让用户能立即重发（避免上次的 60s 限制误伤正常用户）。
	s.redis.Del(ctx, emailLoginCooldownKey(email))
	slog.InfoContext(ctx, "email code login consumed", "user_id", u.ID)
	return u, p, nil
}

func (s *UserService) sendPasswordReset(ctx context.Context, email, mode string) bool {
	mode = normalizeMode(mode)
	if s.mailer == nil {
		return false
	}
	code := generateCode()

	key := emailCodeKey(email, mode, true)
	if err := s.redis.Set(ctx, key, code, emailCodeExpire).Err(); err != nil {
		slog.ErrorContext(ctx, "email reset redis set failed", "err", err, "email", email, "mode", mode)
	}

	return s.mailer.SendPasswordResetCode(ctx, email, mode, code)
}

// ---------- 响应构造 ----------

func (s *UserService) IsAdmin(u *model.User) bool {
	return slices.Contains(s.adminUserIDs, int(u.ID))
}

func (s *UserService) UserToDict(u *model.User, p *model.Profile) map[string]any {
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

// normalizeMode 兜底非法 mode 为 blog。email code 和 magic login 共用。
func normalizeMode(mode string) string {
	if mode == modeBlog || mode == modeNomu {
		return mode
	}
	return modeBlog
}

// emailCodeKey 拼出 email 验证码的 redis key；mode 段隔离 blog / nomu，
// 同邮箱同时申两个 mode 的验证码互不覆盖。
func emailCodeKey(email, mode string, isReset bool) string {
	if isReset {
		return fmt.Sprintf(emailResetCacheKeyFmt, email, normalizeMode(mode))
	}
	return fmt.Sprintf(emailCodeCacheKeyFmt, email, normalizeMode(mode))
}

func (s *UserService) verifyEmailCode(ctx context.Context, email, code, mode string, isReset bool) bool {
	if s.redis == nil || email == "" {
		return false
	}
	stored, err := s.redis.Get(ctx, emailCodeKey(email, mode, isReset)).Result()
	if err != nil || stored != code {
		return false
	}
	// 一次性消费：del 必须与 get 用同一 namespace（按 isReset 区分），
	// 否则重置验证码被消费时会把注册 key 误删，反之亦然。
	s.redis.Del(ctx, emailCodeKey(email, mode, isReset))
	return true
}

// challengeMatches 比对 challenge，并在匹配时一次性消费（删除）。
//
// 返回 true 当且仅当 redis 里存的 challenge 等于传入 challenge：
//   - 不存在 / redis 未配置 / 任何错误：视为不匹配；
//   - 匹配：del key 后 return true；不匹配：不动 key（让攻击者重试多次
//     也无法偷出真值，同常量时间字符串比较同样保护 timing）。
//
// challenge 与 email code 用不同 redis key，二者平行消费 —— 任意一个失败
// 都不影响另一个继续有效，避免一个失败把另一个误删。
func challengeMatches(ctx context.Context, rdb *redis.Client, email, mode, challenge string) bool {
	if rdb == nil || email == "" || challenge == "" {
		return false
	}
	key := fmt.Sprintf(emailResetChallengeCacheKeyFmt, email, normalizeMode(mode))
	stored, err := rdb.Get(ctx, key).Result()
	if err != nil || subtle.ConstantTimeCompare([]byte(stored), []byte(challenge)) != 1 {
		return false
	}
	rdb.Del(ctx, key)
	return true
}

// generateCode 用 crypto/rand 取 [0, 1_000_000) 的 6 位数字验证码。
// zero-pad 前导 0（如 "000042"），避免与"5 位纯数字"撞型猜测。
func generateCode() string {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		// 极少；crypto/rand 失败时降级 6 位 "000000"，让调用方走发邮件路径，
		// 用户体验上等同"发送失败"而不是注册崩。这条分支不走敏感路径。
		return "000000"
	}
	return fmt.Sprintf("%06d", n.Int64())
}

// gormModel 快速构造仅带 ID 的 model.User。包内测试大量复用。
func gormModel(id uint) gorm.Model {
	return gorm.Model{ID: id}
}
