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

// Fail 记录一次认证失败,返回 (limited, firstHit, retryAfter):
//   - limited: 是否已超阈值;
//   - firstHit: 是否是该 IP 在本窗口内**首次**进入限流状态(用 SETNX 标记);
//   - retryAfter: 超阈值时建议客户端等多久再试。
//
// 日志策略(由 handler 据 firstHit 决定级别):
//   - firstHit=true  → WARN,这是值得关注的边沿事件(某个 IP 进入限流了);
//   - firstHit=false → 不打日志,稳态信号已经在首次打过,再打就是噪音;
//   - rdb 为 nil 或 Redis 故障: 全部放行,绝不把 Redis 故障放大成"用户全锁"。
//
// 实现: 两阶段 pipeline,避免"前几次失败就误设 firstKey 标记"。
//   - 第一次:INCR + EXPIRE,读出当前计数 n;
//   - n <= threshold: 已结束,无需 SETNX(否则前 5 次也会把 firstKey 设上,
//     导致第 6 次的"首次进入"语义失效);
//   - n > threshold: 再单独 SETNX,标记"已进入限流"。
func (l *AuthFailLimiter) Fail(c *gin.Context) (limited bool, firstHit bool, retryAfter time.Duration) {
	if l == nil || l.rdb == nil {
		return false, false, 0
	}
	ip := ClientIP(c)
	counterKey := fmt.Sprintf("rl:%s:%s", l.scope, ip)
	firstKey := fmt.Sprintf("rl:%s:first:%s", l.scope, ip)
	ctx := c.Request.Context()
	if ctx == nil {
		ctx = context.Background()
	}

	// 第一阶段: INCR + EXPIRE,拿当前计数。
	pipe := l.rdb.Pipeline()
	incrCmd := pipe.Incr(ctx, counterKey)
	pipe.Expire(ctx, counterKey, l.window)
	if _, err := pipe.Exec(ctx); err != nil {
		slog.WarnContext(ctx, "auth fail limiter redis error", "scope", l.scope, "error", err)
		return false, false, 0
	}
	n := incrCmd.Val()
	if n <= int64(l.threshold) {
		return false, false, 0
	}

	// 第二阶段: 超阈值,SETNX 标记首次进入。SETNX 在 firstKey 已存在时返 false,
	// 第一次进入时返 true(并自动设值 + 继承 TTL)。
	set, err := l.rdb.SetNX(ctx, firstKey, "1", l.window).Result()
	if err != nil {
		slog.WarnContext(ctx, "auth fail limiter redis error", "scope", l.scope, "error", err)
		// Redis 故障时保守: 限流判定仍生效(firstHit 拿不到就当 false,handler 走静默分支)。
		return true, false, l.retryAfter
	}
	return true, set, l.retryAfter
}

// Scope 暴露 scope 用于响应头/日志标注。
func (l *AuthFailLimiter) Scope() string {
	if l == nil {
		return ""
	}
	return l.scope
}