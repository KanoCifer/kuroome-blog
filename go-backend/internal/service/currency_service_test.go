package service

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

// ── shared fixtures ─────────────────────────────────────────────────

// newTestCurrencyService 构造一个指向 srvURL 的 CurrencyService（redis 可 nil）。
func newTestCurrencyService(t *testing.T, srvURL string, rdb *redis.Client) *CurrencyService {
	t.Helper()
	return NewCurrencyService(httpclient.New(), rdb, WithBaseURL(srvURL))
}

func newMiniredis(t *testing.T) (*redis.Client, *miniredis.Miniredis) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { mr.Close() })
	return rdb, mr
}

// currencyStatusServer 返回一个固定状态码的测试服务端。
func currencyStatusServer(t *testing.T, status int) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
	}))
	t.Cleanup(srv.Close)
	return srv
}

const currencySample = `{"timestamp":1700000000,"base":"USD","rates":{"CNY":7.2}}`

// currencyCacheKey 复刻 CurrencyService.GetExchange 的 key 推导
// （currency:{base}:{YYYY/MM/DD}）。写死日期会让测试在次日必红 —— 生产代码按
// 当天日期分桶，隔天 key 就换了。
func currencyCacheKey(base string) string {
	return fmt.Sprintf("currency:%s:%s", base, time.Now().Format("2006/01/02"))
}

// ── GetExchange（缓存 + 反序列化）────────────────────────────────────

func TestCurrencyService_GetExchange_CacheHit_NoUpstream(t *testing.T) {
	rdb, mr := newMiniredis(t)
	srvHits := atomic.Int32{}
	srv := newCapturingServer(t, &srvHits, currencySample)

	svc := newTestCurrencyService(t, srv.URL, rdb)

	// 预置缓存：key 为 currency:{base}:{YYYY/MM/DD}
	if err := mr.Set(currencyCacheKey("USD"), currencySample); err != nil {
		t.Fatalf("miniredis.Set: %v", err)
	}

	res, err := svc.GetExchange(context.Background(), "USD")
	if err != nil {
		t.Fatalf("GetExchange: %v", err)
	}
	if res.Base != "USD" || res.Rates["CNY"] != 7.2 {
		t.Errorf("res = %+v, want base=USD rates.CNY=7.2", res)
	}
	if srvHits.Load() != 0 {
		t.Errorf("expected 0 upstream calls, got %d", srvHits.Load())
	}
}

func TestCurrencyService_GetExchange_CacheMiss_FetchesAndWritesBack(t *testing.T) {
	rdb, mr := newMiniredis(t)
	srvHits := atomic.Int32{}
	srv := newCapturingServer(t, &srvHits, currencySample)

	svc := newTestCurrencyService(t, srv.URL, rdb)

	res, err := svc.GetExchange(context.Background(), "USD")
	if err != nil {
		t.Fatalf("GetExchange: %v", err)
	}
	if res.Base != "USD" || res.Rates["CNY"] != 7.2 {
		t.Errorf("res = %+v, want base=USD rates.CNY=7.2", res)
	}
	if srvHits.Load() != 1 {
		t.Errorf("expected 1 upstream call, got %d", srvHits.Load())
	}

	// 异步写回缓存：轮询等待落盘
	waitForCache(t, mr, currencyCacheKey("USD"), currencySample)
}

func TestCurrencyService_GetExchange_InvalidJSON(t *testing.T) {
	rdb, _ := newMiniredis(t)
	srvHits := atomic.Int32{}
	srv := newCapturingServer(t, &srvHits, `not-json`)

	svc := newTestCurrencyService(t, srv.URL, rdb)

	_, err := svc.GetExchange(context.Background(), "USD")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "json unmarshal failed") {
		t.Errorf("err = %v, want unmarshal wrapping", err)
	}
}

// ── getExchangeRaw（HTTP 层）─────────────────────────────────────────

func TestCurrencyService_GetExchangeRaw_CacheHit_NoUpstream(t *testing.T) {
	rdb, mr := newMiniredis(t)
	srvHits := atomic.Int32{}
	srv := newCapturingServer(t, &srvHits, currencySample)

	svc := newTestCurrencyService(t, srv.URL, rdb)
	if err := mr.Set(currencyCacheKey("USD"), currencySample); err != nil {
		t.Fatalf("miniredis.Set: %v", err)
	}

	raw, err := svc.getExchangeRaw(context.Background(), "USD", currencyCacheKey("USD"), time.Hour)
	if err != nil {
		t.Fatalf("getExchangeRaw: %v", err)
	}
	if string(raw) != currencySample {
		t.Errorf("raw = %q, want %q", raw, currencySample)
	}
	if srvHits.Load() != 0 {
		t.Errorf("expected 0 upstream calls, got %d", srvHits.Load())
	}
}

func TestCurrencyService_GetExchangeRaw_UpstreamError(t *testing.T) {
	rdb, _ := newMiniredis(t)
	srv := currencyStatusServer(t, 404)

	svc := newTestCurrencyService(t, srv.URL, rdb)

	_, err := svc.getExchangeRaw(context.Background(), "USD", currencyCacheKey("USD"), time.Hour)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "status=404") {
		t.Errorf("err = %v, want status=404", err)
	}
}

func TestCurrencyService_GetExchangeRaw_NoRedis_SkipsCache(t *testing.T) {
	srvHits := atomic.Int32{}
	srv := newCapturingServer(t, &srvHits, currencySample)

	svc := newTestCurrencyService(t, srv.URL, nil)

	raw, err := svc.getExchangeRaw(context.Background(), "USD", currencyCacheKey("USD"), time.Hour)
	if err != nil {
		t.Fatalf("getExchangeRaw: %v", err)
	}
	if string(raw) != currencySample {
		t.Errorf("raw = %q, want %q", raw, currencySample)
	}
	if srvHits.Load() != 1 {
		t.Errorf("expected 1 upstream call, got %d", srvHits.Load())
	}
}

// TestCurrencyService_GetExchangeRaw_SendsBaseQuery 回归：base 必须作为 query
// 参数发到上游。此前只改 req.URL.Query() 的副本未写回 RawQuery，请求恒为无参，
// 上游默认按 USD 返回，导致任意 base 都拿到 USD 汇率。
func TestCurrencyService_GetExchangeRaw_SendsBaseQuery(t *testing.T) {
	gotBase := make(chan string, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotBase <- r.URL.Query().Get("base")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(currencySample))
	}))
	t.Cleanup(srv.Close)

	svc := newTestCurrencyService(t, srv.URL, nil)

	if _, err := svc.getExchangeRaw(context.Background(), "CNY", currencyCacheKey("CNY"), time.Hour); err != nil {
		t.Fatalf("getExchangeRaw: %v", err)
	}

	select {
	case base := <-gotBase:
		if base != "CNY" {
			t.Errorf("upstream base = %q, want %q", base, "CNY")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("upstream did not receive a request within 2s")
	}
}
