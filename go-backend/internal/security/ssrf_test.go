package security

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

// 全部测试用例共用:跑完恢复 AllowPrivateIP(防止污染)。
func restoreAllow() func() {
	prev := AllowPrivateIP
	return func() { AllowPrivateIP = prev }
}

// 解析静态白名单/黑名单校验
func TestValidateURL(t *testing.T) {
	defer restoreAllow()()

	cases := []struct {
		name    string
		raw     string
		wantErr bool
	}{
		{"http rejected", "http://example.com/x", true},
		{"empty host", "https:///x", true},
		{"loopback v4", "https://127.0.0.1/x", true},
		{"loopback v6", "https://[::1]/x", true},
		{"private 10/8", "https://10.0.0.1/x", true},
		{"private 192.168", "https://192.168.1.1/x", true},
		{"link-local metadata", "https://169.254.169.254/latest/meta-data/", true},
		{"unspecified", "https://0.0.0.0/x", true},
		{"non-public public ip", "https://1.1.1.1/x", false},
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			u, err := url.Parse(tc.raw)
			if err != nil {
				t.Fatalf("parse: %v", err)
			}
			err = ValidateURL(ctx, u)
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidateURL(%s) err=%v, wantErr=%v", tc.raw, err, tc.wantErr)
			}
		})
	}
}

// 域名解析走 loopback:用 127.0.0.1.nip.io 直接打到 loopback。
func TestValidateURL_DomainToLoopback(t *testing.T) {
	defer restoreAllow()()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// 127.0.0.1.nip.io 解析到 127.0.0.1
	u, _ := url.Parse("https://127.0.0.1.nip.io/x")
	if err := ValidateURL(ctx, u); err == nil {
		t.Fatal("expected block on domain resolving to loopback")
	}
}

// DialContext 拒绝重连接到内网地址:构造一个把外网 URL 重定向到
// 127.0.0.1 的 httptest server,验证 SafeClient 不会跟过去。
func TestSafeClient_BlocksRedirectToLoopback(t *testing.T) {
	defer restoreAllow()()

	// 真实 HTTP 服务器在 127.0.0.1 — 模拟攻击者把外网 url 重定向到本机。
	redirected := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("secret"))
	}))
	defer redirected.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, redirected.URL, http.StatusFound)
	})
	relay := httptest.NewServer(mux)
	defer relay.Close()

	// relay.URL 是 http://127.0.0.1:xxxxx — 走 SafeClient 第一跳就被拦。
	_, err := SafeClient().Get(relay.URL)
	if err == nil {
		t.Fatal("expected redirect to loopback to be blocked")
	}
	if !strings.Contains(err.Error(), "ssrf") {
		t.Fatalf("err should mention ssrf, got: %v", err)
	}
}
