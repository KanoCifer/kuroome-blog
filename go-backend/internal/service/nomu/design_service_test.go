package nomu

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

// newTestService 起一个伪方舟上游：/api/v3/images/generations 收生成请求。
// generate 里可用 srvURL 拼结果图的 URL。
func newTestService(t *testing.T, generate func(w http.ResponseWriter, r *http.Request, srvURL string)) (*DesignService, *httptest.Server) {
	t.Helper()
	var srvURL string
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/images/generations", func(w http.ResponseWriter, r *http.Request) {
		generate(w, r, srvURL)
	})
	srv := httptest.NewServer(mux)
	srvURL = srv.URL
	t.Cleanup(srv.Close)

	svc := NewDesignService(httpclient.New(), "test-key", WithBaseURL(srv.URL+"/api/v3/images/generations"))
	return svc, srv
}

func TestGenerateText2Image(t *testing.T) {
	var gotAuth string
	var gotPayload map[string]any
	svc, srv := newTestService(t, func(w http.ResponseWriter, r *http.Request, srvURL string) {
		gotAuth = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Errorf("decode request: %v", err)
		}
		json.NewEncoder(w).Encode(map[string]any{
			"model":   "doubao-seedream-5-0-260128",
			"created": 1757323224,
			"data": []map[string]any{
				{"url": srvURL + "/blob/1", "size": "1024x1024"},
			},
			"usage": map[string]any{"generated_images": 1, "output_tokens": 16280, "total_tokens": 16280},
		})
	})

	res, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "一只猫"})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if gotAuth != "Bearer test-key" {
		t.Errorf("Authorization = %q, want Bearer test-key", gotAuth)
	}
	if _, ok := gotPayload["image"]; ok {
		t.Errorf("text2image payload should not contain image: %v", gotPayload)
	}
	if _, ok := gotPayload["images"]; ok {
		t.Errorf("text2image payload should not contain images: %v", gotPayload)
	}
	if len(res.Images) != 1 {
		t.Fatalf("got %d images, want 1", len(res.Images))
	}
	if res.Images[0].URL != srv.URL+"/blob/1" {
		t.Errorf("image url = %q, want %q", res.Images[0].URL, srv.URL+"/blob/1")
	}
	if res.Usage.TotalTokens != 16280 || res.Usage.GeneratedImages != 1 {
		t.Errorf("usage = %+v, want parsed from response", res.Usage)
	}
	if res.Created != 1757323224 {
		t.Errorf("created = %d, want 1757323224", res.Created)
	}
}

func TestGenerateImage2Image(t *testing.T) {
	var gotPayload map[string]any
	svc, _ := newTestService(t, func(w http.ResponseWriter, r *http.Request, srvURL string) {
		json.NewDecoder(r.Body).Decode(&gotPayload)
		json.NewEncoder(w).Encode(map[string]any{
			"model": "doubao-seedream-5-0-pro-260628",
			"data": []map[string]any{
				{"url": srvURL + "/blob/1", "size": "2048x2048"},
			},
		})
	})

	_, err := svc.Generate(context.Background(), GenerateRequest{
		Prompt: "改成赛博朋克风",
		Model:  "Doubao-Seedream-5.0-pro",
		Size:   "2048x2048",
		Images: []string{"https://example.com/ref1.jpg", "https://example.com/ref2.jpg"},
	})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}

	images, ok := gotPayload["images"].([]any)
	if !ok || len(images) != 2 {
		t.Fatalf("payload images = %v, want 2 refs", gotPayload["images"])
	}
	if gotPayload["model"] != "doubao-seedream-5-0-pro-260628" {
		t.Errorf("model = %v, want resolved id", gotPayload["model"])
	}
}

func TestGenerateValidation(t *testing.T) {
	svc, _ := newTestService(t, func(w http.ResponseWriter, r *http.Request, _ string) {
		t.Error("upstream should not be called on validation failure")
	})

	if _, err := svc.Generate(context.Background(), GenerateRequest{}); !errors.Is(err, ErrEmptyPrompt) {
		t.Errorf("empty prompt: err = %v, want ErrEmptyPrompt", err)
	}
	if _, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x", Model: "gpt-image"}); !errors.Is(err, ErrUnknownModel) {
		t.Errorf("unknown model: err = %v, want ErrUnknownModel", err)
	}
	if _, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x", Size: "1024*1024"}); !errors.Is(err, ErrInvalidSize) {
		t.Errorf("bad size: err = %v, want ErrInvalidSize", err)
	}
}

func TestGenerateUpstreamError(t *testing.T) {
	svc, _ := newTestService(t, func(w http.ResponseWriter, r *http.Request, _ string) {
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"error":{"code":"RateLimitExceeded","message":"too many requests"}}`))
	})

	_, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x"})
	if !errors.Is(err, ErrUpstream) {
		t.Errorf("err = %v, want ErrUpstream", err)
	}
}
