package service

import (
	"context"
	"errors"
	"slices"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"app/internal/config"
	"app/internal/model"
	"app/internal/repository/postgres"
	"app/pkg/jwt"
)

var (
	ErrInvalidCredentials = errors.New("用户名或密码错误")
	ErrUserExists         = errors.New("用户名已存在")
	ErrEmailExists        = errors.New("邮箱已注册")
	ErrInvalidEmailCode   = errors.New("验证码无效")
	ErrUserNotFound       = errors.New("用户不存在")
	ErrInvalidToken       = errors.New("无效的令牌")
)

type Tokens struct {
	AccessToken  string
	RefreshToken string
}

type LoginResponse struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

// UserService 持有 repo 和 redis，负责编排业务逻辑
type UserService struct {
	repo  *postgres.UserRepo
	redis *redis.Client
}

func NewUserService(repo *postgres.UserRepo, redis *redis.Client) *UserService {
	return &UserService{repo: repo, redis: redis}
}

// ---------- 查询 ----------

func (s *UserService) GetByID(userID uint) (*model.User, *model.Profile, error) {
	u, err := s.repo.GetByID(userID)
	if err != nil {
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, ErrUserNotFound
	}
	return u, u.Profile, nil
}

func (s *UserService) GetByUsername(username string) (*model.User, *model.Profile, error) {
	u, err := s.repo.GetByUsername(username)
	if err != nil {
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, nil
	}
	return u, u.Profile, nil
}

// ---------- 注册 ----------

func (s *UserService) CreateUser(username, password, email, emailCode string) (*model.User, *model.Profile, error) {
	if s.repo.UsernameExists(username) {
		return nil, nil, ErrUserExists
	}
	if email != "" && s.repo.EmailExists(email) {
		return nil, nil, ErrEmailExists
	}

	if emailCode != "" {
		if !s.verifyEmailCode(email, emailCode) {
			return nil, nil, ErrInvalidEmailCode
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
	if err := s.repo.Create(u, p); err != nil {
		return nil, nil, err
	}
	return u, p, nil
}

// ---------- 登录 / 鉴权 ----------

func (s *UserService) CheckPassword(u *model.User, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

func (s *UserService) Authenticate(username, password string) (*model.User, error) {
	u, _, err := s.GetByUsername(username)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, ErrInvalidCredentials
	}
	if !s.CheckPassword(u, password) {
		return nil, ErrInvalidCredentials
	}
	return u, nil
}

// CreateTokens 生成 access + refresh token，refresh 入库 Redis
func (s *UserService) CreateTokens(u *model.User) (*Tokens, error) {
	refreshTTL := 7 * 24 * time.Hour
	accessExpiry := time.Now().Add(15 * time.Minute)
	refreshExpiry := time.Now().Add(refreshTTL)

	accessToken, err :=  jwt.GenerateToken(u.ID, accessExpiry)
	if err != nil {
		return nil, err
	}
	refreshToken, err :=  jwt.GenerateToken(u.ID, refreshExpiry)
	if err != nil {
		return nil, err
	}

	// refresh token 写入 Redis，key = refresh:{userID}
	if s.redis != nil {
		ctx := context.Background()
		s.redis.Set(ctx, "refresh:"+itoa(int(u.ID)), refreshToken, refreshTTL)
	}

	return &Tokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// RefreshTokens 校验 refresh token 并轮换
func (s *UserService) RefreshTokens(refreshToken string) (*Tokens, error) {
	claims, err := jwt.ParseToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidToken
	}
	userID, err := parseUint(claims.Subject)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// 校验 Redis 里存的和传入的是否一致（防止重放/盗用）
	if s.redis != nil {
		stored, err := s.redis.Get(context.Background(), "refresh:"+claims.Subject).Result()
		if err != nil || stored != refreshToken {
			return nil, ErrInvalidToken
		}
	}

	return s.CreateTokens(&model.User{Model: gormModel(userID)})
}

// Logout 登出：从 Redis 删掉 refresh token
func (s *UserService) Logout(userID uint) {
	if s.redis != nil {
		s.redis.Del(context.Background(), "refresh:"+itoa(int(userID)))
	}
}

// ---------- 响应构造 ----------

func (s *UserService) IsAdmin(u *model.User) bool {
	return slices.Contains(config.Cfg.ADMIN_USER_IDS, int(u.ID))
}

func (s *UserService) UserToDict(u *model.User, p *model.Profile) map[string]any {
	d := map[string]any{
		"id":          u.ID,
		"username":    u.Username,
		"name":        u.Name,
		"is_admin":    s.IsAdmin(u),
		"login_count": u.LoginCount,
		"active":      u.Active,
	}
	if u.GithubID != nil {
		d["github_id"] = *u.GithubID
	}
	if p != nil && p.ID != 0 {
		profile := map[string]any{}
		if p.Email != nil {
			profile["email"] = *p.Email
		}
		if p.Photo != "" {
			profile["photo"] = p.Photo
		}
		d["profile"] = profile
	}
	return d
}

// ---------- 辅助 ----------

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

// verifyEmailCode 校验 Redis 中的注册验证码（signup_code:{email}）。
func (s *UserService) verifyEmailCode(email, code string) bool {
	if s.redis == nil || email == "" {
		return false
	}
	ctx := context.Background()
	key := "signup_code:" + email
	stored, err := s.redis.Get(ctx, key).Result()
	if err != nil || stored != code {
		return false
	}
	s.redis.Del(ctx, key)
	return true
}
