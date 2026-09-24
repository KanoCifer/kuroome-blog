package weather

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/infra/qweather"
)

// ── GetFullWeatherData ──────────────────────────────────────────────

// stubUpstream 按 path 分发 mock payload；用于 GetFullWeatherData 的组合测试。
type stubUpstream struct {
	paths map[string]string // path → payload
	hits  map[string]*atomic.Int32
}

func (s *stubUpstream) handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h, ok := s.hits[r.URL.Path]; ok {
			h.Add(1)
		}
		payload, ok := s.paths[r.URL.Path]
		if !ok {
			http.Error(w, `{"code":"404"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(payload))
	})
}

func TestFullWeatherService_HappyPath(t *testing.T) {
	hits := map[string]*atomic.Int32{
		"/geo/v2/poi/lookup": new(atomic.Int32),
		"/v7/weather/now":    new(atomic.Int32),
		"/v7/weather/24h":    new(atomic.Int32),
		"/v7/weather/3d":     new(atomic.Int32),
		"/v7/ocean/tide":     new(atomic.Int32),
		"/v7/indices/1d":     new(atomic.Int32),
	}
	stub := &stubUpstream{
		paths: map[string]string{
			"/geo/v2/poi/lookup": `{"poi":[{"id":"P2352","name":"港口A"}]}`,
			"/v7/weather/now":    `{"now":{"temp":"25"}}`,
			"/v7/weather/24h":    `{"hourly":[]}`,
			"/v7/weather/3d":     `{"daily":[]}`,
			"/v7/ocean/tide":     `{"tide":[]}`,
			"/v7/indices/1d":     `{"daily":[]}`,
		},
		hits: hits,
	}
	srv := httptest.NewServer(stub.handler())
	defer srv.Close()

	query, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	out, err := NewFullWeatherService(query).GetFullWeatherData(context.Background(), "116.40,39.90")
	if err != nil {
		t.Fatalf("GetFullWeatherData: %v", err)
	}
	if out == nil {
		t.Fatal("expected non-nil FullWeatherData")
	}
	if out.LocationName != "港口A" {
		t.Errorf("LocationName = %q", out.LocationName)
	}
	if out.POIID != "P2352" {
		t.Errorf("POIID = %q", out.POIID)
	}
	if string(out.Current) != `{"now":{"temp":"25"}}` {
		t.Errorf("Current = %s", out.Current)
	}
	if string(out.Tide) != `{"tide":[]}` {
		t.Errorf("Tide = %s", out.Tide)
	}

	// 5 个 endpoint + 至少一次 POI lookup 都被调用
	// 注意 POI lookup 在 POI 阶段 + 后续 GetNearbyTSTA 阶段会被打两次，
	// 所以单独验证 path 总数 ≥ 5。
	total := int32(0)
	for _, h := range hits {
		total += h.Load()
	}
	if total < 5 {
		t.Errorf("expected ≥5 upstream calls, got %d", total)
	}
}

func TestFullWeatherService_NoPOI_ErrUpstream(t *testing.T) {
	stub := &stubUpstream{
		paths: map[string]string{
			"/geo/v2/poi/lookup": `{"poi":[]}`,
		},
		hits: map[string]*atomic.Int32{"/geo/v2/poi/lookup": new(atomic.Int32)},
	}
	srv := httptest.NewServer(stub.handler())
	defer srv.Close()

	query, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	_, err := NewFullWeatherService(query).GetFullWeatherData(context.Background(), "0,0")
	if !errors.Is(err, qweather.ErrUpstream) {
		t.Errorf("expected ErrUpstream, got %v", err)
	}
}

func TestFullWeatherService_TSTAFailure_FallsBackToP2352(t *testing.T) {
	hits := map[string]*atomic.Int32{
		"/geo/v2/poi/lookup": new(atomic.Int32),
		"/v7/weather/now":    new(atomic.Int32),
		"/v7/weather/24h":    new(atomic.Int32),
		"/v7/weather/3d":     new(atomic.Int32),
		"/v7/ocean/tide":     new(atomic.Int32),
		"/v7/indices/1d":     new(atomic.Int32),
	}
	stub := &stubUpstream{
		paths: map[string]string{
			// 第一次调用（POI scenic）：返回有效 POI
			// 第二次调用（TSTA 查找）：返回 404 → GetNearbyTSTA 抛 ErrUpstream，
			// GetFullWeatherData 走 fallback → 用 P2352 取潮汐
			"/geo/v2/poi/lookup": ``, // 仅用 hits 计数；handler 内分别处理
			"/v7/weather/now":    `{"now":{}}`,
			"/v7/weather/24h":    `{"hourly":[]}`,
			"/v7/weather/3d":     `{"daily":[]}`,
			"/v7/ocean/tide":     `{"tide":[]}`,
			"/v7/indices/1d":     `{"daily":[]}`,
		},
		hits: hits,
	}
	// 区分两次 POI 调用：第一次 scenic 成功，第二次 TSTA 失败
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits[r.URL.Path].Add(1)
		q := r.URL.Query()
		switch r.URL.Path {
		case "/geo/v2/poi/lookup":
			if q.Get("type") == "TSTA" {
				http.Error(w, `{"code":"404"}`, http.StatusNotFound)
				return
			}
			// scenic 走默认 stub
			if stub.paths[r.URL.Path] != "" {
				w.Write([]byte(stub.paths[r.URL.Path]))
				return
			}
			w.Write([]byte(`{"poi":[{"id":"P7777","name":"主港"}]}`))
		default:
			w.Write([]byte(stub.paths[r.URL.Path]))
		}
	}))
	defer srv.Close()

	query, mr := newTestWeatherService(t, srv.URL)
	defer mr.Close()

	out, err := NewFullWeatherService(query).GetFullWeatherData(context.Background(), "116.40,39.90")
	if err != nil {
		t.Fatalf("GetFullWeatherData should not fail when TSTA fails: %v", err)
	}
	if out.POIID != "P7777" {
		t.Errorf("POIID = %q, want P7777 (from scenic POI)", out.POIID)
	}
	// 潮汐必须仍被取到（fallback harbor P2352）
	if len(out.Tide) == 0 {
		t.Error("expected tide data via P2352 fallback")
	}
}

// ── FullWeatherData JSON shape ──────────────────────────────────────

func TestFullWeatherService_MockCompletionOrderAndFallback(t *testing.T) {
	var tideHarbor string
	query := &mockWeatherQuery{
		tstaErr: errors.New("TSTA unavailable"),
		delays:  map[string]time.Duration{"poi": 10 * time.Millisecond, "current": 50 * time.Millisecond, "hourly": 40 * time.Millisecond, "daily": 30 * time.Millisecond, "tide": 20 * time.Millisecond},
		getTide: func(_ context.Context, harbor, _ string) (json.RawMessage, bool, error) {
			tideHarbor = harbor
			return json.RawMessage(`{"tide":[]}`), false, nil
		},
	}
	out, err := NewFullWeatherService(query).GetFullWeatherData(context.Background(), "loc")
	if err != nil {
		t.Fatalf("GetFullWeatherData: %v", err)
	}
	if tideHarbor != "P2352" {
		t.Errorf("tide harbor = %q, want P2352", tideHarbor)
	}
	if string(out.Current) != `{"kind":"current"}` || string(out.Hourly) != `{"kind":"hourly"}` || string(out.Daily) != `{"kind":"daily"}` || string(out.Tide) != `{"tide":[]}` || string(out.Indices) != `{"kind":"indices"}` {
		t.Errorf("results not assigned by kind: %+v", out)
	}
}

func TestFullWeatherService_MockPOIFailureIsFatal(t *testing.T) {
	poiErr := errors.New("POI failed")
	out, err := NewFullWeatherService(&mockWeatherQuery{poiErr: poiErr}).GetFullWeatherData(context.Background(), "loc")
	if !errors.Is(err, poiErr) || out != nil {
		t.Fatalf("out=%v err=%v, want fatal POI error", out, err)
	}
}

type mockWeatherQuery struct {
	poiErr  error
	tstaErr error
	delays  map[string]time.Duration
	getTide func(context.Context, string, string) (json.RawMessage, bool, error)
}

func (m *mockWeatherQuery) wait(kind string) {
	if d := m.delays[kind]; d > 0 {
		time.Sleep(d)
	}
}
func (m *mockWeatherQuery) GetPOI(context.Context, string) (json.RawMessage, error) {
	m.wait("poi")
	if m.poiErr != nil {
		return nil, m.poiErr
	}
	return json.RawMessage(`{"poi":[{"id":"P1","name":"mock"}]}`), nil
}
func (m *mockWeatherQuery) GetNearbyTSTA(context.Context, string) (map[string]string, error) {
	if m.tstaErr != nil {
		return nil, m.tstaErr
	}
	return map[string]string{"id": "TSTA1"}, nil
}
func (m *mockWeatherQuery) GetCurrent(context.Context, *string, *string) (json.RawMessage, error) {
	m.wait("current")
	return json.RawMessage(`{"kind":"current"}`), nil
}
func (m *mockWeatherQuery) GetHourly(context.Context, int, *string, *string) (json.RawMessage, error) {
	m.wait("hourly")
	return json.RawMessage(`{"kind":"hourly"}`), nil
}
func (m *mockWeatherQuery) GetForecast(context.Context, int, *string, *string) (json.RawMessage, error) {
	m.wait("daily")
	return json.RawMessage(`{"kind":"daily"}`), nil
}
func (m *mockWeatherQuery) GetTide(ctx context.Context, harbor, date string) (json.RawMessage, bool, error) {
	m.wait("tide")
	if m.getTide != nil {
		return m.getTide(ctx, harbor, date)
	}
	return json.RawMessage(`{"kind":"tide"}`), false, nil
}
func (m *mockWeatherQuery) GetIndices(context.Context, *string, *string) (json.RawMessage, error) {
	m.wait("indices")
	return json.RawMessage(`{"kind":"indices"}`), nil
}

func TestFullWeatherData_JSONShape(t *testing.T) {
	out := dto.FullWeatherData{Current: json.RawMessage(`{"now":{}}`), Hourly: json.RawMessage(`{"hourly":[]}`), Daily: json.RawMessage(`{"daily":[]}`), Tide: json.RawMessage(`{"tide":[]}`), Indices: json.RawMessage(`{"daily":[]}`), LocationName: "港口A", POIID: "P2352"}
	b, err := json.Marshal(out)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	for _, key := range []string{`"current":`, `"hourly":`, `"daily":`, `"tide":`, `"indices":`, `"locationName":"港口A"`, `"poiId":"P2352"`} {
		if !strings.Contains(string(b), key) {
			t.Errorf("JSON missing %s: %s", key, b)
		}
	}
}
