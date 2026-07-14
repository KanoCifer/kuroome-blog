package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// allowedOrigins 是前端来源白名单。Vite dev server + 生产域名。
func allowedOrigins() []string {
	return []string{
		"https://kanocifer.chat",
		"https://m.kanocifer.chat",
		"https://api.kanocifer.chat",
		"http://localhost:5173",
		"http://localhost:5174",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:5174",
	}
}

// CORS 跨域中间件。白名单精确匹配 Origin；命中则回写完整 CORS 头；
// OPTIONS 预检直接 204，不进入后续 handler。
func CORS() gin.HandlerFunc {
	origins := allowedOrigins()

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		var allowed bool
		for _, o := range origins {
			if strings.EqualFold(o, origin) {
				allowed = true
				break
			}
		}
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			// 预检回显客户端请求的 header，非预检给默认白名单。
			// 注意：credentials: true 下 "*" 不会被当作通配符，必须显式列出。
			if requested := c.GetHeader("Access-Control-Request-Headers"); requested != "" {
				c.Header("Access-Control-Allow-Headers", requested)
			} else {
				c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept")
			}
			c.Header("Access-Control-Max-Age", "86400")
			c.Header("Access-Control-Expose-Headers", "X-Process-Time, X-Trace-Id")
		}

		// 预检请求直接返回 204
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
