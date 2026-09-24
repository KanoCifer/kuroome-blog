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

	svc := NewService()
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

	svc := NewService()
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
