package dto

import "github.com/KanoCifer/kuroome-blog/internal/model"

// RegisterRequest 注册请求
//
// Mode 决定 email_code 的 Redis 命名空间（email_code:<email>:<mode>），
// 区分 blog（kanocifer.chat 落地页）和 nomu（NoonToolv1 Chrome 扩展），
// 同邮箱同时申请两个 mode 的验证码互不覆盖。缺省 / 非法值走 blog 兜底。
type RegisterRequest struct {
	Username  string `json:"username" binding:"required,min=3,max=50"`
	Password  string `json:"password" binding:"required,min=6"`
	Email     string `json:"email" binding:"required,email"`
	EmailCode string `json:"email_code" binding:"required"`
	Mode      string `json:"mode,omitempty" binding:"omitempty,oneof=blog nomu"`
}

// EmailCodeRequest 申请注册验证码邮件的请求。
//
// Mode 决定 HTML 模板 + Redis 命名空间（与 RegisterRequest.Mode 同语义）。
// 缺省 / 非法值走 blog 兜底，handler 不强制 client 传 mode 以保留向后兼容。
type EmailCodeRequest struct {
	Email string `json:"email" binding:"required,email"`
	Mode  string `json:"mode,omitempty" binding:"omitempty,oneof=blog nomu"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserResponse 对外暴露的用户结构（不含敏感字段）
type UserResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

// TokensResponse access + refresh token 对，由 service 生成、跨层传递。
type TokensResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	UserResponse
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
}

// FromUser 从 model.User 转换为 DTO（isAdmin 由调用方显式传入）。
func FromUser(u *model.User, isAdmin bool) UserResponse {
	return UserResponse{
		ID:       u.ID,
		Username: u.Username,
		IsAdmin:  isAdmin,
	}
}

// PasskeyRegistrationRequest Passkey 注册请求（response 为浏览器返回的 PublicKeyCredential）。
type PasskeyRegistrationRequest struct {
	Response map[string]any `json:"response"`
}

// PasskeyAuthRequest Passkey 认证请求（assertion 为浏览器返回的 AuthenticatorAssertionResponse）。
type PasskeyAuthRequest struct {
	Assertion map[string]any `json:"assertion"`
}

// MagicLoginEmailRequest 申请邮件魔法登录链接的请求。
//
// Mode 决定邮件里链接落到哪个前端 + Redis 缓存命名空间：
//   - "blog" → kanocifer.chat SPA（落地页魔法登录）
//   - "nomu" → Chrome 扩展（NoonToolv1）的 options.html#/login/magic
//
// 非法 mode 走 binding oneof 拒绝；handler 解析后透传给 service。
type MagicLoginEmailRequest struct {
	Email string `json:"email" binding:"required,email"`
	Mode  string `json:"mode"  binding:"required,oneof=blog nomu"`
	// DeviceID 仅 nomu 模式用：Nomu 扩展申请魔法登录邮件时生成，用于
	// 后续轮询同一 device_id 取最终登录结果。缺省不落轮询槽位。
	DeviceID string `json:"device_id,omitempty"`
}

// MagicLoginConsumeRequest 回调页转发的一次性登录 token。
//
// Mode 决定 handler 的返回形态，与 service 内部的 Redis 命名空间无关
// （token 自带 mode 段，service 按它查 redis key）。
//
//   - "blog" → kanocifer.chat SPA 回调：handler 写 refresh cookie + 返 access/refresh/user dict；
//   - "nomu" → Nomu 扩展回调：service 内部把结果写到 device 槽位，handler 返 200 即可。
//
// 缺省 / 非法值走 blog 兜底，与 email-code / magic-login email 端点保持一致。
type MagicLoginConsumeRequest struct {
	Token string `json:"token" binding:"required"`
	Mode  string `json:"mode,omitempty" binding:"omitempty,oneof=blog nomu"`
}
