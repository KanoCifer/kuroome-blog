package errs

import "errors"

// 业务错误，跨 service / handler / 测试统一引用，避免各层直接依赖 service 包。

var (
	ErrInvalidCredentials = errors.New("用户名或密码错误")
	ErrUserExists         = errors.New("用户名已存在")
	ErrEmailExists        = errors.New("邮箱已注册")
	ErrInvalidEmailCode   = errors.New("验证码无效")
	ErrUserNotFound       = errors.New("用户不存在")
	ErrInvalidToken       = errors.New("无效的令牌")
	ErrPostNotFound       = errors.New("blog post not found")
	ErrInvalidPostID      = errors.New("invalid post id")

	// Passkey / WebAuthn 错误
	ErrPasskeyExists      = errors.New("您的账户已经绑定了Passkey")
	ErrPasskeyNotFound    = errors.New("Passkey 凭证不存在")
	ErrInvalidPasskey     = errors.New("无效的 Passkey 认证响应")
)
