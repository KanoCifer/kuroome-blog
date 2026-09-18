// Package middleware 提供 gin 中间件：slog 结构化请求日志。
package middleware

import (
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

// access4xxSampleRate 4xx 状态码(429 除外)的 access log 抽样比例:每 N 条留 1 条。
// 改这里即可全局调整,不需要改 config,过渡期坏客户端高频 401 时常用。
//
// 429(TooManyRequests,限流命中)直接跳过:这是设计内的稳态,坏前端高频 429
// 排查价值低,继续写日志只会撑爆 app.log。
const access4xxSampleRate = 10

// SlogMiddleware 在每个请求完成后输出一行结构化 access log。
// 与 Trace 中间件协作：Trace 先把 trace_id 存入 gin Context（c.Set），
// 这里再读出绑定到本条 record，保证 access log 与 handler 日志的 trace_id 一致。
//
// 字段对齐 Gin 官方 structured-logging 推荐 schema：
// method / path / query / status / latency / client_ip / body_size。
//
// 日志量控制(Nomu 旧版 ws bug 期间):
//   - 2xx / 3xx / 5xx 全量保留 —— 排查关键;
//   - 4xx 按 1/access4xxSampleRate 抽样 —— 高频 401/403 噪音大;
//   - 429(限流命中)直接跳过 —— 已是设计内的稳态信号。
//
// sample 计数放在闭包内 atomic,每个 middleware 实例独立(测试可构造多个
// gin engine 互不干扰),无锁开销。
func SlogMiddleware(logger *slog.Logger) gin.HandlerFunc {
	var sampleN atomic.Uint64
	return func(c *gin.Context) {
		// 跳过 CORS preflight，避免噪音。
		if c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		start := time.Now().UTC()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		status := c.Writer.Status()

		// 4xx 抽样:429 完全跳过,其余按 1/N 抽样。
		if status >= 400 && status < 500 {
			if status == http.StatusTooManyRequests {
				return
			}
			if n := sampleN.Add(1); n%access4xxSampleRate != 0 {
				return
			}
		}

		// 绑定 trace_id（Trace 中间件已写入，缺省空串）。
		log := logger.With("trace_id", c.GetString("trace_id"))

		log.Info("request",
			slog.String("method", c.Request.Method),
			slog.String("path", path),
			slog.String("query", query),
			slog.Int("status", status),
			slog.Duration("latency", time.Since(start)),
			slog.String("client_ip", ClientIP(c)),
			slog.Int("body_size", c.Writer.Size()),
		)

		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				log.Error("request error",
					slog.String("error", err.Error()),
					slog.String("type", errType(err.Type)),
				)
			}
		}
	}
}

// errType 把 gin.ErrorType 转为可读字符串，仅用于日志字段。
func errType(t gin.ErrorType) string {
	switch t {
	case gin.ErrorTypeBind:
		return "bind"
	case gin.ErrorTypeRender:
		return "render"
	case gin.ErrorTypePrivate:
		return "private"
	case gin.ErrorTypePublic:
		return "public"
	case gin.ErrorTypeAny:
		return "any"
	default:
		return "unknown"
	}
}