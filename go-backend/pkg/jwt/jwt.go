package jwt

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

// GenerateToken 为指定 userID 签发 HS256 JWT，过期时间由 expiresAt 控制。
func GenerateToken(userID uint, expiresAt time.Time) (string, error) {
	claims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(expiresAt),
		IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
		Subject:   strconv.FormatUint(uint64(userID), 10),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.Cfg.Security.SecretKey))
}

// ParseToken 解析并验证 JWT，返回其中的 RegisteredClaims。
func ParseToken(tokenString string) (*jwt.RegisteredClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{},
		func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(config.Cfg.Security.SecretKey), nil
		})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

// ── 服务级 JWT（devtask / MCP 专用，独立于用户 JWT） ──

// serviceClaims 是服务级 token 的 claims，用 Role 字段区分调用者身份。
type serviceClaims struct {
	jwt.RegisteredClaims
	Role string `json:"role"`
}

// GenerateServiceToken 签发一个 role=service 的 JWT。
// secret 为签名密钥，expiresAt 控制过期时间。
// 用于 MCP server ↔ go-backend 的服务间鉴权。
func GenerateServiceToken(expiresAt time.Time, secret string) (string, error) {
	claims := serviceClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
			Subject:   "devtask-service",
		},
		Role: "service",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseServiceToken 解析并验证服务级 JWT（用 DevTaskSecret）。
// 返回错误的情况：签名无效、过期、role ≠ "service"。
func ParseServiceToken(tokenString string) (*serviceClaims, error) {
	secret := config.Cfg.Security.DevTaskSecret
	if secret == "" {
		return nil, errors.New("devtask secret not configured")
	}
	token, err := jwt.ParseWithClaims(tokenString, &serviceClaims{},
		func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(secret), nil
		})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*serviceClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.Role != "service" {
		return nil, errors.New("token role mismatch")
	}
	return claims, nil
}
