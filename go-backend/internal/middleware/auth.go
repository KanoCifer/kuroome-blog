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

// DevTaskMiddleware 校验 devtask / MCP 专用的服务级 JWT。
//
// 与 AuthMiddleware 独立：不校验用户身份，不检查 admin 白名单。
// 通过 ParseServiceToken 验证 token 由 DEV_TASK_SECRET 签发且 role=service。
// 验证通过后设 context["auth_type"] = "service"，可供 handler 区分鉴权来源。
func DevTaskMiddleware() gin.HandlerFunc {
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
		claims, err := jwt.ParseServiceToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid service token"})
			return
		}
		c.Set("auth_type", "service")
		c.Set("token_role", claims.Role)
		c.Next()
	}
}
