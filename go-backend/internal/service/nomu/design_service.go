// Package nomu —— 设计出图业务（火山方舟豆包 Seedream）。
//
// DesignService 面向 handler 只暴露一个 Generate 入口：
//   - 文生图：只传 Prompt；
//   - 图生图：Images 传 1 张（单参考图，payload 用 image）或多张（多参考图，payload 用 images）。
//
// 编排流程：校验入参 → 解析模型别名 → DesignClient 组包发送 → 解析方舟响应。
// 结果只携带上游返回的临时 URL（会过期），图片字节由前端自行拉取；
// 服务端需要落盘时可直接使用 DesignClient.FetchBlob。
package nomu

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"maps"
	"slices"
	"strconv"
	"strings"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

const (
	// baseURL 火山方舟图片生成端点（doubao-seedream 系列）。
	baseURL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

	// defaultModelKey 未指定模型时的兜底（成本低档）。
	defaultModelKey = "Doubao-Seedream-5.0-lite"

	// defaultSize 未指定尺寸时的兜底。
	defaultSize = "1024x1024"
)

// models 面向用户的展示名 → 方舟模型 ID。直接传 ID 也接受。
var models = map[string]string{
	"Doubao-Seedream-5.0-pro":  "doubao-seedream-5-0-pro-260628",
	"Doubao-Seedream-5.0-lite": "doubao-seedream-5-0-260128",
}

var (
	// ErrEmptyPrompt 入参校验失败：prompt 为空。
	ErrEmptyPrompt = errors.New("design: prompt is required")
	// ErrUnknownModel 模型别名/ID 不在 models 支持范围内。
	ErrUnknownModel = errors.New("design: unknown model")
	// ErrInvalidSize 尺寸既不是 WxH 整数格式也不是 adaptive。
	ErrInvalidSize = errors.New("design: invalid size")
	// ErrUpstream 上游（方舟）请求失败、响应异常或图片拉取失败。
	ErrUpstream = errors.New("design: upstream generate failed")
)

// GenerateRequest 一次出图请求。
type GenerateRequest struct {
	// Prompt 画面描述，必填。
	Prompt string
	// Model models 的展示名或方舟模型 ID，空则取默认模型。
	Model string
	// Size "WxH" 或 "adaptive"，空则 1024x1024。
	Size string
	// Images 参考图（URL 或 base64）。0 张 = 文生图；1 张走 image；多张走 images。
	Images []string
}

// GeneratedImage 单张结果图。URL 是方舟返回的临时地址（会过期），
// 由前端直接拉取展示；需要长期保存时由服务端后续落盘。
type GeneratedImage struct {
	Index int    `json:"index"`
	Size  string `json:"size,omitempty"`
	URL   string `json:"url"`
}

// GenerateResult 一次出图的结果。
type GenerateResult struct {
	Model   string           `json:"model"`
	Images  []GeneratedImage `json:"images"`
	Usage   GenerateUsage    `json:"usage"`
	Created int64            `json:"created"`
}

// GenerateUsage 上游用量统计（方舟 usage 字段）。
type GenerateUsage struct {
	GeneratedImages int `json:"generated_images"`
	OutputTokens    int `json:"output_tokens"`
	TotalTokens     int `json:"total_tokens"`
}

// arkResponse 方舟 images/generations 响应的解析所需子集。
// 实测 data[] 元素只有 url + size（无 index、无 b64_json）；
// b64_json 字段保留为防御性兼容，Index 缺失时以切片位置代替。
type arkResponse struct {
	Model   string `json:"model"`
	Created int64  `json:"created"`
	Data    []struct {
		URL     string `json:"url"`
		B64JSON string `json:"b64_json"`
		Size    string `json:"size"`
	} `json:"data"`
	Usage struct {
		GeneratedImages int `json:"generated_images"`
		OutputTokens    int `json:"output_tokens"`
		TotalTokens     int `json:"total_tokens"`
	} `json:"usage"`
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// DesignService 编排校验、请求发送与结果解析。
type DesignService struct {
	client *DesignClient
}

// NewDesignService 构造 DesignService。默认指向方舟正式端点，
// apiKey 来自 config.Design.APIKey；opts 里显式传 WithBaseURL/WithAPIKey
// 可覆盖默认值（测试注入用）。
func NewDesignService(http *httpclient.Client, apiKey string, opts ...DesignClientOption) *DesignService {
	opts = append(opts, WithAPIKey(apiKey))
	client := NewDesignClient(http, append([]DesignClientOption{WithBaseURL(baseURL)}, opts...)...)
	return &DesignService{client: client}
}

// Generate 校验入参并完成一次文生图/图生图，结果图字节随 GenerateResult 返回。
func (s *DesignService) Generate(ctx context.Context, req GenerateRequest) (*GenerateResult, error) {
	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" {
		return nil, ErrEmptyPrompt
	}

	model, err := resolveModel(req.Model)
	if err != nil {
		return nil, err
	}
	size, err := normalizeSize(req.Size)
	if err != nil {
		return nil, err
	}

	raw, err := s.client.SendRequest(ctx, s.client.BuildPayload(prompt, model, req.Images, size))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUpstream, err)
	}

	var resp arkResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, fmt.Errorf("%w: decode response: %v", ErrUpstream, err)
	}
	if resp.Error.Code != "" {
		return nil, fmt.Errorf("%w: %s %s", ErrUpstream, resp.Error.Code, resp.Error.Message)
	}
	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("%w: no image in response", ErrUpstream)
	}

	images := make([]GeneratedImage, 0, len(resp.Data))
	for i, d := range resp.Data {
		images = append(images, GeneratedImage{Index: i, Size: d.Size, URL: d.URL})
	}

	slog.InfoContext(ctx, "design generated",
		"model", model, "size", size, "ref_images", len(req.Images), "output", len(images),
		"total_tokens", resp.Usage.TotalTokens)
	return &GenerateResult{
		Model:   model,
		Images:  images,
		Usage:   GenerateUsage(resp.Usage),
		Created: resp.Created,
	}, nil
}

// resolveModel 把展示名或模型 ID 归一为方舟模型 ID。
func resolveModel(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return models[defaultModelKey], nil
	}
	if id, ok := models[name]; ok {
		return id, nil
	}
	if slices.Contains(slices.Collect(maps.Values(models)), name) {
		return name, nil
	}
	return "", fmt.Errorf("%w: %q (supported: %s)", ErrUnknownModel,
		name, strings.Join(slices.Sorted(maps.Keys(models)), ", "))
}

// normalizeSize 校验尺寸：空取默认；adaptive 放行；否则必须为 WxH 整数。
// 不做范围限制，交给上游校验，避免硬编码尺寸集合把合法请求挡掉。
func normalizeSize(size string) (string, error) {
	size = strings.TrimSpace(size)
	if size == "" {
		return defaultSize, nil
	}
	if size == "adaptive" {
		return size, nil
	}
	w, h, ok := strings.Cut(size, "x")
	if !ok {
		return "", fmt.Errorf("%w: %q", ErrInvalidSize, size)
	}
	if _, err := strconv.Atoi(w); err != nil {
		return "", fmt.Errorf("%w: %q", ErrInvalidSize, size)
	}
	if _, err := strconv.Atoi(h); err != nil {
		return "", fmt.Errorf("%w: %q", ErrInvalidSize, size)
	}
	return size, nil
}
