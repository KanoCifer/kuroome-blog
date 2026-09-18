package service

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/security"
)

// ProxyBlob 必须把上游 body 原样交给调用方读完，不能在函数内提前 Close。
// 回归背景：曾经 defer resp.Body.Close()，函数返回即掐断连接，
// 下游 io.Copy 一个字都读不到（http2: response body closed）。
func TestProxyBlob_BodyReadableAfterReturn(t *testing.T) {
	defer func(prev bool) { security.AllowPrivateIP = prev }(security.AllowPrivateIP)
	security.AllowPrivateIP = true // httptest 监听在 127.0.0.1

	const payload = "fake-jpeg-bytes"
	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = io.WriteString(w, payload)
	}))
	defer upstream.Close()

	// TLS 测试证书不被信任，单独换掉 Transport；其余走真实 ProxyBlob 路径。
	saved := proxyClient
	proxyClient = upstream.Client()
	proxyClient.CheckRedirect = saved.CheckRedirect
	defer func() { proxyClient = saved }()

	u, err := url.Parse(upstream.URL + "/img.jpg")
	if err != nil {
		t.Fatalf("parse upstream url: %v", err)
	}

	svc := &NomuServiceStruct{}
	contentLength, contentType, body, _, err := svc.ProxyBlob(t.Context(), u)
	if err != nil {
		t.Fatalf("ProxyBlob: %v", err)
	}
	defer body.Close()

	if contentType != "image/jpeg" {
		t.Errorf("contentType = %q, want image/jpeg", contentType)
	}
	if contentLength != int64(len(payload)) {
		t.Errorf("contentLength = %d, want %d", contentLength, len(payload))
	}

	got, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read body after ProxyBlob returned: %v", err)
	}
	if string(got) != payload {
		t.Errorf("body = %q, want %q", got, payload)
	}
}

// 非 200 上游必须回错，且不能把响应体泄漏给调用方。
func TestProxyBlob_NonOKStatus(t *testing.T) {
	defer func(prev bool) { security.AllowPrivateIP = prev }(security.AllowPrivateIP)
	security.AllowPrivateIP = true

	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "nope", http.StatusNotFound)
	}))
	defer upstream.Close()

	saved := proxyClient
	proxyClient = upstream.Client()
	proxyClient.CheckRedirect = saved.CheckRedirect
	defer func() { proxyClient = saved }()

	u, _ := url.Parse(upstream.URL + "/missing.jpg")
	svc := &NomuServiceStruct{}
	_, _, body, _, err := svc.ProxyBlob(t.Context(), u)
	if err == nil {
		body.Close()
		t.Fatal("expected error for 404 upstream")
	}
	if !strings.Contains(err.Error(), "404") {
		t.Errorf("err = %v, want it to mention 404", err)
	}
}
