package blobproxy

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/security"
)

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"

// retryViaProxy 直连拿到这些状态时改走代理重试一次。它们在直连场景几乎都
// 来自地域限制 / 防盗链 / CDN 区域差异，换个出口重试有意义；其余状态（如
// 5xx）说明网络本身是通的，回落只会把一次故障拖成两次。
var retryViaProxy = map[int]bool{
	http.StatusUnauthorized: true,
	http.StatusForbidden:    true,
	http.StatusNotFound:     true,
}

type Service struct {
	client          *http.Client
	clientWithProxy *http.Client
}

// NewService 构造图片代理 service。proxyURL 为空或无法解析时不启用代理，
// ProxyBlob 退化为纯直连。
func NewService(proxyURL string) *Service {
	s := &Service{client: security.SafeClient()}
	u, err := url.Parse(proxyURL)
	switch {
	case proxyURL == "":
	case err != nil || u.Host == "":
		// 配了却用不了时不能让整站图片挂掉：降级成直连，但留下痕迹。
		slog.Warn("blobproxy: invalid HTTP_PROXY, falling back to direct fetch", "proxy", proxyURL, "error", err)
	default:
		s.clientWithProxy = security.SafeProxyClient(u)
	}
	return s
}

func (s *Service) ProxyBlob(ctx context.Context, url *url.URL) (contentLength int64, contentType string, body io.ReadCloser, extraHeaders map[string]string, err error) {
	if err := security.ValidateURL(ctx, url); err != nil {
		return 0, "", nil, nil, err
	}
	resp, err := s.fetch(ctx, url)
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

// fetch 先直连，命中 retryViaProxy 的状态码或传输层错误时改走代理重试一次。
// 返回的 body 归调用方所有；被丢弃的直连响应在本函数内关闭。
//
// ponytail: 失败路径要等两次超时（直连一次 + 代理一次），是直连优先策略的
// 已知代价。要压低就把直连 client 的 Timeout 调到几秒，让回落更快。
func (s *Service) fetch(ctx context.Context, u *url.URL) (*http.Response, error) {
	resp, directErr := s.do(ctx, u, s.client)
	if s.clientWithProxy == nil {
		return resp, directErr
	}
	if directErr == nil && !retryViaProxy[resp.StatusCode] {
		return resp, nil
	}
	if directErr == nil {
		_ = resp.Body.Close() // 丢弃直连响应前先关掉连接，否则泄漏
	}
	return s.do(ctx, u, s.clientWithProxy)
}

// do 用指定 client 发一次 GET。每次都新建 *http.Request：同一个 request
// 不能安全地 Do 两次。
func (s *Service) do(ctx context.Context, u *url.URL, client *http.Client) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Referer", u.Scheme+"://"+u.Host+"/")
	req.Header.Set("User-Agent", userAgent)
	if id, ok := logger.TraceIDFromContext(ctx); ok && id != "" {
		req.Header.Set("X-Trace-Id", id)
	}

	return client.Do(req)
}
