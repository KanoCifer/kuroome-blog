// Package middleware 提供 gin 中间件：请求耗时记录。
package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// Duration 记录每个请求的 method/path/status/duration，通过 slog 输出。
// 放在路由组最外层，才能覆盖到恢复链路内的耗时。
func Duration() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		p := strconv.FormatInt(time.Since(start).Milliseconds(), 10)
		c.Header("X-Process-Time", p+"ms")
	}
}
