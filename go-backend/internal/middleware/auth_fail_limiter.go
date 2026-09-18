package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// AuthFailLimiter 在业务判定认证失败时由 handler 显式调用,失败才计数,
// 合法请求不动。与通用 RateLimiter(前置中间件)的关键差别:
//
//   - 时机: 业务侧"我刚拒绝了"之后再调用,而不是每个请求都先过限流;
//   - 语义: Redis 故障一律放行,避免单点故障锁死合法用户;
//   - 形态: 不返回 gin.HandlerFunc,而是 (limited, retryAfter) 直接给 handler 复用。
//
// 命名空间设计: key = "rl:<scope>:<client_ip>";scope 由调用方传入,
// 例如 "nomu_ws_auth_fail"、"refresh_auth_fail",互不串扰。
type AuthFailLimiter struct {
	rdb        *redis.Client
	scope      string
	threshold  int           // 第 (threshold+1) 次开始 429
	window     time.Duration // 计数窗口
	retryAfter time.Duration // 429 响应 Retry-After
}

// NewAuthFailLimiter 构造一个默认阈值(5 次/小时)的认证失败限流器。
//
// 选 5/hour 的考虑:
//   - 1 小时内允许 5 次失败,合法用户的偶发 401(过期后首次 ws + 首次 refresh)
//     不会误伤,但已经能压住坏前端短时间高频重试;
//   - window=1h 让坏前端即使坚持 1 小时也只能骚扰 5 次,放完配额后窗口内
//     持续 429,直到 Redis key TTL 到期才解封;
//
// 如果将来某个 scope 需要更严(比如支付类),再加 NewAuthFailLimiterWithConfig
// 接受 threshold / window 参数,不要把当前默认值收紧。
func NewAuthFailLimiter(rdb *redis.Client, scope string) *AuthFailLimiter {
	return &AuthFailLimiter{
		rdb:        rdb,
		scope:      scope,
		threshold:  5,
		window:     time.Hour,
		retryAfter: 60 * time.Second,
	}
}

// Fail 记录一次认证失败,返回是否已超阈值(limited)与建议重试间隔。
//
// 行为约定:
//   - rdb 为 nil(单元测试 / 配置缺失): 一律放行,不阻断;
//   - Redis 调用失败: warn 后放行,绝不把 Redis 故障放大成"用户全锁";
//   - 计数 > threshold: 返 (true, retryAfter),handler 应直接 429 + Retry-After。
func (l *AuthFailLimiter) Fail(c *gin.Context) (limited bool, retryAfter time.Duration) {
	if l == nil || l.rdb == nil {
		return false, 0
	}
	key := fmt.Sprintf("rl:%s:%s", l.scope, ClientIP(c))
	ctx := c.Request.Context()
	if ctx == nil {
		ctx = context.Background()
	}

	pipe := l.rdb.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, l.window)
	if _, err := pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "auth fail limiter redis error", "scope", l.scope, "error", err)
		return false, 0
	}
	if incr.Val() > int64(l.threshold) {
		return true, l.retryAfter
	}
	return false, 0
}

// Scope 暴露 scope 用于响应头/日志标注。
func (l *AuthFailLimiter) Scope() string {
	if l == nil {
		return ""
	}
	return l.scope
}