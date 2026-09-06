package nomu

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

type DesignClient struct {
	http    *httpclient.Client
	baseURL string
	apiKey  string
	model   string
}

type DesignClientOption func(*DesignClient)

func WithBaseURL(url string) DesignClientOption {
	return func(client *DesignClient) {
		client.baseURL = url
	}
}

func WithAPIKey(apiKey string) DesignClientOption {
	return func(client *DesignClient) {
		client.apiKey = apiKey
	}
}

func NewDesignClient(http *httpclient.Client, opts ...DesignClientOption) *DesignClient {
	client := &DesignClient{http: http}
	for _, opt := range opts {
		opt(client)
	}
	return client
}

// BuildPayload 组装方舟 images/generations 请求体。
// images 为空 → 文生图；参考图字段官方名为 image：
// 1 张传字符串，多张传数组（不存在 images 字段）。
// size 为上游语义（档位枚举 / WxH），原样透传；空则省略、用上游默认。
func (c *DesignClient) BuildPayload(prompt string, model string, images []string, size string) map[string]any {
	payload := map[string]any{
		"prompt":        prompt,
		"model":         model,
		"watermark":     false,
		"output_format": "jpeg",
	}
	if size != "" {
		payload["size"] = size
	}
	if len(images) == 1 {
		payload["image"] = images[0]
	} else if len(images) > 1 {
		payload["image"] = images
	}
	return payload
}

func (c *DesignClient) BuildHeaders() map[string]string {
	return map[string]string{
		"Authorization": "Bearer " + c.apiKey,
		"Content-Type":  "application/json",
	}
}

func (c *DesignClient) SendRequest(ctx context.Context, payload map[string]any) (json.RawMessage, error) {
	header := c.BuildHeaders()
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	for k, v := range header {
		req.Header.Set(k, v)
	}

	resp, err := c.http.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err = io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("design upstream: status=%d body=%s", resp.StatusCode, truncateBody(body))
	}
	return json.RawMessage(body), nil
}

// truncateBody 截断响应体片段用于错误信息，避免大 body 撑爆日志。
func truncateBody(body []byte) string {
	const max = 512
	if len(body) > max {
		return string(body[:max])
	}
	return string(body)
}

func (c *DesignClient) FetchBlob(ctx context.Context, blobURL string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, blobURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	resp, err := c.http.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}
	return body, nil
}
