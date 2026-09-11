package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/service"
	"github.com/KanoCifer/kuroome-blog/internal/service/nomu"
)

// ---------- mock DesignGenerator ----------

type mockDesignService struct {
	generateFn func(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error)
}

var _ DesignGenerator = (*mockDesignService)(nil)

func (m *mockDesignService) Generate(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error) {
	if m.generateFn != nil {
		return m.generateFn(ctx, req)
	}
	return nil, nil
}

// newDesignTestServer 起一个挂好 /v3/design/generate 的测试路由。
// 注入的 auth 中间件模拟真实鉴权：带 X-Test-User 头视为已登录并写入 user_id。
func newDesignTestServer(t *testing.T, svc DesignGenerator) *gin.Engine {
	t.Helper()
	r := gin.New()
	v3 := r.Group("/v3")
	auth := func(c *gin.Context) {
		if c.GetHeader("X-Test-User") == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "unauthorized"})
			return
		}
		c.Set("user_id", 1)
		c.Next()
	}
	NewDesignHandler(svc).RegisterRoutes(v3, auth)
	return r
}

func doDesignRequest(t *testing.T, r *gin.Engine, body string, user string) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/v3/design/generate", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	if user != "" {
		req.Header.Set("X-Test-User", user)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response %q: %v", w.Body.String(), err)
	}
	return w, resp
}

func TestDesignGenerateSuccess(t *testing.T) {
	var gotReq nomu.GenerateRequest
	svc := &mockDesignService{generateFn: func(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error) {
		gotReq = req
		return &nomu.GenerateResult{
			Model: "doubao-seedream-5-0-260128",
			Images: []nomu.GeneratedImage{
				{Index: 0, Size: "1760x2368", URL: "https://ark.example/img/1.jpeg"},
			},
			Usage:   nomu.GenerateUsage{GeneratedImages: 1, OutputTokens: 16280, TotalTokens: 16280},
			Created: 1757323224,
		}, nil
	}}
	r := newDesignTestServer(t, svc)

	w, resp := doDesignRequest(t, r,
		`{"prompt":"一只猫","model":"Doubao-Seedream-5.0-lite","size":"1760x2368"}`, "1")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
	}
	if gotReq.Prompt != "一只猫" || gotReq.Model != "Doubao-Seedream-5.0-lite" || gotReq.Size != "1760x2368" {
		t.Errorf("service got %+v", gotReq)
	}

	data, _ := resp["data"].(map[string]any)
	if data == nil || data["model"] != "doubao-seedream-5-0-260128" {
		t.Fatalf("data = %v, want model passthrough", resp["data"])
	}
	images, _ := data["images"].([]any)
	if len(images) != 1 {
		t.Fatalf("images = %v, want 1", images)
	}
	img, _ := images[0].(map[string]any)
	if img["url"] != "https://ark.example/img/1.jpeg" {
		t.Errorf("image url = %v", img["url"])
	}
}

func TestDesignGenerateImage2Image(t *testing.T) {
	svc := &mockDesignService{generateFn: func(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error) {
		if len(req.Images) != 2 {
			t.Errorf("images = %v, want 2 refs", req.Images)
		}
		return &nomu.GenerateResult{Model: "doubao-seedream-5-0-pro-260628"}, nil
	}}
	r := newDesignTestServer(t, svc)

	w, _ := doDesignRequest(t, r,
		`{"prompt":"赛博朋克风","images":["https://a/1.jpg","https://a/2.jpg"]}`, "1")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
	}
}

func TestDesignGenerateBadRequest(t *testing.T) {
	r := newDesignTestServer(t, &mockDesignService{
		generateFn: func(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error) {
			t.Error("service should not be called")
			return nil, nil
		},
	})

	// prompt 缺失 → binding 校验拦截
	w, _ := doDesignRequest(t, r, `{"model":"x"}`, "1")
	if w.Code != http.StatusBadRequest {
		t.Errorf("missing prompt: status = %d, want 400", w.Code)
	}

	// 非法 JSON
	w, _ = doDesignRequest(t, r, `{`, "1")
	if w.Code != http.StatusBadRequest {
		t.Errorf("invalid json: status = %d, want 400", w.Code)
	}
}

func TestDesignGenerateServiceErrors(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want int
	}{
		{"empty prompt", nomu.ErrEmptyPrompt, 400},
		{"unknown model", nomu.ErrUnknownModel, 400},
		{"upstream", nomu.ErrUpstream, 502},
		{"unexpected", errors.New("boom"), 500},
		// 余额不足：service 层双 %w 包装（ErrCredit + ErrInsufficientBalance）→ 402
		{"insufficient balance", fmt.Errorf("%w: %w", nomu.ErrCredit, service.ErrInsufficientBalance), 402},
		// 非法幂等键（超长/保留前缀）→ 400 客户端错误，不落 500
		{"invalid biz id", fmt.Errorf("%w: %w", nomu.ErrCredit, service.ErrInvalidBizID), 400},
		// 其它计费错误（无定价/DB 故障）→ 500，不落 402
		{"credit config error", fmt.Errorf("%w: %w", nomu.ErrCredit, service.ErrPriceNotFound), 500},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc := &mockDesignService{generateFn: func(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error) {
				return nil, tc.err
			}}
			r := newDesignTestServer(t, svc)
			w, _ := doDesignRequest(t, r, `{"prompt":"x"}`, "1")
			if w.Code != tc.want {
				t.Errorf("status = %d, want %d", w.Code, tc.want)
			}
		})
	}
}

// Idempotency-Key 头透传到 service 层请求。
func TestDesignGenerateForwardsIdempotencyKey(t *testing.T) {
	var gotReq nomu.GenerateRequest
	svc := &mockDesignService{generateFn: func(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error) {
		gotReq = req
		return &nomu.GenerateResult{Model: "m", Images: []nomu.GeneratedImage{{Index: 0}}}, nil
	}}
	r := newDesignTestServer(t, svc)

	req := httptest.NewRequest(http.MethodPost, "/v3/design/generate",
		bytes.NewBufferString(`{"prompt":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", "1")
	req.Header.Set("Idempotency-Key", "key-123")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body=%s", w.Code, w.Body.String())
	}
	if gotReq.IdempotencyKey != "key-123" {
		t.Errorf("service got %+v, want IdempotencyKey=key-123", gotReq)
	}
}

func TestDesignGenerateUnauthorized(t *testing.T) {
	r := newDesignTestServer(t, &mockDesignService{
		generateFn: func(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error) {
			t.Error("service should not be called when unauthorized")
			return nil, nil
		},
	})

	w, _ := doDesignRequest(t, r, `{"prompt":"x"}`, "")
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

// response_format 从 DTO 透传到 service。
func TestDesignGenerateForwardsResponseFormat(t *testing.T) {
	var got nomu.GenerateRequest
	svc := &mockDesignService{generateFn: func(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error) {
		got = req
		return &nomu.GenerateResult{Model: "m"}, nil
	}}
	w, _ := doDesignRequest(t, newDesignTestServer(t, svc), `{"prompt":"x","response_format":"url"}`, "1")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
	}
	if got.ResponseFormat != "url" {
		t.Errorf("response_format = %q, want url", got.ResponseFormat)
	}
}
