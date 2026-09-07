// Package nomu —— 设计出图业务（火山方舟豆包 Seedream）。
//
// DesignService 面向 handler 只暴露一个 Generate 入口：
//   - 文生图：只传 Prompt；
//   - 图生图：Images 传 1 张（单参考图，payload 用 image）或多张（多参考图，payload 用 images）。
//
// 编排流程：校验入参 → 解析模型别名（得出 lite/pro 档位）→ 积分预扣 1 张作闸门
// （余额不足拒单，不调方舟）→ DesignClient 组包发送 → 解析方舟响应
// → FetchBlob 拉取结果图 → ImageStore 落盘 → 返回本站 /v3/media 同源地址。
// 失败全额退款；方舟响应 data[] 张数不定（实测可多张），成功按实际张数 Settle 校正。
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
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

const (
	// baseURL 火山方舟图片生成端点（doubao-seedream 系列）。
	baseURL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

	// defaultModelKey 未指定模型时的兜底（成本低档）。
	defaultModelKey = "Doubao-Seedream-5.0-lite"
)

// models 面向用户的展示名 → 方舟模型 ID + 计费档位。直接传 ID 也接受。
var models = map[string]modelSpec{
	"Doubao-Seedream-5.0-pro":  {id: "doubao-seedream-5-0-pro-260628", variant: "pro"},
	"Doubao-Seedream-5.0-lite": {id: "doubao-seedream-5-0-260128", variant: "lite"},
}

// modelSpec 方舟模型 ID 与 credit_price.variant 档位（lite/pro）。
type modelSpec struct {
	id      string
	variant string
}

var (
	// ErrEmptyPrompt 入参校验失败：prompt 为空。
	ErrEmptyPrompt = errors.New("design: prompt is required")
	// ErrUnknownModel 模型别名/ID 不在 models 支持范围内。
	ErrUnknownModel = errors.New("design: unknown model")
	// ErrUpstream 上游（方舟）请求失败、响应异常或图片拉取失败。
	ErrUpstream = errors.New("design: upstream generate failed")
	// ErrCredit 积分预扣失败（余额不足 / 无定价 / DB 故障）。错误链保留
	// service.CreditService 的哨兵（ErrInsufficientBalance）供 handler 映射 402。
	ErrCredit = errors.New("design: credit preconsume failed")
)

// creditSourceDesign 生图计费的流水 source（对齐 credit_price 词表 design_generate）。
const creditSourceDesign = "design_generate"

// GenerateRequest 一次出图请求。
type GenerateRequest struct {
	// UserID 发起用户，用于结果图落盘目录归属与积分扣减；0 表示不落盘。
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
	// IdempotencyKey 计费幂等键（handler 从 Idempotency-Key 头透传）。
	// 空则服务端生成 UUID。同键重试 Preconsume 命中唯一索引不双扣。
	IdempotencyKey string
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

// Creditser 积分扣退能力（*service.CreditService 提供）。本地最小接口避免
// nomu ← service 的包依赖方向反转；nil 时不计费（测试/未装配兜底）。
// Preconsume 的 created=false 表示幂等命中（本次未新扣），失败退款须跳过它。
type Creditser interface {
	Preconsume(ctx context.Context, userID uint, source, variant string, qty int, bizID string, meta map[string]any) (*model.CreditTransaction, bool, error)
	Refund(ctx context.Context, userID uint, source, bizID string, amount int64, meta map[string]any) (*model.CreditTransaction, error)
	Settle(ctx context.Context, userID uint, source, bizID string, actualQty int) (*model.CreditTransaction, error)
}

// DesignService 编排校验、积分预扣/退款、请求发送与结果解析。
type DesignService struct {
	client  *DesignClient
	store   ImageStore
	credits Creditser
}

// NewDesignService 构造 DesignService。默认指向方舟正式端点，
// apiKey 来自 config.Design.APIKey；store 为结果图落盘实现（可 nil，
// nil 时结果只携带上游临时 URL）；credits 为积分扣退实现（可 nil = 不计费）；
// opts 可覆盖默认端点（测试注入用）。
func NewDesignService(http *httpclient.Client, apiKey string, store ImageStore, credits Creditser, opts ...DesignClientOption) *DesignService {
	opts = append(opts, WithAPIKey(apiKey))
	client := NewDesignClient(http, append([]DesignClientOption{WithBaseURL(baseURL)}, opts...)...)
	return &DesignService{client: client, store: store, credits: credits}
}

// Generate 校验入参、预扣积分闸门（1 张），完成一次文生图/图生图。
//
// 计费时序：resolveModel 得出档位 → Preconsume(1)（余额连 1 张都不够直接返回，
// 不调方舟）→ 方舟调用 → 响应 data[] 张数 Settle 校正（多张补扣可扣负、少张退差）
// → 落盘 → 失败全额退。张数只有响应才知道，预扣只是闸门，结算以 len(data) 为准。
// 退款用脱离请求 cancel 的 context，避免客户端断开导致退款一起被取消。
func (s *DesignService) Generate(ctx context.Context, req GenerateRequest) (result *GenerateResult, err error) {
	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" {
		return nil, ErrEmptyPrompt
	}

	spec, err := resolveModel(req.Model)
	if err != nil {
		return nil, err
	}
	model := spec.id
	size := strings.TrimSpace(req.Size)

	// ponytail: 崩溃窗口丢退款（预扣成功、退款前进程挂掉）由 credit_service 注释
	// 统一认领，升级路径=对账 job。此处 defer 只覆盖 panic 路径。
	bizID := req.IdempotencyKey
	if s.credits != nil {
		tx, created, cerr := s.credits.Preconsume(ctx, req.UserID, creditSourceDesign, spec.variant, 1, bizID, nil)
		if cerr != nil {
			// 双 %w：外层 ErrCredit 供笼统分流，内层保留 credit 哨兵
			// （ErrInsufficientBalance）供 handler 映射 402。
			return nil, fmt.Errorf("%w: %w", ErrCredit, cerr)
		}
		bizID = tx.BizID // 幂等命中/服务端生成时回填真实流水键，退款按它冲正
		defer func() {
			// 只对"本次新扣"的流水挂失败退款：created=false 的重放请求若在本轮失败，
			// 首笔扣费可能已成功交付过，退掉它就等于重放免单。
			if !created || err == nil {
				return // 成功即扣满（单次最多 1 张）
			}
			rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
			defer cancel()
			if _, rerr := s.credits.Refund(rctx, req.UserID, creditSourceDesign, bizID, 0, nil); rerr != nil {
				slog.ErrorContext(rctx, "design credit refund failed",
					"user_id", req.UserID, "biz_id", bizID,
					"full", true, "error", rerr.Error())
			}
		}()
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

	// 计费结算：预扣只是 1 张闸门，实际张数 = len(data[])；多张补扣差额（可扣负，
	// 见 CreditService.Settle）。无条件调用：张数与闸门相等时 Settle 内部 no-op，
	// 少一条分支就少一个"忘了结算"的口子。结算失败不阻断结果返回（用户已拿到图），
	// 只记日志留给对账。
	if s.credits != nil {
		sctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 10*time.Second)
		defer cancel()
		if _, serr := s.credits.Settle(sctx, req.UserID, creditSourceDesign, bizID, len(images)); serr != nil {
			slog.ErrorContext(sctx, "design credit settle failed",
				"user_id", req.UserID, "biz_id", bizID, "images", len(images), "error", serr.Error())
		}
	}

	return &GenerateResult{
		Model:   model,
		Images:  images,
		Usage:   GenerateUsage(resp.Usage),
		Created: resp.Created,
	}, nil
}

// resolveModel 把展示名或模型 ID 归一为 modelSpec（方舟模型 ID + 计费档位）。
func resolveModel(name string) (modelSpec, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return models[defaultModelKey], nil
	}
	if spec, ok := models[name]; ok {
		return spec, nil
	}
	for _, spec := range models {
		if spec.id == name {
			return spec, nil
		}
	}
	return modelSpec{}, fmt.Errorf("%w: %q (supported: %s)", ErrUnknownModel,
		name, strings.Join(slices.Sorted(maps.Keys(models)), ", "))
}
