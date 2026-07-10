package middleware

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Authorization header is required"})
			return
		}
		const bearerPrefix = "Bearer "
		if !strings.HasPrefix(authHeader, bearerPrefix) {
			c.AbortWithStatusJSON(401, gin.H{"error": "Authorization header must start with 'Bearer '"})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, bearerPrefix)
		claims, err := jwt.ParseToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
		sub := claims.Subject
		userID, err := strconv.Atoi(sub)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

// AdminMiddleware 返回一个校验当前用户是否属于 adminUserIDs 的 GIN 中间件。
//
// adminUserIDs 由调用方从 config 注入，避免本包直接读取全局 config.Cfg。
func AdminMiddleware(adminUserIDs []int) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, _ := c.Get("user_id")
		userID, ok := userIDVal.(int)
		if !ok {
			c.AbortWithStatusJSON(403, gin.H{"error": "Admin access required"})
			return
		}
		for _, id := range adminUserIDs {
			if userID == id {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(403, gin.H{"error": "Admin access required"})
	}
}
