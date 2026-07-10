package middleware

import (
	"github.com/gin-contrib/cors"
)

// allowedOrigins 是前端来源白名单。Vite dev server + 生产域名。
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

func NewCORSConfig() cors.Config {
	config := cors.DefaultConfig()
	config.AllowOrigins = allowedOrigins()
	config.AllowCredentials = true
	config.MaxAge = 12 * 3600 // 12h

	return config
}
