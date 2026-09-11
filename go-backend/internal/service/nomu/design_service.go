// Package nomu —— 设计出图业务。
//
// DesignService 面向 handler 只暴露一个 Generate 入口：
//   - 文生图：只传 Prompt；
//   - 图生图：Images 传 1 张（单参考图，payload 用 image）或多张（多参考图，payload 用 images）。
//
// 服务商接入参数由 Provider 承载（协议 / 端点 / 鉴权 / 模型目录）：默认方舟
// 豆包 Seedream；apiyi 的 gpt-image-2-all 走 OpenAI 兼容协议（文生图
// /images/generations，图片编辑 /images/edits multipart）。换服务商只换 Provider。
//
// 编排流程：校验入参 → 解析模型别名（得出计费档位）→ 积分预扣 1 张作闸门
// （余额不足拒单，不调上游）→ 按协议组包发送（参考图先压缩）→ 解析上游响应
// （data[] 里 url / b64_json 二选一，两种都兜）→ 结果图落盘 → 返回本站
// /v3/media 同源地址。失败全额退款；上游响应 data[] 张数不定，成功按实际张数
// Settle 校正。上游临时 URL 无 CORS 头且会过期（apiyi 约 24h），一律立即转存。
package nomu

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"path/filepath"
	"strings"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

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
	// Model models 的展示名或上游模型 ID，空则取默认模型。
	Model string
	// Size 上游 size 字符串（档位枚举 / WxH）。仅方舟协议透传；
	// OpenAI 系协议（apiyi）禁传 size（会被静默忽略甚至触发校验错误）。
	Size string
	// Images 参考图。方舟协议：URL 或 base64 data URL；OpenAI 系协议：
	// base64 data URL（http(s) URL 会由 service 拉取后压缩）。
	// 0 张 = 文生图；1 张 = 单参考图；多张 = 多参考图（顺序即 prompt 中 图1/图2 引用）。
	Images []string
	// ResponseFormat 仅 OpenAI 系协议使用，显式下发 "b64_json" / "url"。
	// 空则用 provider 默认（apiyi=b64_json）。不依赖上游默认值。
	ResponseFormat string
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

// generateResponse 各服务商 images/* 响应的公共子集（方舟与 OpenAI 系共用一个信封）。
// 方舟 data[] 元素为 url + size；apiyi（OpenAI 系）为 b64_json 或 url 二选一。
// Index 缺失时以切片位置代替。
type generateResponse struct {
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

// DesignService 编排校验、模型路由、积分预扣/退款、请求发送与结果解析。
type DesignService struct {
	router  *Router
	clients map[string]*DesignClient // provider.Name → 客户端（鉴权/端点随 provider 不同）
	store   ImageStore
	credits Creditser
}

// NewDesignService 构造 DesignService。router 按模型名路由到服务商；
// store 为结果图落盘实现（可 nil，nil 时结果只携带上游临时 URL）；
// credits 为积分扣退实现（可 nil = 不计费）。
func NewDesignService(http *httpclient.Client, router *Router, store ImageStore, credits Creditser) *DesignService {
	clients := make(map[string]*DesignClient, len(router.Providers()))
	for _, p := range router.Providers() {
		clients[p.Name] = NewDesignClient(http, p)
	}
	return &DesignService{router: router, clients: clients, store: store, credits: credits}
}

// NewSingleDesignService 单服务商装配（测试 / 只接一个上游的部署）。
func NewSingleDesignService(http *httpclient.Client, provider Provider, store ImageStore, credits Creditser) *DesignService {
	return NewDesignService(http, Single(provider), store, credits)
}

// Generate 校验入参、预扣积分闸门（1 张），完成一次文生图/图生图。
//
// 计费时序：Router.Resolve 按 model 选服务商并得出档位 → Preconsume(1)
// （余额连 1 张都不够直接返回，不调上游）→ 上游调用 → 响应 data[] 张数
// Settle 校正（多张补扣可扣负、少张退差）
// → 落盘 → 失败全额退。张数只有响应才知道，预扣只是闸门，结算以 len(data) 为准。
// 退款用脱离请求 cancel 的 context，避免客户端断开导致退款一起被取消。
func (s *DesignService) Generate(ctx context.Context, req GenerateRequest) (result *GenerateResult, err error) {
	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" {
		return nil, ErrEmptyPrompt
	}

	prov, spec, err := s.router.Resolve(req.Model)
	if err != nil {
		return nil, err
	}
	client := s.clients[prov.Name]
	model := spec.ID
	size := strings.TrimSpace(req.Size)

	// ponytail: 崩溃窗口丢退款（预扣成功、退款前进程挂掉）由 credit_service 注释
	// 统一认领，升级路径=对账 job。此处 defer 只覆盖 panic 路径。
	bizID := req.IdempotencyKey
	if s.credits != nil {
		tx, created, cerr := s.credits.Preconsume(ctx, req.UserID, creditSourceDesign, spec.Variant, 1, bizID, nil)
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

	raw, err := s.sendUpstream(ctx, client, model, prompt, req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUpstream, err)
	}

	var resp generateResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, fmt.Errorf("%w: decode response: %v", ErrUpstream, err)
	}
	// OpenAI 系错误体只有 message、无 code；方舟两者都有。任一非空即属错误。
	if resp.Error.Code != "" || resp.Error.Message != "" {
		return nil, fmt.Errorf("%w: %s %s", ErrUpstream,
			resp.Error.Code, strings.TrimSpace(resp.Error.Message))
	}
	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("%w: no image in response", ErrUpstream)
	}

	images := make([]GeneratedImage, 0, len(resp.Data))
	for i, d := range resp.Data {
		img := GeneratedImage{Index: i, Size: d.Size, URL: d.URL}
		// b64_json 与 url 同一条 data[] 里二选一（两种都要兜住）。
		// b64 无 data: 前缀；url 会过期（apiyi 约 24h），必须立即转存。
		switch {
		case d.B64JSON != "" && s.store != nil:
			data, derr := decodeB64(d.B64JSON)
			if derr != nil {
				return nil, fmt.Errorf("%w: decode b64 image %d: %v", ErrUpstream, i, derr)
			}
			rel, uerr := s.store.UploadDesignImage(ctx, req.UserID, bytes.NewReader(data))
			if uerr != nil {
				return nil, uerr
			}
			img.URL = mediaPrefix + filepath.ToSlash(rel)
		case d.B64JSON != "":
			// 未装配 store：直接回传 base64（前端拼 data: 前缀渲染，可另存）。
			img.URL = "data:image/png;base64," + d.B64JSON
		case d.URL != "" && s.store != nil:
			data, ferr := client.FetchBlob(ctx, d.URL)
			if ferr != nil {
				return nil, fmt.Errorf("%w: fetch image %d: %v", ErrUpstream, i, ferr)
			}
			rel, uerr := s.store.UploadDesignImage(ctx, req.UserID, bytes.NewReader(data))
			if uerr != nil {
				return nil, uerr
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

// sendUpstream 按服务商协议组包发送。client 由模型路由得出，协议与默认
// response_format 从 client 自身的 provider 读——三者同源，不会错配。
//
//   - OpenAI 系（apiyi）：无图走 /images/generations（JSON），有图走 /images/edits
//     （multipart，参考图先压缩）；只带 model/prompt/response_format。
//   - 方舟：单一 JSON 端点，image 字段内嵌，size 透传。
func (s *DesignService) sendUpstream(ctx context.Context, client *DesignClient, model, prompt string, req GenerateRequest) (json.RawMessage, error) {
	if client.provider.Protocol == ProtocolOpenAI {
		rf := client.provider.ResponseFormat
		if req.ResponseFormat != "" {
			rf = req.ResponseFormat
		}
		if len(req.Images) == 0 {
			return client.SendOpenAIGenerate(ctx, model, prompt, rf)
		}
		refs, err := s.loadRefImages(ctx, client, req.Images)
		if err != nil {
			return nil, err
		}
		return client.SendOpenAIEdit(ctx, model, prompt, rf, refs)
	}
	return client.SendRequest(ctx, client.BuildPayload(prompt, model, req.Images, strings.TrimSpace(req.Size)))
}

// loadRefImages 把参考图归一为可上传的字节：base64 data URL 直接解码，
// http(s) URL 先拉取（用目标服务商的 client，鉴权/超时一致）；随后统一压缩
// （>1.5MB 才处理）到上传预算内。
func (s *DesignService) loadRefImages(ctx context.Context, client *DesignClient, images []string) ([][]byte, error) {
	raws := make([][]byte, 0, len(images))
	for i, img := range images {
		img = strings.TrimSpace(img)
		switch {
		case strings.HasPrefix(img, "data:"):
			// data:[mime][;base64],<payload>
			idx := strings.Index(img, ",")
			if idx < 0 {
				return nil, fmt.Errorf("ref image %d: malformed data URL", i)
			}
			data, derr := decodeB64(img[idx+1:])
			if derr != nil {
				return nil, fmt.Errorf("ref image %d: decode base64: %w", i, derr)
			}
			raws = append(raws, data)
		case strings.HasPrefix(img, "http://"), strings.HasPrefix(img, "https://"):
			data, ferr := client.FetchBlob(ctx, img)
			if ferr != nil {
				return nil, fmt.Errorf("ref image %d: fetch: %w", i, ferr)
			}
			raws = append(raws, data)
		default:
			return nil, fmt.Errorf("ref image %d: unsupported reference (want data URL or http(s) URL)", i)
		}
	}
	return compressImages(raws)
}

// decodeB64 宽容解码 base64，兼容标准/URL-safe 与有/无填充变体。
func decodeB64(s string) ([]byte, error) {
	s = strings.TrimSpace(s)
	if data, err := base64.StdEncoding.DecodeString(s); err == nil {
		return data, nil
	}
	if data, err := base64.RawStdEncoding.DecodeString(s); err == nil {
		return data, nil
	}
	if data, err := base64.URLEncoding.DecodeString(s); err == nil {
		return data, nil
	}
	return base64.RawURLEncoding.DecodeString(s)
}
