// Package dto —— 设计出图（nomu/Seedream）请求 DTO。
//
// 响应不另定义 DTO：handler 直接透传 nomu.GenerateResult
// （model / images / usage / created），避免字段二次映射。
package dto

// GenerateDesignRequest 一次出图请求。
//   - Images 为空 = 文生图；
//   - 1 张 = 单参考图（payload.image）；
//   - 多张 = 多参考图（payload.images）。
type GenerateDesignRequest struct {
	Prompt string   `json:"prompt" binding:"required"`
	Model  string   `json:"model,omitempty"`
	Size   string   `json:"size,omitempty"`
	Images []string `json:"images,omitempty"`
}
