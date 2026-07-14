// Package middleware 提供 gin 中间件：请求耗时记录。
package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
)

// RequestStart 是存入 gin Context 的请求起始时间 key。
const RequestStart = "request_start"

// Duration 记录每个请求的耗时。
// 将起始时间存入 Context，由 response 包在实际写入响应时注入
// X-Process-Time 头。放在路由组最外层以覆盖完整链路。
func Duration() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(RequestStart, time.Now().UTC())
		c.Next()
	}
}
