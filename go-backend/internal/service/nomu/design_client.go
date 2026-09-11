package nomu

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

type DesignClient struct {
	http *httpclient.Client
	// provider 出图服务商接入参数（协议 / 端点 / 鉴权 / 模型目录）。
	provider Provider
}

// NewDesignClient 构造客户端。provider 承载协议、端点、鉴权与模型目录，
// 换服务商即换这份参数。
func NewDesignClient(http *httpclient.Client, provider Provider) *DesignClient {
	return &DesignClient{http: http, provider: provider}
}

// BuildPayload 组装方舟 images/generations 请求体。
// images 为空 → 文生图；参考图字段官方名为 image：
// 1 张传字符串，多张传数组（不存在 images 字段）。
// size 为上游语义（档位枚举 / WxH），原样透传；空则省略、用上游默认。
// 本服务不传 count/组图参数；上游响应 data[] 张数不定（实测可多张），
// 积分以预扣 1 张为闸门、响应后按张数 Settle 结算。
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

// setAuth 设置上游鉴权头。两条发送路径共用；结果图/参考图的拉取（FetchBlob）
// 是外部 URL，不带密钥以免泄露。
func (c *DesignClient) setAuth(req *http.Request) {
	req.Header.Set("Authorization", c.provider.AuthScheme+" "+c.provider.APIKey)
}

// postJSON 发送带鉴权的 JSON POST（方舟与 OpenAI 文生图共用）。
func (c *DesignClient) postJSON(ctx context.Context, url string, payload map[string]any) (json.RawMessage, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	c.setAuth(req)
	req.Header.Set("Content-Type", "application/json")
	return c.do(ctx, req)
}

// SendRequest 发送方舟风格 JSON 请求（文生图/图生图的 JSON 变体）。
func (c *DesignClient) SendRequest(ctx context.Context, payload map[string]any) (json.RawMessage, error) {
	return c.postJSON(ctx, c.provider.Endpoint, payload)
}

// SendOpenAIGenerate 文生图：POST /images/generations（application/json）。
// 只下发 model / prompt / response_format —— size/quality/n/aspect_ratio 一概不带
// （本模型拒绝它们；n=3 会按 3 张计费却只回 1 张）。输出尺寸靠 prompt 前缀控制。
func (c *DesignClient) SendOpenAIGenerate(ctx context.Context, model, prompt, responseFormat string) (json.RawMessage, error) {
	return c.postJSON(ctx, c.provider.Endpoint, map[string]any{
		"model":           model,
		"prompt":          prompt,
		"response_format": responseFormat,
	})
}

// SendOpenAIEdit 图片编辑：POST /images/edits（multipart/form-data）。
// image 字段可重复传多张参考图（顺序即 prompt 中「图1/图2/图3」的引用依据）。
// images 已由 service 层压缩到 2048px/6MB 内。
func (c *DesignClient) SendOpenAIEdit(ctx context.Context, model, prompt, responseFormat string, images [][]byte) (json.RawMessage, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for _, img := range images {
		fw, err := mw.CreateFormFile("image", "image.png")
		if err != nil {
			return nil, fmt.Errorf("failed to build multipart: %w", err)
		}
		if _, err := fw.Write(img); err != nil {
			return nil, fmt.Errorf("failed to write image part: %w", err)
		}
	}
	for k, v := range map[string]string{
		"model":           model,
		"prompt":          prompt,
		"response_format": responseFormat,
	} {
		if err := mw.WriteField(k, v); err != nil {
			return nil, fmt.Errorf("failed to write field %s: %w", k, err)
		}
	}
	if err := mw.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.provider.EditsURL, &buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	c.setAuth(req)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	return c.do(ctx, req)
}

// do 执行请求并读取响应体，非 2xx 归一为带状态码与截断 body 的错误。
func (c *DesignClient) do(ctx context.Context, req *http.Request) (json.RawMessage, error) {
	resp, err := c.http.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
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
