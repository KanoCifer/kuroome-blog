// Package user 聚合用户账户、认证会话和外部身份登录能力。
package user

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"fmt"
	"log/slog"
	"math/big"
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
	emailLoginCodeKeyFmt     = "email_login_code:%s:%s"
	emailLoginAttemptsKeyFmt = "email_login_attempts:%s:%s"
	emailLoginCooldownKeyFmt = "email_login_send_cooldown:%s:%s"
	emailLoginCooldown       = time.Second * 60
	emailLoginMaxAttempts    = 5
	emailLoginCodeLength     = 6

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

// AuthUserServiceer 是认证模块依赖的窄用户能力。
// 定义在 service 包内，避免 UserService 与 AuthService 互相持有对方。
type AuthUserServiceer interface {
	GetByUsername(ctx context.Context, username string) (*model.User, *model.Profile, error)
	GetByEmail(ctx context.Context, email string) (*model.User, *model.Profile, error)
	UpdatePasswordHash(ctx context.Context, userID uint, passwordHash string) error
}

type UserService struct {
	repo UserRepositoryer
	// bonusSvc RegisterFlow 调的注册赠送积分（可选，nil 时跳过赠送，测试/未装配兜底）。
	bonusSvc registerBonuser
	// mailer 邮件发送器（注册验证码与密码重置邮件都走它）。
	// nil 时静默跳过发送，行为对齐"mailer 未装配 / SMTP 未配置"。
	redis  *redis.Client
	mailer *emailtemplates.Mailer
}

func NewUserService(
	repo UserRepositoryer,
	redis *redis.Client,
	bonusSvc registerBonuser,
	mailer *emailtemplates.Mailer,
) *UserService {
	return &UserService{repo: repo, redis: redis, bonusSvc: bonusSvc, mailer: mailer}
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

func (s *UserService) GetByEmail(ctx context.Context, email string) (*model.User, *model.Profile, error) {
	return s.repo.GetByEmail(ctx, email)
}

func (s *UserService) UpdatePasswordHash(ctx context.Context, userID uint, passwordHash string) error {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if u == nil {
		return usererrs.ErrUserNotFound
	}
	u.PasswordHash = passwordHash
	return s.repo.Update(ctx, u)
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
	if email != "" || avatarURL != "" {
		p = &model.Profile{}
	}
	if email != "" {
		p.Email = &email
	}
	if avatarURL != "" {
		p.Photo = avatarURL
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

func (s *UserService) SendEmailCode(ctx context.Context, email, mode string) bool {
	mode = normalizeMode(mode)
	if s.redis == nil || s.mailer == nil {
		return false
	}
	code := generateCode()

	key := emailCodeKey(email, mode, false)
	if err := s.redis.Set(ctx, key, code, emailCodeExpire).Err(); err != nil {
		slog.ErrorContext(ctx, "email code redis set failed", "err", err, "email", email, "mode", mode)
	}

	return s.mailer.SendVerificationCode(ctx, email, mode, code)
}

func (s *UserService) CreateOAuthUser(ctx context.Context, githubID int, username, email, avatarURL string) (*model.User, error) {
	if email != "" && s.repo.EmailExists(ctx, email) {
		return nil, usererrs.ErrEmailExists
	}
	username = uniqueUsername(username, func(candidate string) bool {
		return s.repo.UsernameExists(ctx, candidate)
	})
	hash, err := bcrypt.GenerateFromPassword([]byte(randomPassword()), bcryptCost)
	if err != nil {
		return nil, err
	}
	u := &model.User{Username: username, PasswordHash: string(hash), GithubID: &githubID}
	var p *model.Profile
	if email != "" || avatarURL != "" {
		p = &model.Profile{Photo: avatarURL}
		if email != "" {
			p.Email = &email
		}
	}
	if err := s.repo.Create(ctx, u, p); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *UserService) GetByGithubID(ctx context.Context, githubID int) (*model.User, error) {
	return s.repo.GetByGithubID(ctx, githubID)
}

func (s *UserService) LinkGitHub(ctx context.Context, userID uint, githubID int) error {
	return s.repo.SetGithubID(ctx, userID, githubID)
}

func (s *UserService) UnlinkGitHub(ctx context.Context, userID uint) error {
	return s.repo.ClearGithubID(ctx, userID)
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

func uniqueUsername(base string, exists func(string) bool) string {
	if !exists(base) {
		return base
	}
	for range 5 {
		candidate := base + "_" + randomSuffix(4)
		if !exists(candidate) {
			return candidate
		}
	}
	return base + "_" + randomSuffix(8)
}

func randomSuffix(n int) string {
	return randomHex(n)[:n]
}

func randomPassword() string {
	return randomHex(16)
}

// gormModel 快速构造仅带 ID 的 model.User。包内测试大量复用。
func gormModel(id uint) gorm.Model {
	return gorm.Model{ID: id}
}
