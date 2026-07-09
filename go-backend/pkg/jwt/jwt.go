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
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Subject:   strconv.FormatUint(uint64(userID), 10),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.Cfg.SECRET_KEY))
}

// ParseToken 解析并验证 JWT，返回其中的 RegisteredClaims。
func ParseToken(tokenString string) (*jwt.RegisteredClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{},
		func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(config.Cfg.SECRET_KEY), nil
		})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}
