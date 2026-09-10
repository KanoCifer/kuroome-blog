package service

import (
	"context"
	"log/slog"
	"sort"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

// ---------- 密码校验 ----------

func (s *userService) CheckPassword(u *model.User, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) == nil
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

// ---------- JWT 会话 ----------

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

	if s.redis != nil {
		if err := s.storeRefreshToken(ctx, u.ID, refreshToken, refreshTTL); err != nil {
			return nil, err
		}
	}

	slog.InfoContext(ctx, "tokens issued", "user_id", u.ID)
	return &dto.TokensResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// storeRefreshToken 把 refresh token 写入 Redis Hash（field=jti），并在超出
// maxDevices 时驱逐 iat 最早的 field。
func (s *userService) storeRefreshToken(ctx context.Context, userID uint, refreshToken string, ttl time.Duration) error {
	key := "refresh:" + strconv.Itoa(int(userID))

	claims, err := jwt.ParseToken(refreshToken)
	if err != nil {
		return err
	}

	if err := s.redis.HSet(ctx, key, claims.ID, refreshToken).Err(); err != nil {
		return err
	}
	s.redis.Expire(ctx, key, ttl)

	// 驱逐：超出 maxDevices 时删掉 iat 最早的 field。
	if s.maxDevices <= 0 {
		return nil
	}
	evictOldest(ctx, s.redis, key, s.maxDevices)
	return nil
}

// evictOldest 当 Hash 的 field 数超过 max 时，解析每个 token 的 iat，删掉最早的若干 field 使剩余 ≤ max。
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
		if err != nil {
			// 解析失败（格式错/过期）优先驱逐，占位无 iat 视为最老
			parsed = append(parsed, fieldIat{field: field, iat: 0})
			continue
		}
		var iat int64
		if claims.IssuedAt != nil {
			iat = claims.IssuedAt.Unix()
		}
		parsed = append(parsed, fieldIat{field: field, iat: iat})
	}

	// 按 iat 升序排，最早的在前，收集要删的 field。
	sort.Slice(parsed, func(i, j int) bool { return parsed[i].iat < parsed[j].iat })
	toDelete := len(parsed) - max
	for i := 0; i < toDelete; i++ {
		r.HDel(ctx, key, parsed[i].field)
	}
}

func (s *userService) RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error) {
	claims, err := jwt.ParseToken(refreshToken)
	if err != nil {
		return nil, usererrs.ErrInvalidToken
	}
	userID, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil {
		return nil, usererrs.ErrInvalidToken
	}
	userIDU := uint(userID)

	// 校验 Redis Hash 里该 jti 对应的 token 与传入一致（防止重放/盗用）。
	if s.redis != nil {
		key := "refresh:" + claims.Subject
		stored, err := s.redis.HGet(ctx, key, claims.ID).Result()
		if err != nil || stored != refreshToken {
			return nil, usererrs.ErrInvalidToken
		}
	}

	// 轮换：CreateTokens 写入新 jti field，再删旧 jti field。
	tokens, err := s.CreateTokens(ctx, &model.User{Model: gorm.Model{ID: userIDU}})
	if err != nil {
		return nil, err
	}
	if s.redis != nil {
		s.redis.HDel(ctx, "refresh:"+claims.Subject, claims.ID)
	}
	return tokens, nil
}

// Logout 登出：从 Redis Hash 删掉当前设备的 refresh token field（jti）。
func (s *userService) Logout(ctx context.Context, userID uint, jti string) {
	if s.redis != nil {
		s.redis.HDel(ctx, "refresh:"+strconv.Itoa(int(userID)), jti)
	}
	slog.InfoContext(ctx, "user logout", "user_id", userID, "jti", jti)
}
