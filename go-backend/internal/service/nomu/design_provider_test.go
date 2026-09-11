package nomu

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// 空传输参数回退方舟默认；默认模型兜底为 lite 档。
func TestDefaultProvider_Fallbacks(t *testing.T) {
	p := DefaultProvider("k", "", "")
	if p.Endpoint != arkEndpoint {
		t.Errorf("endpoint = %q, want ark default", p.Endpoint)
	}
	if p.AuthScheme != "Bearer" {
		t.Errorf("authScheme = %q, want Bearer", p.AuthScheme)
	}
	spec, err := p.resolveModel("")
	if err != nil {
		t.Fatalf("resolveModel(\"\"): %v", err)
	}
	if spec.Variant != model.DesignVariantArkLite {
		t.Errorf("default variant = %q, want %s", spec.Variant, model.DesignVariantArkLite)
	}
}

// 命名空间化 variant：每个模型独占一档，可独立定价；服务商前缀与 Provider.Name 对齐。
func TestProvider_ModelsMapToDistinctVariants(t *testing.T) {
	ark := DefaultProvider("k", "", "")
	apiyi := ApiyiProvider("k", "")

	want := map[string]string{
		"Doubao-Seedream-5.0-lite": model.DesignVariantArkLite,
		"Doubao-Seedream-5.0-pro":  model.DesignVariantArkPro,
		"gpt-image-2-all":          model.DesignVariantApiyiGptImage2All,
		"gpt-image-2.5-all":        model.DesignVariantApiyiGptImage25All,
	}
	seen := map[string]bool{}
	for modelName, wantVariant := range want {
		p := ark
		if _, ok := apiyi.Models[modelName]; ok {
			p = apiyi
		}
		spec, err := p.resolveModel(modelName)
		if err != nil {
			t.Fatalf("resolveModel(%q): %v", modelName, err)
		}
		if spec.Variant != wantVariant {
			t.Errorf("%s variant = %q, want %q", modelName, spec.Variant, wantVariant)
		}
		if seen[spec.Variant] {
			t.Errorf("variant %q 被多个模型共用，无法独立定价", spec.Variant)
		}
		seen[spec.Variant] = true
	}
}

// AC: 换服务商只换 Provider —— 自定义端点与鉴权方案（非 Bearer）须原样生效。
func TestProvider_CustomEndpointAndAuth(t *testing.T) {
	var gotPath, gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		json.NewEncoder(w).Encode(map[string]any{
			"model": "custom", "data": []map[string]any{{"url": "https://x/1.jpeg"}},
		})
	}))
	defer srv.Close()

	p := DefaultProvider("secret", srv.URL+"/v1/images/generations", "x-api-key")
	svc := NewSingleDesignService(httpclient.New(), p, nil, nil)

	if _, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x"}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if gotPath != "/v1/images/generations" {
		t.Errorf("path = %q, want custom endpoint path", gotPath)
	}
	if gotAuth != "x-api-key secret" {
		t.Errorf("Authorization = %q, want custom scheme", gotAuth)
	}
}

// AC: 一次装配同时接多个服务商，前端只传 model 即路由到对应上游。
// 这是「根据前端传的 model 自动路由」的核心回归点。
func TestRouter_DispatchesByModel(t *testing.T) {
	arkHits, apiyiHits := 0, 0
	arkSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		arkHits++
		json.NewEncoder(w).Encode(map[string]any{"data": []map[string]any{{"url": "https://ark/x.jpeg"}}})
	}))
	defer arkSrv.Close()
	apiyiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiyiHits++
		json.NewEncoder(w).Encode(map[string]any{"data": []map[string]any{{"url": "https://apiyi/x.png"}}})
	}))
	defer apiyiSrv.Close()

	router := NewRouter("ark",
		DefaultProvider("k", arkSrv.URL+"/api/v3/images/generations", ""),
		ApiyiProvider("k", apiyiSrv.URL+"/v1"),
	)
	svc := NewDesignService(httpclient.New(), router, nil, nil)

	if _, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x", Model: "Doubao-Seedream-5.0-lite"}); err != nil {
		t.Fatalf("ark route: %v", err)
	}
	if _, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x", Model: "gpt-image-2-all"}); err != nil {
		t.Fatalf("apiyi route: %v", err)
	}
	if arkHits != 1 || apiyiHits != 1 {
		t.Errorf("arkHits=%d apiyiHits=%d, want 各 1（模型路由错位）", arkHits, apiyiHits)
	}
}

// AC: 默认服务商由 DESIGN_PROVIDER 决定，仅 model 为空时生效。
func TestRouter_DefaultProvider(t *testing.T) {
	got := ""
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.URL.Path
		json.NewEncoder(w).Encode(map[string]any{"data": []map[string]any{{"url": "https://x/1.jpeg"}}})
	}))
	defer srv.Close()

	router := NewRouter("apiyi",
		DefaultProvider("k", srv.URL+"/ark/images/generations", ""),
		ApiyiProvider("k", srv.URL+"/apiyi"),
	)
	svc := NewDesignService(httpclient.New(), router, nil, nil)

	// model 为空 → apiyi 的 generations 端点
	if _, err := svc.Generate(context.Background(), GenerateRequest{Prompt: "x"}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if got != "/apiyi/images/generations" {
		t.Errorf("path = %q, want apiyi default provider", got)
	}

	// 未注册的 defaultProvider 名 → 回退首个服务商
	router = NewRouter("nope", DefaultProvider("k", srv.URL+"/ark/images/generations", ""))
	if router.def != "ark" {
		t.Errorf("def = %q, want fallback to first provider", router.def)
	}
}

// 未知模型报错须列出所有服务商的模型名。
func TestRouter_UnknownModelListsAll(t *testing.T) {
	router := NewRouter("ark", DefaultProvider("k", "", ""), ApiyiProvider("k", ""))
	_, _, err := router.Resolve("gpt-image-9")
	if err == nil {
		t.Fatal("want error for unknown model")
	}
	for _, want := range []string{"Doubao-Seedream-5.0-lite", "gpt-image-2-all", "gpt-image-2.5-all"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("err = %v, want to mention %q", err, want)
		}
	}
}
