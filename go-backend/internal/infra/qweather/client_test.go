package qweather

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
)

const testBaseURL = "http://qweather.test"

const samplePayload = `{"code":"200","now":{"temp":"25"}}`

// ── helpers ──────────────────────────────────────────────────────────

func genTestEd25519(t *testing.T) string {
	t.Helper()
	_, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("GenerateKey: %v", err)
	}
	pkcs8, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		t.Fatalf("MarshalPKCS8PrivateKey: %v", err)
	}
	return string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: pkcs8}))
}

// waitForCache 轮询等待异步写回的缓存落盘（miniredis），超时则 t.Fatal。
// 生产代码以 goroutine 写回缓存，响应返回时写回未必完成，直接断言会竞态。
func waitForCache(t *testing.T, mr *miniredis.Miniredis, key, want string) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for {
		if cached, err := mr.Get(key); err == nil && cached == want {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("cache key %q not written back to %q within 2s", key, want)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func newTestClient(t *testing.T, srvURL string) (*Client, *miniredis.Miniredis, func()) {
	t.Helper()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})

	signer, err := NewSigner(genTestEd25519(t))
	if err != nil {
		t.Fatalf("NewSigner: %v", err)
	}

	// 固定时钟 → JWT iat/exp 可预期
	cli := NewClient(httpclient.New(), rdb, srvURL, signer,
		WithClock(func() time.Time { return time.Unix(1_700_000_000, 0) }))

	cleanup := func() {
		_ = rdb.Close()
		mr.Close()
	}
	return cli, mr, cleanup
}

// ── Get ──────────────────────────────────────────────────────────────

func TestQWeatherClient_Get_CacheHit(t *testing.T) {
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(samplePayload))
	}))
	defer srv.Close()

	qwc, mr, cleanup := newTestClient(t, srv.URL)
	defer cleanup()

	ctx := logger.WithTraceID(context.Background(), "trace-1")
	// 预填缓存
	if err := mr.Set("qweather:test:hit", samplePayload); err != nil {
		t.Fatalf("miniredis.Set: %v", err)
	}

	got, err := qwc.Get(ctx, "/v7/weather/now",
		map[string]string{"location": "101010100"},
		"qweather:test:hit", time.Minute)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if string(got) != samplePayload {
		t.Errorf("got %q, want %q", got, samplePayload)
	}
	if atomic.LoadInt32(&hits) != 0 {
		t.Errorf("expected 0 HTTP hits on cache hit, got %d", hits)
	}
}

func TestQWeatherClient_Get_CacheMissFetches(t *testing.T) {
	var (
		hits     int32
		gotAuth  atomic.Value
		gotTrace atomic.Value
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		gotAuth.Store(r.Header.Get("Authorization"))
		gotTrace.Store(r.Header.Get("X-Trace-Id"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(samplePayload))
	}))
	defer srv.Close()

	qwc, mr, cleanup := newTestClient(t, srv.URL)
	defer cleanup()

	ctx := logger.WithTraceID(context.Background(), "trace-abc")
	got, err := qwc.Get(ctx, "/v7/weather/now",
		map[string]string{"location": "101010100", "foo": "bar"},
		"qweather:test:miss", time.Minute)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if string(got) != samplePayload {
		t.Errorf("payload = %q, want %q", got, samplePayload)
	}
	if atomic.LoadInt32(&hits) != 1 {
		t.Errorf("expected 1 HTTP hit, got %d", hits)
	}
	auth, _ := gotAuth.Load().(string)
	if auth == "" || auth[:7] != "Bearer " {
		t.Errorf("missing Bearer auth: %q", auth)
	}
	if got, _ := gotTrace.Load().(string); got != "trace-abc" {
		t.Errorf("trace_id = %q, want %q", got, "trace-abc")
	}

	// 缓存已被写回（异步 goroutine，轮询等待落盘）
	waitForCache(t, mr, "qweather:test:miss", samplePayload)
}

func TestQWeatherClient_Get_UpstreamError(t *testing.T) {
	// 5xx 重试耗尽后 body 仍须可读：502 定位全靠这条 ERROR 的状态码 + body 片段
	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(logger.NewTestHandler(&buf, slog.LevelDebug))
	t.Cleanup(func() { slog.SetDefault(prev) })

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"code":"500"}`))
	}))
	defer srv.Close()

	qwc, _, cleanup := newTestClient(t, srv.URL)
	defer cleanup()

	ctx := logger.WithTraceID(context.Background(), "trace-qw-500")
	_, err := qwc.Get(ctx, "/v7/weather/now",
		map[string]string{"location": "1"},
		"qweather:test:500", time.Minute)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, ErrUpstream) {
		t.Errorf("expected ErrUpstream, got %v", err)
	}

	logs := buf.String()
	for _, want := range []string{
		"qweather upstream non-2xx",
		`"status":500`,
		`{\"code\":\"500\"}`,
		"trace-qw-500",
	} {
		if !strings.Contains(logs, want) {
			t.Errorf("log missing %q; got: %s", want, logs)
		}
	}
}

func TestQWeatherClient_Get_NonRetryable4xxLogsBody(t *testing.T) {
	// 配额 429 / 鉴权 403 这类不可重试的 4xx 是线上最可能的 502 来源，
	// 必须留下状态码与 body（QWeather 的 code/message 在 body 里）
	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(logger.NewTestHandler(&buf, slog.LevelDebug))
	t.Cleanup(func() { slog.SetDefault(prev) })

	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = io.WriteString(w, `{"code":"429","message":"quota exceeded"}`)
	}))
	defer srv.Close()

	qwc, _, cleanup := newTestClient(t, srv.URL)
	defer cleanup()

	ctx := logger.WithTraceID(context.Background(), "trace-qw-429")
	_, err := qwc.Get(ctx, "/v7/weather/now",
		map[string]string{"location": "1"},
		"qweather:test:429", time.Minute)
	if err == nil || !errors.Is(err, ErrUpstream) {
		t.Fatalf("expected ErrUpstream, got %v", err)
	}
	if got := hits.Load(); got != 1 {
		t.Errorf("HTTP hits = %d, want 1 (4xx 不应重试)", got)
	}

	logs := buf.String()
	for _, want := range []string{
		"qweather upstream non-2xx",
		`"status":429`,
		"quota exceeded",
		"trace-qw-429",
	} {
		if !strings.Contains(logs, want) {
			t.Errorf("log missing %q; got: %s", want, logs)
		}
	}
}

func TestQWeatherClient_Get_NetworkError(t *testing.T) {
	// 构造一个立即关闭的服务端 → 客户端拿到 EOF / 连接错误
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hj, ok := w.(http.Hijacker)
		if !ok {
			t.Fatal("hijacker not supported")
		}
		conn, _, err := hj.Hijack()
		if err != nil {
			t.Fatal(err)
		}
		_ = conn.Close()
	}))
	defer srv.Close()

	qwc, _, cleanup := newTestClient(t, srv.URL)
	defer cleanup()

	_, err := qwc.Get(context.Background(), "/v7/weather/now",
		map[string]string{"location": "1"},
		"qweather:test:net", time.Minute)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, ErrUnavailable) {
		t.Errorf("expected ErrUnavailable, got %v", err)
	}
}

func TestQWeatherClient_Get_ContextCanceledStopsRetry(t *testing.T) {
	// 调用方（Python 钓鱼指数端点，10s 超时）中途断开 → 请求 ctx 取消。
	// 取消后重试必然同样失败，退避 sleep 纯属空烧，必须立刻收手。
	var hits atomic.Int32
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if hits.Add(1) == 1 {
			cancel()
		}
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"code":"500"}`))
	}))
	defer srv.Close()

	qwc, _, cleanup := newTestClient(t, srv.URL)
	defer cleanup()

	start := time.Now()
	_, err := qwc.Get(ctx, "/v7/weather/now",
		map[string]string{"location": "1"},
		"qweather:test:cancel", time.Minute)
	elapsed := time.Since(start)

	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if got := hits.Load(); got != 1 {
		t.Errorf("HTTP hits = %d, want 1 (ctx 取消后不应继续重试)", got)
	}
	if elapsed > time.Second {
		t.Errorf("elapsed = %v, want < 1s (ctx 取消后不应继续退避)", elapsed)
	}
}

func TestQWeatherClient_Get_JWTCached(t *testing.T) {
	var (
		hits int32
		jwts [2]string
	)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idx := atomic.AddInt32(&hits, 1) - 1
		if idx < 2 {
			jwts[idx] = r.Header.Get("Authorization")
		}
		w.WriteHeader(200)
		_, _ = io.WriteString(w, samplePayload)
	}))
	defer srv.Close()

	qwc, _, cleanup := newTestClient(t, srv.URL)
	defer cleanup()

	ctx := context.Background()
	for i := range 2 {
		_, err := qwc.Get(ctx, "/v7/weather/now",
			map[string]string{"location": "1"},
			fmt.Sprintf("qweather:test:jwt:%d", i), time.Minute)
		if err != nil {
			t.Fatalf("Get #%d: %v", i, err)
		}
	}

	if atomic.LoadInt32(&hits) != 2 {
		t.Fatalf("expected 2 HTTP hits, got %d", hits)
	}
	// 两次请求应复用同一个 JWT（redis 缓存）
	if jwts[0] == "" || jwts[0] != jwts[1] {
		t.Errorf("JWT not cached across calls: %q vs %q", jwts[0], jwts[1])
	}
}

// ── ResolveLocation ─────────────────────────────────────────────────

func TestQWeatherClient_ResolveLocation(t *testing.T) {
	qwc, _, cleanup := newTestClient(t, testBaseURL)
	defer cleanup()

	t.Run("LocationIDPreferred", func(t *testing.T) {
		loc := "fallback"
		id := "P2352"
		val, params, err := qwc.ResolveLocation(&loc, &id)
		if err != nil {
			t.Fatalf("err: %v", err)
		}
		if val != "P2352" {
			t.Errorf("val = %q, want P2352", val)
		}
		if params["location"] != "P2352" {
			t.Errorf("params.location = %q, want P2352", params["location"])
		}
	})

	t.Run("LocationOnly", func(t *testing.T) {
		loc := "116.40,39.90"
		val, params, err := qwc.ResolveLocation(&loc, nil)
		if err != nil {
			t.Fatalf("err: %v", err)
		}
		if val != "116.40,39.90" {
			t.Errorf("val = %q", val)
		}
		if params["location"] != "116.40,39.90" {
			t.Errorf("params.location = %q", params["location"])
		}
	})

	t.Run("BothNil", func(t *testing.T) {
		_, _, err := qwc.ResolveLocation(nil, nil)
		if !errors.Is(err, ErrInvalidLocation) {
			t.Errorf("expected ErrInvalidLocation, got %v", err)
		}
	})

	t.Run("BothEmpty", func(t *testing.T) {
		empty := ""
		_, _, err := qwc.ResolveLocation(&empty, &empty)
		if !errors.Is(err, ErrInvalidLocation) {
			t.Errorf("expected ErrInvalidLocation, got %v", err)
		}
	})

	t.Run("BothProvided_LocIDWins", func(t *testing.T) {
		loc := "should-be-ignored"
		id := "P9999"
		val, _, err := qwc.ResolveLocation(&loc, &id)
		if err != nil {
			t.Fatalf("err: %v", err)
		}
		if val != "P9999" {
			t.Errorf("locID should win, got val=%q", val)
		}
	})
}

// ── Client 字段接线 smoke test ───────────────────────────────────────

// TestQWeatherClient_Get_PathAndQuery 断言 base 尾斜杠被裁剪、path 与 params
// 正确拼接（NewClient 的 strings.TrimRight 是唯一的路径拼接守卫）。
func TestQWeatherClient_Get_PathAndQuery(t *testing.T) {
	var gotPath, gotQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotQuery = r.URL.Path, r.URL.Query().Get("type")
		w.WriteHeader(200)
		_, _ = io.WriteString(w, samplePayload)
	}))
	defer srv.Close()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	defer mr.Close()
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()

	signer, _ := NewSigner(genTestEd25519(t))
	// 刻意带尾斜杠，验证裁剪
	cli := NewClient(httpclient.New(), rdb, srv.URL+"/", signer)

	if _, err := cli.Get(context.Background(), "/geo/v2/poi/lookup",
		map[string]string{"type": "scenic"}, "k", time.Minute); err != nil {
		t.Fatalf("Get: %v", err)
	}
	if gotPath != "/geo/v2/poi/lookup" {
		t.Errorf("path = %q, want /geo/v2/poi/lookup", gotPath)
	}
	if gotQuery != "scenic" {
		t.Errorf("query type = %q, want scenic", gotQuery)
	}
}
