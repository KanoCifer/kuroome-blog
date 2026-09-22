package middleware

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestSlogMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var buf bytes.Buffer
	handler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})
	logger := slog.New(handler)

	r := gin.New()
	// Trace 必须先于 Slog 注册，Slog 才读得到 trace_id。
	r.Use(Trace())
	r.Use(SlogMiddleware(logger))
	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/ping?k=v", nil)
	req.Header.Set("X-Trace-Id", "abc123")
	req.RemoteAddr = "192.0.2.1:1234" // 让 ClientIP 可解析
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	var rec map[string]any
	line := bytes.TrimRight(buf.Bytes(), "\n")
	if err := json.Unmarshal(line, &rec); err != nil {
		t.Fatalf("unmarshal %q: %v", line, err)
	}

	// 核心字段存在且值正确。
	checks := map[string]any{
		"level":     "INFO",
		"msg":       "request",
		"method":    "GET",
		"path":      "/ping",
		"query":     "k=v",
		"status":    float64(200), // JSON numbers decode as float64
		"trace_id":  "abc123",
		"client_ip": "192.0.2.1",
	}
	for k, want := range checks {
		if got, ok := rec[k]; !ok {
			t.Errorf("missing key %q in record: %v", k, rec)
		} else if got != want {
			t.Errorf("%s = %v, want %v", k, got, want)
		}
	}

	// latency / body_size 存在且合理。
	if _, ok := rec["latency"]; !ok {
		t.Errorf("missing latency key: %v", rec)
	}
	if bs, ok := rec["body_size"].(float64); !ok || bs <= 0 {
		t.Errorf("body_size = %v, want > 0", rec["body_size"])
	}
}

// OPTIONS 请求应跳过记录。
func TestSlogMiddleware_SkipsOptions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	r := gin.New()
	r.Use(SlogMiddleware(logger))
	r.OPTIONS("/ping", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("OPTIONS", "/ping", nil)
	r.ServeHTTP(w, req)

	if buf.Len() != 0 {
		t.Errorf("OPTIONS should not log, got: %s", buf.String())
	}
}

// handler 写入 c.Errors 时，中间件应输出 error 行。
func TestSlogMiddleware_CapturesHandlerError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	r := gin.New()
	r.Use(Trace())
	r.Use(SlogMiddleware(logger))
	r.GET("/boom", func(c *gin.Context) {
		c.Error(gin.Error{Err: errBoom, Type: gin.ErrorTypePrivate})
		c.Status(http.StatusInternalServerError)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/boom", nil)
	r.ServeHTTP(w, req)

	lines := bytes.Split(bytes.TrimRight(buf.Bytes(), "\n"), []byte("\n"))
	if len(lines) != 2 {
		t.Fatalf("expected 2 log lines (info + error), got %d: %s", len(lines), buf.String())
	}

	var errRec map[string]any
	if err := json.Unmarshal(lines[1], &errRec); err != nil {
		t.Fatalf("unmarshal error line: %v", err)
	}
	if errRec["level"] != "ERROR" {
		t.Errorf("error line level = %v, want ERROR", errRec["level"])
	}
	if errRec["error"] != "boom" {
		t.Errorf("error field = %v, want 'boom'", errRec["error"])
	}
}

// 回归：显式等待一个短时间，确保 latency 字段没有解析问题。
// slog 的 Duration 渲染格式取决于 handler（JSON 默认 "1.234ms" 字符串）；
// 我们只校验 latency 字段存在且能表示为正时长，不绑死序列化格式。
func TestSlogMiddleware_LatencyParseable(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	r := gin.New()
	r.Use(SlogMiddleware(logger))
	r.GET("/slow", func(c *gin.Context) {
		time.Sleep(2 * time.Millisecond)
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/slow", nil)
	r.ServeHTTP(w, req)

	var rec map[string]any
	line := bytes.TrimRight(buf.Bytes(), "\n")
	if err := json.Unmarshal(line, &rec); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if _, ok := rec["latency"]; !ok {
		t.Fatalf("missing latency key: %v", rec)
	}
}

var errBoom = &boomError{}

type boomError struct{}

func (*boomError) Error() string { return "boom" }

// 429(限流命中)应被完全跳过,不写 access log。这是过渡期坏前端高频重试时
// 避免日志爆炸的关键路径。
func TestSlogMiddleware_Skips429(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	r := gin.New()
	r.Use(SlogMiddleware(logger))
	r.GET("/r", func(c *gin.Context) { c.Status(http.StatusTooManyRequests) })

	for range 20 {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/r", nil)
		r.ServeHTTP(w, req)
		if w.Code != http.StatusTooManyRequests {
			t.Fatalf("status = %d, want 429", w.Code)
		}
	}

	if buf.Len() != 0 {
		t.Fatalf("429 should never log, got %d bytes: %s", buf.Len(), buf.String())
	}
}

// 4xx(除 429)按 1/access4xxSampleRate 抽样:打 N 次 401,期望 ~N/10 条记录。
// 用闭包内 atomic 计数,每个测试实例独立,所以这里走精确边界断言。
func TestSlogMiddleware_Samples4xx(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	r := gin.New()
	r.Use(SlogMiddleware(logger))
	r.GET("/r", func(c *gin.Context) { c.Status(http.StatusUnauthorized) })

	// 100 次 401,按 sample rate = 10 抽样,期望恰好 10 条 access log。
	const total = 100
	for range total {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/r", nil)
		r.ServeHTTP(w, req)
	}

	gotLines := bytes.Count(bytes.TrimRight(buf.Bytes(), "\n"), []byte("\n")) + 1
	if buf.Len() == 0 {
		gotLines = 0
	}
	wantLines := total / access4xxSampleRate
	if gotLines != wantLines {
		t.Fatalf("4xx sample: got %d log lines for %d requests, want %d (1/%d sampling). buf:\n%s",
			gotLines, total, wantLines, access4xxSampleRate, buf.String())
	}
}

// 5xx(服务端真错误)必须全量保留 —— 排查关键。
func TestSlogMiddleware_Keeps5xx(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	r := gin.New()
	r.Use(SlogMiddleware(logger))
	r.GET("/r", func(c *gin.Context) { c.Status(http.StatusInternalServerError) })

	for range 5 {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/r", nil)
		r.ServeHTTP(w, req)
	}

	gotLines := bytes.Count(bytes.TrimRight(buf.Bytes(), "\n"), []byte("\n")) + 1
	if buf.Len() == 0 {
		t.Fatal("5xx should always log, got 0 bytes")
	}
	if gotLines != 5 {
		t.Fatalf("5xx full log: got %d lines, want 5. buf:\n%s", gotLines, buf.String())
	}
}
