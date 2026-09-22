package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// TestAuthFailLimiter_FirstHitSemantics 验证限流命中时的 firstHit 语义:
//   - 前 threshold 次失败:limited=false,firstHit 无关(总 false);
//   - 第 threshold+1 次(超阈值):limited=true,firstHit=true(首次进入限流);
//   - 之后稳态命中:limited=true,firstHit=false(标记已设过)。
//
// 用 miniredis 作为 Redis 替身,3 个命令(INCR/EXPIRE/SETNX)走通完整 pipeline。
// 直接对 limiter 调 Fail,不绕 gin handler,简化测试结构。
func TestAuthFailLimiter_FirstHitSemantics(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	t.Cleanup(mr.Close)

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	limiter := NewAuthFailLimiter(rdb, "test_first_hit")
	ctx := buildCtx("203.0.113.7")

	results := make([]struct {
		limited  bool
		firstHit bool
	}, 8)
	for i := range 8 {
		limited, firstHit, _ := limiter.Fail(ctx)
		results[i].limited = limited
		results[i].firstHit = firstHit
	}

	// 前 5 次:limited=false
	for i := range 5 {
		if results[i].limited {
			t.Errorf("attempt %d: limited = true, want false", i+1)
		}
		if results[i].firstHit {
			t.Errorf("attempt %d: firstHit = true before limit, want false", i+1)
		}
	}
	// 第 6 次(下标 5):首次进入限流,firstHit=true
	if !results[5].limited || !results[5].firstHit {
		t.Errorf("attempt 6 (first limit): limited=%v firstHit=%v, want true/true",
			results[5].limited, results[5].firstHit)
	}
	// 第 7、8 次:稳态命中,firstHit=false
	for i := 6; i < 8; i++ {
		if !results[i].limited || results[i].firstHit {
			t.Errorf("attempt %d (steady): limited=%v firstHit=%v, want true/false",
				i+1, results[i].limited, results[i].firstHit)
		}
	}
}

// TestAuthFailLimiter_WindowExpiry 验证窗口过期后 firstHit 标记会重置:
// 推进 miniredis 时间 > 1 小时,新窗口再次触发限流时 firstHit 应再次为 true。
func TestAuthFailLimiter_WindowExpiry(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	t.Cleanup(mr.Close)

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	limiter := NewAuthFailLimiter(rdb, "test_window_expiry")
	ctx := buildCtx("198.51.100.42")

	// 第一个窗口:触发 6 次,第 6 次首次进入限流
	for range 5 {
		_, _, _ = limiter.Fail(ctx)
	}
	limited6, firstHit6, _ := limiter.Fail(ctx)
	if !limited6 || !firstHit6 {
		t.Fatalf("first window: limited=%v firstHit=%v, want true/true", limited6, firstHit6)
	}

	// 推进 miniredis 时间 > window,firstKey 与 counterKey 都应过期。
	mr.FastForward(2 * time.Hour)

	// 新窗口:再 6 次,第 6 次 firstHit 应再次为 true(标记已过期被新设置)。
	for range 5 {
		_, _, _ = limiter.Fail(ctx)
	}
	limitedAgain, firstHitAgain, _ := limiter.Fail(ctx)
	if !limitedAgain || !firstHitAgain {
		t.Fatalf("after window expiry: limited=%v firstHit=%v, want true/true",
			limitedAgain, firstHitAgain)
	}
}

// buildCtx 给定客户端 IP 构造一个 gin.Context,只填 RemoteAddr 即可让 ClientIP() 工作。
func buildCtx(remoteIP string) *gin.Context {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/", nil)
	c.Request.RemoteAddr = remoteIP + ":12345"
	return c
}
