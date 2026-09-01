package dto

import "github.com/KanoCifer/kuroome-blog/internal/model"

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username  string `json:"username" binding:"required,min=3,max=50"`
	Password  string `json:"password" binding:"required,min=6"`
	Email     string `json:"email" binding:"required,email"`
	EmailCode string `json:"email_code" binding:"required"`
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
}

// MagicLoginAuthRequest 使用 token 完成魔法登录的请求。
type MagicLoginAuthRequest struct {
	Token string `json:"token" binding:"required"`
}
