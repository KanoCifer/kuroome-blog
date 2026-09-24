package weather

import (
	"context"
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/infra/qweather"
)

// ── shared fixtures ─────────────────────────────────────────────────

func newTestWeatherService(t *testing.T, srvURL string) (*QueryService, *miniredis.Miniredis) {
	t.Helper()

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})

	_, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("GenerateKey: %v", err)
	}
	pkcs8, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		t.Fatalf("MarshalPKCS8PrivateKey: %v", err)
	}
	pemStr := string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: pkcs8}))
	signer, err := qweather.NewSigner(pemStr)
	if err != nil {
		t.Fatalf("NewSigner: %v", err)
	}

	svc := NewQueryService(
		httpclient.New(),
		rdb,
		config.WeatherConfig{QweatherBaseURL: srvURL},
		signer,
	)

	return svc, mr
}

func newCapturingServer(t *testing.T, hits *atomic.Int32, body string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
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

// ── GetTide ─────────────────────────────────────────────────────────

func TestQueryService_GetTide_CacheHit(t *testing.T) {
	var hits atomic.Int32
	srv := newCapturingServer(t, &hits, `{"code":"200"}`)
	svc, mr := newTestWeatherService(t, srv.URL)
	t.Cleanup(func() { mr.Close() })

	cacheKey := "qweather:tide:P2352:20260115"
	if err := mr.Set(cacheKey, `{"cached":true}`); err != nil {
		t.Fatalf("miniredis.Set: %v", err)
	}

	data, hit, err := svc.GetTide(context.Background(), "P2352", "20260115")
	if err != nil {
		t.Fatalf("GetTide: %v", err)
	}
	if !hit {
		t.Error("expected hit=true on cache hit")
	}
	if string(data) != `{"cached":true}` {
		t.Errorf("data = %q, want %q", data, `{"cached":true}`)
	}
	if hits.Load() != 0 {
		t.Errorf("expected 0 upstream calls, got %d", hits.Load())
	}
}

func TestQueryService_GetTide_CacheMiss_FetchesUpstream(t *testing.T) {
	hits := atomic.Int32{}
	srv := newCapturingServer(t, &hits, `{"code":"200","data":[1,2,3]}`)
	svc, mr := newTestWeatherService(t, srv.URL)
	t.Cleanup(func() { mr.Close() })

	data, hit, err := svc.GetTide(context.Background(), "P2352", "20260115")
	if err != nil {
		t.Fatalf("GetTide: %v", err)
	}
	if hit {
		t.Error("expected hit=false on cache miss")
	}
	if string(data) != `{"code":"200","data":[1,2,3]}` {
		t.Errorf("unexpected data: %s", data)
	}
	if hits.Load() != 1 {
		t.Errorf("expected 1 upstream call, got %d", hits.Load())
	}

	// 缓存写回（异步 goroutine，轮询等待落盘）
	waitForCache(t, mr, "qweather:tide:P2352:20260115", `{"code":"200","data":[1,2,3]}`)
}

// ── GetCurrent ──────────────────────────────────────────────────────

func TestQueryService_GetCurrent_PathAndParams(t *testing.T) {
	var gotPath atomic.Value
	var gotQuery atomic.Value
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath.Store(r.URL.Path)
		gotQuery.Store(r.URL.RawQuery)
		w.Write([]byte(`{"now":{"temp":"25"}}`))
	}))
	defer srv.Close()

	svc, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	loc := "116.40,39.90"
	data, err := svc.GetCurrent(context.Background(), &loc, nil)
	if err != nil {
		t.Fatalf("GetCurrent: %v", err)
	}
	if !strings.Contains(string(data), `"temp":"25"`) {
		t.Errorf("unexpected data: %s", data)
	}
	if p, _ := gotPath.Load().(string); p != "/v7/weather/now" {
		t.Errorf("path = %q, want /v7/weather/now", p)
	}
	if q, _ := gotQuery.Load().(string); !strings.Contains(q, "location=116.40%2C39.90") {
		t.Errorf("query missing location: %q", q)
	}
}

// ── GetHourly ───────────────────────────────────────────────────────

func TestQueryService_GetHourly_PathIncludesHours(t *testing.T) {
	var gotPath atomic.Value
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath.Store(r.URL.Path)
		w.Write([]byte(`{"hourly":[]}`))
	}))
	defer srv.Close()

	svc, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	loc := "116.40,39.90"
	if _, err := svc.GetHourly(context.Background(), 24, &loc, nil); err != nil {
		t.Fatalf("GetHourly: %v", err)
	}
	if p, _ := gotPath.Load().(string); p != "/v7/weather/24h" {
		t.Errorf("path = %q, want /v7/weather/24h", p)
	}
}

// ── GetForecast ─────────────────────────────────────────────────────

func TestQueryService_GetForecast_PathAndCacheKey(t *testing.T) {
	var gotPath atomic.Value
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath.Store(r.URL.Path)
		w.Write([]byte(`{"daily":[]}`))
	}))
	defer srv.Close()

	svc, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	id := "P2352"
	if _, err := svc.GetForecast(context.Background(), 3, nil, &id); err != nil {
		t.Fatalf("GetForecast: %v", err)
	}
	if p, _ := gotPath.Load().(string); p != "/v7/weather/3d" {
		t.Errorf("path = %q, want /v7/weather/3d", p)
	}
	// 缓存 key 必须包含 days 后缀（避免 3d / 7d 命中同一 key）；
	// 写回是异步 goroutine，轮询等待落盘。
	waitForCache(t, mr, "qweather:forecast:P2352:3d", `{"daily":[]}`)
}

// ── GetIndices ──────────────────────────────────────────────────────

func TestQueryService_GetIndices_TypeAdded(t *testing.T) {
	var gotQuery atomic.Value
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery.Store(r.URL.RawQuery)
		w.Write([]byte(`{"daily":[]}`))
	}))
	defer srv.Close()

	svc, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	loc := "116.40,39.90"
	if _, err := svc.GetIndices(context.Background(), &loc, nil); err != nil {
		t.Fatalf("GetIndices: %v", err)
	}
	q, _ := gotQuery.Load().(string)
	if !strings.Contains(q, "type=4") {
		t.Errorf("query missing type=4: %q", q)
	}
	if !strings.Contains(q, "location=116.40%2C39.90") {
		t.Errorf("query missing location: %q", q)
	}
}

// ── GetNearbyTSTA ───────────────────────────────────────────────────

func TestQueryService_GetNearbyTSTA_FirstID(t *testing.T) {
	srv := newCapturingServer(t, &atomic.Int32{}, `{"poi":[{"id":"P9999","name":"X"},{"id":"P8888"}]}`)
	svc, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	info, err := svc.GetNearbyTSTA(context.Background(), "116.40,39.90")
	if err != nil {
		t.Fatalf("GetNearbyTSTA: %v", err)
	}
	if info["id"] != "P9999" {
		t.Errorf("id = %q, want P9999 (first POI)", info["id"])
	}
}

func TestQueryService_GetNearbyTSTA_EmptyPOI(t *testing.T) {
	srv := newCapturingServer(t, &atomic.Int32{}, `{"poi":[]}`)
	svc, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	info, err := svc.GetNearbyTSTA(context.Background(), "0,0")
	if err != nil {
		t.Fatalf("GetNearbyTSTA: %v", err)
	}
	if len(info) != 0 {
		t.Errorf("expected empty map, got %+v", info)
	}
}
