// Package nomu —— 设计出图业务（火山方舟豆包 Seedream）。
//
// DesignService 面向 handler 只暴露一个 Generate 入口：
//   - 文生图：只传 Prompt；
//   - 图生图：Images 传 1 张（单参考图，payload 用 image）或多张（多参考图，payload 用 images）。
//
// 编排流程：校验入参 → 解析模型别名 → DesignClient 组包发送 → 解析方舟响应
// → FetchBlob 拉取结果图 → ImageStore 落盘 → 返回本站 /v3/media 同源地址。
// 上游 TOS 临时 URL 无 CORS 头且会过期，不对前端暴露。
package nomu

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"maps"
	"path/filepath"
	"slices"
	"strings"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

const (
	// baseURL 火山方舟图片生成端点（doubao-seedream 系列）。
	baseURL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

	// defaultModelKey 未指定模型时的兜底（成本低档）。
	defaultModelKey = "Doubao-Seedream-5.0-lite"
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
	// ErrUpstream 上游（方舟）请求失败、响应异常或图片拉取失败。
	ErrUpstream = errors.New("design: upstream generate failed")
)

// GenerateRequest 一次出图请求。
type GenerateRequest struct {
	// UserID 发起用户，用于结果图落盘目录归属；0 表示不落盘。
	UserID uint
	// Prompt 画面描述，必填。
	Prompt string
	// Model models 的展示名或方舟模型 ID，空则取默认模型。
	Model string
	// Size 上游 size 字符串（如 '1K' / '1.5K' / '2K' 档位或 'WxH'）。
	// 原样透传给方舟，不做本地推导；空则省略字段、用上游默认。
	Size string
	// Images 参考图（URL 或 base64 data URL）。0 张 = 文生图；1 张走 image；多张走 image 数组。
	Images []string
}

// GeneratedImage 单张结果图。URL 已落盘为本站同源媒体地址
// （store 为 nil 时退化为上游临时地址，会过期且无 CORS 头）。
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

// mediaPrefix 落盘图片的对外服务前缀，与 router 的 Static 挂载点一致。
const mediaPrefix = "/v3/media/"

// ImageStore 出图结果落盘能力（*service.uploadService 提供）。
type ImageStore interface {
	UploadDesignImage(ctx context.Context, userID uint, src io.Reader) (string, error)
}

// DesignService 编排校验、请求发送与结果解析。
type DesignService struct {
	client *DesignClient
	store  ImageStore
}

// NewDesignService 构造 DesignService。默认指向方舟正式端点，
// apiKey 来自 config.Design.APIKey；store 为结果图落盘实现（可 nil，
// nil 时结果只携带上游临时 URL）；opts 可覆盖默认端点（测试注入用）。
func NewDesignService(http *httpclient.Client, apiKey string, store ImageStore, opts ...DesignClientOption) *DesignService {
	opts = append(opts, WithAPIKey(apiKey))
	client := NewDesignClient(http, append([]DesignClientOption{WithBaseURL(baseURL)}, opts...)...)
	return &DesignService{client: client, store: store}
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
	size := strings.TrimSpace(req.Size)

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
		img := GeneratedImage{Index: i, Size: d.Size, URL: d.URL}
		if s.store != nil && d.URL != "" {
			data, err := s.client.FetchBlob(ctx, d.URL)
			if err != nil {
				return nil, fmt.Errorf("%w: fetch image %d: %v", ErrUpstream, i, err)
			}
			rel, err := s.store.UploadDesignImage(ctx, req.UserID, bytes.NewReader(data))
			if err != nil {
				return nil, err
			}
			img.URL = mediaPrefix + filepath.ToSlash(rel)
		}
		images = append(images, img)
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
