package service

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
)

func newCapturingServer(t *testing.T, hits *atomic.Int32, body string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func waitForCache(t *testing.T, mr *miniredis.Miniredis, key, want string) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for {
		if cached, err := mr.Get(key); err == nil && cached == want {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("cache key %q not written back to %q within 2s", key, want)
		}
		time.Sleep(10 * time.Millisecond)
	}
}
