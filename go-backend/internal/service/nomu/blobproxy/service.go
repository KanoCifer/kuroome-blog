package blobproxy

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/security"
)

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"

type Service struct {
	client *http.Client
}

func NewService() *Service {
	return &Service{client: security.SafeClient()}
}

func (s *Service) ProxyBlob(ctx context.Context, url *url.URL) (contentLength int64, contentType string, body io.ReadCloser, extraHeaders map[string]string, err error) {
	if err := security.ValidateURL(ctx, url); err != nil {
		return 0, "", nil, nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url.String(), nil)
	if err != nil {
		return 0, "", nil, nil, err
	}

	req.Header.Set("Referer", url.Scheme+"://"+url.Host+"/")
	req.Header.Set("User-Agent", userAgent)
	if id, ok := logger.TraceIDFromContext(ctx); ok && id != "" {
		req.Header.Set("X-Trace-Id", id)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return 0, "", nil, nil, err
	}
	// A successful body belongs to the caller; error bodies are closed here.
	if resp.StatusCode != http.StatusOK {
		_ = resp.Body.Close()
		return 0, "", nil, nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	contentLength = resp.ContentLength
	contentType = resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	extraHeaders = map[string]string{
		"Content-Disposition": "inline",
		"Cache-Control":       "public, max-age=86400",
	}

	return contentLength, contentType, resp.Body, extraHeaders, nil
}
