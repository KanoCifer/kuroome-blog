package service

import (
	"context"
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
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/emailtemplates"
)

const (
	emailCodeExpire = time.Minute * 5
	// 命名空间 by mode，跨 mode 互不串
	emailCodeCacheKeyFmt  = "email_code:%s:%s"
	emailResetCacheKeyFmt = "email_reset:%s:%s"
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
	PasswordHashExists(ctx context.Context, hash string) bool
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

func (s *UserService) SendPasswordReset(ctx context.Context, email, mode string) bool {
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

func (s *UserService) verifyEmailCode(ctx context.Context, email, code, mode string) bool {
	if s.redis == nil || email == "" {
		return false
	}
	stored, err := s.redis.Get(ctx, emailCodeKey(email, mode, false)).Result()
	if err != nil || stored != code {
		return false
	}
	s.redis.Del(ctx, emailCodeKey(email, mode, false))
	return true
}

func generateCode() string {
	return strconv.Itoa(rand.Intn(999999))
}

// gormModel 快速构造仅带 ID 的 model.User。包内测试大量复用。
func gormModel(id uint) gorm.Model {
	return gorm.Model{ID: id}
}
