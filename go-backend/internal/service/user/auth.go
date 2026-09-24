package user

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/emailtemplates"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

// AuthService 统一负责身份校验、一次性凭证和 JWT 会话。
type AuthService struct {
	users        AuthUserServiceer
	redis        *redis.Client
	mailer       *emailtemplates.Mailer
	frontendURLs map[string]string
	maxDevices   int
	view         UserView
}

func NewAuthService(
	users AuthUserServiceer,
	redis *redis.Client,
	frontendURLs map[string]string,
	maxDevices int,
	mailer *emailtemplates.Mailer,
	view UserView,
) *AuthService {
	trimmed := make(map[string]string, len(frontendURLs))
	for k, v := range frontendURLs {
		trimmed[k] = strings.TrimRight(v, "/")
	}
	return &AuthService{
		users:        users,
		redis:        redis,
		mailer:       mailer,
		frontendURLs: trimmed,
		maxDevices:   maxDevices,
		view:         view,
	}
}

func checkPassword(u *model.User, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) == nil
}

func (s *AuthService) CheckPassword(u *model.User, password string) bool {
	return checkPassword(u, password)
}

func (s *AuthService) Authenticate(ctx context.Context, username, password string) (*model.User, error) {
	u, _, err := s.users.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if u == nil || !checkPassword(u, password) {
		return nil, usererrs.ErrInvalidCredentials
	}
	slog.InfoContext(ctx, "user login", "user_id", u.ID)
	return u, nil
}

func (s *AuthService) CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error) {
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

	if s.redis != nil {
		if err := s.storeRefreshToken(ctx, u.ID, refreshToken, refreshTTL); err != nil {
			return nil, err
		}
	}

	slog.InfoContext(ctx, "tokens issued", "user_id", u.ID)
	return &dto.TokensResponse{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func (s *AuthService) storeRefreshToken(ctx context.Context, userID uint, refreshToken string, ttl time.Duration) error {
	key := "refresh:" + strconv.Itoa(int(userID))
	claims, err := jwt.ParseToken(refreshToken)
	if err != nil {
		return err
	}
	if err := s.redis.HSet(ctx, key, claims.ID, refreshToken).Err(); err != nil {
		return err
	}
	s.redis.Expire(ctx, key, ttl)
	if s.maxDevices > 0 {
		evictOldest(ctx, s.redis, key, s.maxDevices)
	}
	return nil
}

// ponytail: 全量扫描 Hash 内所有 token 解析 iat，O(n) 解析；设备数上限小（默认 5）可忽略。
// 升级路径：如需大规模，改用 Sorted Set 按 iat 排序。
func evictOldest(ctx context.Context, r *redis.Client, key string, max int) {
	entries, err := r.HGetAll(ctx, key).Result()
	if err != nil || len(entries) <= max {
		return
	}
	type fieldIat struct {
		field string
		iat   int64
	}
	parsed := make([]fieldIat, 0, len(entries))
	for field, token := range entries {
		claims, err := jwt.ParseToken(token)
		if err != nil || claims.IssuedAt == nil {
			parsed = append(parsed, fieldIat{field: field})
			continue
		}
		parsed = append(parsed, fieldIat{field: field, iat: claims.IssuedAt.Unix()})
	}
	sort.Slice(parsed, func(i, j int) bool { return parsed[i].iat < parsed[j].iat })
	for i := range len(parsed) - max {
		r.HDel(ctx, key, parsed[i].field)
	}
}

func (s *AuthService) RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error) {
	claims, err := jwt.ParseToken(refreshToken)
	if err != nil {
		return nil, usererrs.ErrInvalidToken
	}
	userID, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil {
		return nil, usererrs.ErrInvalidToken
	}
	if s.redis != nil {
		key := "refresh:" + claims.Subject
		stored, err := s.redis.HGet(ctx, key, claims.ID).Result()
		if err != nil || stored != refreshToken {
			return nil, usererrs.ErrInvalidToken
		}
	}
	tokens, err := s.CreateTokens(ctx, &model.User{Model: gormModel(uint(userID))})
	if err != nil {
		return nil, err
	}
	if s.redis != nil {
		s.redis.HDel(ctx, "refresh:"+claims.Subject, claims.ID)
	}
	return tokens, nil
}

func (s *AuthService) Logout(ctx context.Context, userID uint, jti string) {
	if s.redis != nil {
		s.redis.HDel(ctx, "refresh:"+strconv.Itoa(int(userID)), jti)
	}
	slog.InfoContext(ctx, "user logout", "user_id", userID, "jti", jti)
}

func (s *AuthService) ResetPasswordFlow(ctx context.Context, email, mode string) (string, error) {
	if email == "" {
		return "", usererrs.ErrEmailRequired
	}
	if s.redis == nil {
		return "", fmt.Errorf("reset password unavailable: redis is not configured")
	}
	mode = normalizeMode(mode)
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	challenge := hex.EncodeToString(b)
	chKey := fmt.Sprintf(emailResetChallengeCacheKeyFmt, email, mode)
	if err := s.redis.Set(ctx, chKey, challenge, emailCodeExpire).Err(); err != nil {
		slog.ErrorContext(ctx, "reset challenge redis set failed", "err", err, "email", email, "mode", mode)
	}
	emailCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	go s.sendPasswordReset(emailCtx, email, mode)
	return challenge, nil
}

func (s *AuthService) ConfirmPasswordReset(ctx context.Context, email, code, newPassword, mode, challenge string) error {
	if email == "" {
		return usererrs.ErrEmailRequired
	}
	if challenge == "" {
		return usererrs.ErrInvalidToken
	}
	mode = normalizeMode(mode)
	u, _, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		slog.ErrorContext(ctx, "password reset get-by-email failed", "err", err, "email", email)
		return err
	}
	if u == nil {
		return usererrs.ErrInvalidEmailCode
	}
	if checkPassword(u, newPassword) {
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
	if err := s.users.UpdatePasswordHash(ctx, u.ID, string(hash)); err != nil {
		slog.ErrorContext(ctx, "password reset update failed", "err", err, "user_id", u.ID)
		return err
	}
	return nil
}

func (s *AuthService) SendLoginEmailCode(ctx context.Context, email string) bool {
	if s.redis == nil || s.mailer == nil {
		return false
	}
	u, _, err := s.users.GetByEmail(ctx, email)
	if err != nil || u == nil {
		slog.InfoContext(ctx, "login email code: email not registered, silent skip", "mode", modeNomu)
		return true
	}
	ok, err := s.redis.SetNX(ctx, emailLoginCooldownKey(email), "1", emailLoginCooldown).Result()
	if err != nil {
		slog.ErrorContext(ctx, "login email code cooldown set failed", "err", err)
		return false
	}
	if !ok {
		slog.InfoContext(ctx, "login email code send skipped by cooldown", "mode", modeNomu)
		return true
	}
	code := generateCode()
	codeKey := emailLoginKey(email)
	if err := s.redis.Set(ctx, codeKey, code, emailCodeExpire).Err(); err != nil {
		s.redis.Del(ctx, emailLoginCooldownKey(email))
		slog.ErrorContext(ctx, "login email code redis set failed", "err", err)
		return false
	}
	if !s.mailer.SendEmailCodeLogin(ctx, email, code) {
		s.redis.Del(ctx, codeKey, emailLoginCooldownKey(email))
		slog.ErrorContext(ctx, "login email code mail send failed", "err", "mailer returned false")
		return false
	}
	slog.InfoContext(ctx, "login email code sent", "user_id", u.ID)
	return true
}

func (s *AuthService) AuthenticateEmailCode(ctx context.Context, email, code string) (*model.User, *model.Profile, error) {
	if s.redis == nil || len(code) != emailLoginCodeLength {
		return nil, nil, usererrs.ErrInvalidEmailCode
	}
	u, p, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		slog.ErrorContext(ctx, "auth email code get-by-email failed", "err", err, "mode", modeNomu)
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, usererrs.ErrInvalidEmailCode
	}
	res, err := loginCodeVerifyScript.Run(ctx, s.redis,
		[]string{emailLoginKey(email), emailLoginAttemptsKey(email)}, code, emailLoginMaxAttempts).Int()
	if err != nil {
		slog.ErrorContext(ctx, "auth email code redis script failed", "err", err, "mode", modeNomu)
		return nil, nil, err
	}
	if res != 1 {
		return nil, nil, usererrs.ErrInvalidEmailCode
	}
	s.redis.Del(ctx, emailLoginCooldownKey(email))
	slog.InfoContext(ctx, "email code login consumed", "user_id", u.ID)
	return u, p, nil
}

func (s *AuthService) sendPasswordReset(ctx context.Context, email, mode string) bool {
	if s.mailer == nil {
		return false
	}
	code := generateCode()
	if err := s.redis.Set(ctx, emailCodeKey(email, mode, true), code, emailCodeExpire).Err(); err != nil {
		slog.ErrorContext(ctx, "email reset redis set failed", "err", err, "email", email, "mode", mode)
	}
	return s.mailer.SendPasswordResetCode(ctx, email, mode, code)
}

func (s *AuthService) verifyEmailCode(ctx context.Context, email, code, mode string, isReset bool) bool {
	if s.redis == nil || email == "" {
		return false
	}
	key := emailCodeKey(email, mode, isReset)
	stored, err := s.redis.Get(ctx, key).Result()
	if err != nil || stored != code {
		return false
	}
	s.redis.Del(ctx, key)
	return true
}
