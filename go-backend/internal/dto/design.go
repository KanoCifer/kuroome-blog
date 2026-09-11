// Package dto —— 设计出图（nomu/Seedream）请求 DTO。
//
// 响应不另定义 DTO：handler 直接透传 nomu.GenerateResult
// （model / images / usage / created），避免字段二次映射。
package dto

// GenerateDesignRequest 一次出图请求。
//   - Images 为空 = 文生图；
//   - 1 张 = 单参考图；
//   - 多张 = 多参考图（顺序即 prompt 中 图1/图2 引用）。
//
// Model 决定服务商与计费档位：gpt-image-* 路由到 apiyi，Doubao-* 路由到
// 方舟 Seedream；缺省用 DESIGN_PROVIDER 的默认模型。
//
// Size 仅方舟协议有效；apiyi 的 gpt-image-2-all 禁传 size/quality/n/aspect_ratio，
// 输出尺寸靠 prompt 前缀控制（如「横版 16:9」）。
// ResponseFormat 仅 apiyi 等 OpenAI 系协议使用（b64_json / url），
// 空则用服务端默认；不依赖上游默认值。
type GenerateDesignRequest struct {
	Prompt         string   `json:"prompt" binding:"required"`
	Model          string   `json:"model,omitempty"`
	Size           string   `json:"size,omitempty"`
	Images         []string `json:"images,omitempty"`
	ResponseFormat string   `json:"response_format,omitempty"`
}
