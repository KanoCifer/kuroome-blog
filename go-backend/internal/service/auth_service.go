package service

import (
	"context"
	"log/slog"
	"strconv"
	"time"

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

	// refresh token 写入 Redis，key = refresh:{userID}
	if s.redis != nil {
		s.redis.Set(ctx, "refresh:"+strconv.Itoa(int(u.ID)), refreshToken, refreshTTL)
	}

	slog.InfoContext(ctx, "tokens issued", "user_id", u.ID)
	return &dto.TokensResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
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

	// 校验 Redis 里存的和传入的是否一致（防止重放/盗用）
	if s.redis != nil {
		stored, err := s.redis.Get(ctx, "refresh:"+claims.Subject).Result()
		if err != nil || stored != refreshToken {
			return nil, usererrs.ErrInvalidToken
		}
	}

	return s.CreateTokens(ctx, &model.User{Model: gorm.Model{ID: userIDU}})
}

// Logout 登出：从 Redis 删掉 refresh token
func (s *userService) Logout(ctx context.Context, userID uint) {
	if s.redis != nil {
		s.redis.Del(ctx, "refresh:"+strconv.Itoa(int(userID)))
	}
	slog.InfoContext(ctx, "user logout", "user_id", userID)
}