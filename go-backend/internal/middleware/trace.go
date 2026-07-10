// Package middleware 提供 gin 中间件：trace_id 注入。
package middleware

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/logger"
)

// Trace 为每个请求生成 trace_id，写入 request context 供 slog 自动携带，
// 并回写到 X-Trace-Id 响应头，与 Python 端行为对齐。
func Trace() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Trace-Id")
		if id == "" {
			id = newTraceID()
		}
		ctx := logger.WithTraceID(c.Request.Context(), id)
		c.Request = c.Request.WithContext(ctx)
		c.Set("trace_id", id)
		c.Header("X-Trace-Id", id)
		c.Next()
	}
}

func newTraceID() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
