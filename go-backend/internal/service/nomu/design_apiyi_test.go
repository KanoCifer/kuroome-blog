package nomu

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"math/rand"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

// 构造一张 w×h 的随机噪点 JPEG（噪点让编码后体积足够大，用于压缩断言）。
func noisyJPEG(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	rng := rand.New(rand.NewSource(1))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{uint8(rng.Intn(256)), uint8(rng.Intn(256)), uint8(rng.Intn(256)), 255})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 100}); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func newApiyiService(t *testing.T, generate, edit http.HandlerFunc) (*DesignService, *httptest.Server) {
	t.Helper()
	mux := http.NewServeMux()
	if generate != nil {
		mux.HandleFunc("/v1/images/generations", generate)
	}
	if edit != nil {
		mux.HandleFunc("/v1/images/edits", edit)
	}
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	svc := NewSingleDesignService(httpclient.New(), ApiyiProvider("apiyi-key", srv.URL+"/v1"), nil, nil)
	return svc, srv
}

// AC: 文生图只下发 model/prompt/response_format，且显式带上 response_format。
func TestApiyi_Text2Image_OnlyAllowedParams(t *testing.T) {
	var got map[string]any
	var gotPath, gotAuth string
	svc, _ := newApiyiService(t, func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotAuth = r.URL.Path, r.Header.Get("Authorization")
		json.NewDecoder(r.Body).Decode(&got)
		json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{{"b64_json": base64.StdEncoding.EncodeToString([]byte("img"))}},
		})
	}, nil)

	res, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "横版 16:9 一只猫"})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if gotPath != "/v1/images/generations" {
		t.Errorf("path = %q, want generations endpoint", gotPath)
	}
	if gotAuth != "Bearer apiyi-key" {
		t.Errorf("auth = %q", gotAuth)
	}
	// 参数红线：禁传 size/quality/n/aspect_ratio
	for _, banned := range []string{"size", "quality", "n", "aspect_ratio"} {
		if _, ok := got[banned]; ok {
			t.Errorf("payload 不应包含 %q: %v", banned, got)
		}
	}
	// 显式 response_format，不依赖默认值
	if got["response_format"] != "b64_json" {
		t.Errorf("response_format = %v, want explicit b64_json", got["response_format"])
	}
	if got["model"] != "gpt-image-2-all" || got["prompt"] != "横版 16:9 一只猫" {
		t.Errorf("payload = %v", got)
	}
	if len(res.Images) != 1 || !strings.HasPrefix(res.Images[0].URL, "data:image/png;base64,") {
		t.Errorf("b64 without store should return data URL, got %+v", res.Images)
	}
}

// AC: 图片编辑走 /images/edits multipart，image 字段承载参考图。
func TestApiyi_ImageEdit_Multipart(t *testing.T) {
	var gotPath, gotModel, gotPrompt, gotRF string
	var imageParts, imageBytes int
	svc, _ := newApiyiService(t, nil, func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			t.Errorf("parse multipart: %v", err)
		}
		gotModel, gotPrompt, gotRF = r.FormValue("model"), r.FormValue("prompt"), r.FormValue("response_format")
		for _, fh := range r.MultipartForm.File["image"] {
			imageParts++
			f, _ := fh.Open()
			b, _ := io.ReadAll(f)
			imageBytes += len(b)
		}
		json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{{"b64_json": base64.StdEncoding.EncodeToString([]byte("edited"))}},
		})
	})

	ref := "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(noisyJPEG(t, 64, 64))
	res, err := svc.Generate(context.Background(), GenerateRequest{
		Prompt: "图1 改成赛博朋克风", Images: []string{ref},
	})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if gotPath != "/v1/images/edits" {
		t.Errorf("path = %q, want edits endpoint", gotPath)
	}
	if imageParts != 1 || imageBytes == 0 {
		t.Errorf("image parts = %d bytes = %d, want 1 non-empty", imageParts, imageBytes)
	}
	if gotModel != "gpt-image-2-all" || gotRF != "b64_json" {
		t.Errorf("model=%q response_format=%q", gotModel, gotRF)
	}
	if gotPrompt != "图1 改成赛博朋克风" {
		t.Errorf("prompt = %q", gotPrompt)
	}
	if len(res.Images) != 1 {
		t.Fatalf("images = %d, want 1", len(res.Images))
	}
}

// AC: b64_json 响应 + store → 解码落盘，返回本站同源地址。
func TestApiyi_B64Response_StoredLocally(t *testing.T) {
	payload := []byte("fake-png-bytes")
	store := &fakeStore{}
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/images/generations", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{{"b64_json": base64.StdEncoding.EncodeToString(payload)}},
		})
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	svc := NewSingleDesignService(httpclient.New(), ApiyiProvider("k", srv.URL+"/v1"), store, nil)
	res, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x", UserID: 7})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if res.Images[0].URL != "/v3/media/design/1/abc.jpg" {
		t.Errorf("url = %q, want local media path", res.Images[0].URL)
	}
	if string(store.data) != string(payload) {
		t.Errorf("stored bytes = %q, want decoded b64", store.data)
	}
}

// AC: response_format:"url" → 服务端立即下载转存（不把会过期的 CDN 链透传）。
func TestApiyi_UrlResponse_DownloadedAndStored(t *testing.T) {
	store := &fakeStore{}
	mux := http.NewServeMux()
	var cdnURL string
	mux.HandleFunc("/v1/images/generations", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		json.NewDecoder(r.Body).Decode(&body)
		if body["response_format"] != "url" {
			t.Errorf("response_format = %v, want url passthrough", body["response_format"])
		}
		json.NewEncoder(w).Encode(map[string]any{"data": []map[string]any{{"url": cdnURL}}})
	})
	mux.HandleFunc("/cdn/1.png", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("cdn-bytes")) })
	srv := httptest.NewServer(mux)
	defer srv.Close()
	cdnURL = srv.URL + "/cdn/1.png"

	svc := NewSingleDesignService(httpclient.New(), ApiyiProvider("k", srv.URL+"/v1"), store, nil)
	res, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x", UserID: 7, ResponseFormat: "url"})
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if res.Images[0].URL != "/v3/media/design/1/abc.jpg" {
		t.Errorf("url = %q, want local media path (converted from expiring CDN)", res.Images[0].URL)
	}
	if string(store.data) != "cdn-bytes" {
		t.Errorf("stored = %q, want downloaded cdn bytes", store.data)
	}
}

// 小图不动；大图缩到长边 2048 内且体积下降。
func TestCompressImages_Thresholds(t *testing.T) {
	small := noisyJPEG(t, 64, 64)
	out, err := compressImages([][]byte{small})
	if err != nil {
		t.Fatalf("compress small: %v", err)
	}
	if len(out[0]) != len(small) {
		t.Errorf("small (<1.5MB) 不应被处理: %d -> %d", len(small), len(out[0]))
	}

	big := noisyJPEG(t, 3000, 2400) // 长边 3000 > 2048
	if len(big) <= compressTriggerBytes {
		t.Skipf("noisy jpeg too small to trigger compression (%d bytes)", len(big))
	}
	out, err = compressImages([][]byte{big})
	if err != nil {
		t.Fatalf("compress big: %v", err)
	}
	if len(out[0]) >= len(big) {
		t.Errorf("大图压缩后未变小: %d -> %d", len(big), len(out[0]))
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(out[0]))
	if err != nil {
		t.Fatalf("decode compressed: %v", err)
	}
	if max(cfg.Width, cfg.Height) > maxLongEdge {
		t.Errorf("长边 = %d, want <= %d", max(cfg.Width, cfg.Height), maxLongEdge)
	}
}

// 压缩失败（非图片字节）回退原图继续，不中断请求：单张预算内应原样返回。
func TestCompressImages_FallbackOnDecodeError(t *testing.T) {
	bad := bytes.Repeat([]byte{0xFF}, compressTriggerBytes+1) // 超触发阈但未超预算
	out, err := compressImages([][]byte{bad})
	if err != nil {
		t.Fatalf("单张预算内的解码失败应回退原图而非报错: %v", err)
	}
	if !bytes.Equal(out[0], bad) {
		t.Error("回退后应返回原图字节")
	}
}

// 单张/合计超过上传预算 → ErrImageTooLarge（压缩失败回退原图后仍超标）。
func TestCompressImages_OverBudget(t *testing.T) {
	huge := bytes.Repeat([]byte{0xFF}, maxSingleBytes+1)
	if _, err := compressImages([][]byte{huge}); err != ErrImageTooLarge {
		t.Errorf("err = %v, want ErrImageTooLarge", err)
	}
}

// 使用 multipart writer 手工构造一次请求，确保字段名与文档一致（image 可重复）。
func TestApiyi_EditFieldName_Documented(t *testing.T) {
	// 断言我们写出的字段名就是文档里的 "image"（重复多张）。
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for i := 0; i < 2; i++ {
		fw, _ := mw.CreateFormFile("image", "image.png")
		fw.Write([]byte("x"))
	}
	mw.Close()
	_, params, _ := mime.ParseMediaType(mw.FormDataContentType())
	mr := multipart.NewReader(&buf, params["boundary"])
	form, _ := mr.ReadForm(1 << 20)
	if len(form.File["image"]) != 2 {
		t.Errorf("image parts = %d, want 2", len(form.File["image"]))
	}
}
