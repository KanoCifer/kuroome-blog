package blobproxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/security"
)

func TestProxyBlobBodyReadableAfterReturn(t *testing.T) {
	defer func(prev bool) { security.AllowPrivateIP = prev }(security.AllowPrivateIP)
	security.AllowPrivateIP = true

	const payload = "fake-jpeg-bytes"
	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = io.WriteString(w, payload)
	}))
	defer upstream.Close()

	svc := NewService("")
	svc.client = upstream.Client()

	u, err := url.Parse(upstream.URL + "/img.jpg")
	if err != nil {
		t.Fatalf("parse upstream url: %v", err)
	}

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

type trackingBody struct {
	io.ReadCloser
	closed bool
}

func (b *trackingBody) Close() error {
	b.closed = true
	return b.ReadCloser.Close()
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestProxyBlobNonOKStatusClosesBody(t *testing.T) {
	defer func(prev bool) { security.AllowPrivateIP = prev }(security.AllowPrivateIP)
	security.AllowPrivateIP = true

	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "nope", http.StatusNotFound)
	}))
	defer upstream.Close()

	svc := NewService("")
	upstreamBody := &trackingBody{}
	upstreamClient := upstream.Client()
	svc.client = &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		resp, err := upstreamClient.Transport.RoundTrip(req)
		if err == nil {
			upstreamBody.ReadCloser = resp.Body
			resp.Body = upstreamBody
		}
		return resp, err
	})}

	u, _ := url.Parse(upstream.URL + "/missing.jpg")
	_, _, body, _, err := svc.ProxyBlob(t.Context(), u)
	if err == nil {
		if body != nil {
			_ = body.Close()
		}
		t.Fatal("expected error for 404 upstream")
	}
	if body != nil {
		t.Errorf("body = %#v, want nil", body)
	}
	if !upstreamBody.closed {
		t.Error("upstream body was not closed")
	}
	if !strings.Contains(err.Error(), "404") {
		t.Errorf("err = %v, want it to mention 404", err)
	}
}

// stubClient 返回一个固定状态码的 client，并记录被调用的次数。
func stubClient(status int, calls *int) *http.Client {
	return &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		*calls++
		return &http.Response{
			StatusCode: status,
			Header:     http.Header{"Content-Type": []string{"image/jpeg"}},
			Body:       io.NopCloser(strings.NewReader("body")),
		}, nil
	})}
}

func TestProxyBlobFallsBackToProxyOn403(t *testing.T) {
	defer func(prev bool) { security.AllowPrivateIP = prev }(security.AllowPrivateIP)
	security.AllowPrivateIP = true

	const payload = "proxied-jpeg-bytes"
	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = io.WriteString(w, payload)
	}))
	defer upstream.Close()

	var directCalls, proxyCalls int
	svc := NewService("http://127.0.0.1:1") // 地址不会真用，只为启用代理 client
	svc.client = stubClient(http.StatusForbidden, &directCalls)
	svc.clientWithProxy = upstream.Client()

	u, _ := url.Parse(upstream.URL + "/img.jpg")
	_, contentType, body, _, err := svc.ProxyBlob(t.Context(), u)
	if err != nil {
		t.Fatalf("ProxyBlob: %v", err)
	}
	defer body.Close()

	if directCalls != 1 {
		t.Errorf("direct calls = %d, want 1", directCalls)
	}
	if proxyCalls != 0 {
		t.Errorf("proxy stub calls = %d, want 0", proxyCalls)
	}
	if contentType != "image/jpeg" {
		t.Errorf("contentType = %q, want image/jpeg", contentType)
	}
	got, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if string(got) != payload {
		t.Errorf("body = %q, want %q (served via proxy)", got, payload)
	}
}

func TestProxyBlobDoesNotFallBackOn5xx(t *testing.T) {
	defer func(prev bool) { security.AllowPrivateIP = prev }(security.AllowPrivateIP)
	security.AllowPrivateIP = true

	var directCalls int
	svc := NewService("http://127.0.0.1:1")
	svc.client = stubClient(http.StatusBadGateway, &directCalls)
	svc.clientWithProxy = &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		t.Error("proxy client must not be used for 5xx")
		return nil, io.ErrUnexpectedEOF
	})}

	u, _ := url.Parse("https://example.com/img.jpg")
	_, _, body, _, err := svc.ProxyBlob(t.Context(), u)
	if err == nil {
		_ = body.Close()
		t.Fatal("expected error for 502 upstream")
	}
	if directCalls != 1 {
		t.Errorf("direct calls = %d, want 1", directCalls)
	}
	if !strings.Contains(err.Error(), "502") {
		t.Errorf("err = %v, want it to mention 502", err)
	}
}

func TestProxyBlobNoProxyConfiguredKeepsDirectError(t *testing.T) {
	defer func(prev bool) { security.AllowPrivateIP = prev }(security.AllowPrivateIP)
	security.AllowPrivateIP = true

	var directCalls int
	svc := NewService("")
	svc.client = stubClient(http.StatusForbidden, &directCalls)

	u, _ := url.Parse("https://example.com/img.jpg")
	_, _, body, _, err := svc.ProxyBlob(t.Context(), u)
	if err == nil {
		_ = body.Close()
		t.Fatal("expected error when no proxy is configured")
	}
	if directCalls != 1 {
		t.Errorf("direct calls = %d, want 1", directCalls)
	}
	if !strings.Contains(err.Error(), "403") {
		t.Errorf("err = %v, want it to mention 403", err)
	}
}

func TestNewServiceDisablesProxyOnBadURL(t *testing.T) {
	for _, bad := range []string{"://nope", "not-a-url", "http://"} {
		if svc := NewService(bad); svc.clientWithProxy != nil {
			t.Errorf("NewService(%q) enabled proxy client, want disabled", bad)
		}
	}
	if svc := NewService("http://127.0.0.1:7890"); svc.clientWithProxy == nil {
		t.Error("NewService with valid proxy URL left clientWithProxy nil")
	}
}

// TestProxyClientGoesThroughProxy 验证 NewService 产出的代理 client 真的把
// 请求发给了代理：https 目标下 transport 会先向代理发 CONNECT。
func TestProxyClientGoesThroughProxy(t *testing.T) {
	defer func(prev bool) { security.AllowPrivateIP = prev }(security.AllowPrivateIP)
	security.AllowPrivateIP = true

	connectHost := make(chan string, 1)
	px := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodConnect {
			select {
			case connectHost <- r.Host:
			default:
			}
		}
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer px.Close()

	upstream := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("upstream must not be reached directly")
	}))
	defer upstream.Close()

	svc := NewService(px.URL)
	u, _ := url.Parse(upstream.URL + "/img.jpg")
	if _, _, body, _, err := svc.ProxyBlob(t.Context(), u); err == nil {
		_ = body.Close()
		t.Fatal("expected error: fake proxy refuses CONNECT")
	}

	select {
	case got := <-connectHost:
		if want := strings.TrimPrefix(upstream.URL, "https://"); got != want {
			t.Errorf("CONNECT host = %q, want %q", got, want)
		}
	default:
		t.Error("proxy never received a CONNECT request")
	}
}
