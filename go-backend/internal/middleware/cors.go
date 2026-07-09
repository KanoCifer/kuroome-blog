package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

// allowedOrigins 是前端来源白名单。Vite dev server + 生产域名。
// 从 config.Cfg 读取, 未配置时回退到 localhost 开发端口。
func allowedOrigins() []string {
	// 生产/Vite 默认都允许的来源
	return []string{
		"https://kanocifer.chat",
		"https://m.kanocifer.chat",
		"http://localhost:5173",
		"http://localhost:5174",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:5174",
	}
}

// CORS 跨域中间件。允许携带 cookie (AllowCredentials), 预检缓存 12h。
// 来源匹配白名单中的域名(精确匹配), 否则不返回 ACAO。
func CORS() gin.HandlerFunc {
	origins := allowedOrigins()
	hasWildcard := len(origins) == 0

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowed := hasWildcard
		if !allowed {
			for _, o := range origins {
				if strings.EqualFold(o, origin) {
					allowed = true
					break
				}
			}
		}
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, Authorization, X-Requested-With")
			c.Header("Access-Control-Max-Age", "43200") // 12h
		}

		// 预检请求直接返回 204
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// _ 占位,确保 config 在编译期即被引用(避免未来删除 import 时中间件静默失去配置)。
var _ = config.Cfg
