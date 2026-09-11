package nomu

import (
	"context"
	"encoding/json"
	"errors"
	"io"
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

	svc := NewSingleDesignService(httpclient.New(), DefaultProvider("test-key", srv.URL+"/api/v3/images/generations", ""), nil, nil)
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

	res, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "一只猫", Size: "2K"})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if gotAuth != "Bearer test-key" {
		t.Errorf("Authorization = %q, want Bearer test-key", gotAuth)
	}
	if gotPayload["size"] != "2K" {
		t.Errorf("size = %v, want tier string passthrough", gotPayload["size"])
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

	images, ok := gotPayload["image"].([]any)
	if !ok || len(images) != 2 {
		t.Fatalf("payload image = %v, want array of 2 refs", gotPayload["image"])
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
}

func TestGenerateSizePassthrough(t *testing.T) {
	var gotPayload map[string]any
	svc, _ := newTestService(t, func(w http.ResponseWriter, r *http.Request, _ string) {
		json.NewDecoder(r.Body).Decode(&gotPayload)
		json.NewEncoder(w).Encode(map[string]any{
			"model": "doubao-seedream-5-0-260128",
			"data":  []map[string]any{{"url": "https://ark.example/1.jpeg", "size": "2048x2048"}},
		})
	})

	// 档位字符串原样透传，不做本地校验
	if _, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x", Size: "1K"}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if gotPayload["size"] != "1K" {
		t.Errorf("size = %v, want passthrough %q", gotPayload["size"], "1K")
	}

	// 空 size：字段整体省略，用上游默认
	gotPayload = nil
	if _, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x"}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if _, ok := gotPayload["size"]; ok {
		t.Errorf("empty size should be omitted, got %v", gotPayload["size"])
	}
}

// fakeStore 记录落盘调用，返回固定相对路径。
type fakeStore struct {
	userID uint
	data   []byte
}

func (f *fakeStore) UploadDesignImage(ctx context.Context, userID uint, src io.Reader) (string, error) {
	b, err := io.ReadAll(src)
	if err != nil {
		return "", err
	}
	f.userID, f.data = userID, b
	return "design/1/abc.jpg", nil
}

func TestGeneratePersistsWithStore(t *testing.T) {
	var srvURL string
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/images/generations", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"model": "doubao-seedream-5-0-260128",
			"data":  []map[string]any{{"url": srvURL + "/blob/1", "size": "2048x2048"}},
		})
	})
	mux.HandleFunc("/blob/1", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("fake-jpeg-bytes"))
	})
	srv := httptest.NewServer(mux)
	srvURL = srv.URL
	defer srv.Close()

	store := &fakeStore{}
	svc := NewSingleDesignService(httpclient.New(), DefaultProvider("test-key", srv.URL+"/api/v3/images/generations", ""), store, nil)

	res, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x", UserID: 1})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if res.Images[0].URL != "/v3/media/design/1/abc.jpg" {
		t.Errorf("url = %q, want local media path", res.Images[0].URL)
	}
	if store.userID != 1 || string(store.data) != "fake-jpeg-bytes" {
		t.Errorf("store got user=%d data=%q", store.userID, store.data)
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
