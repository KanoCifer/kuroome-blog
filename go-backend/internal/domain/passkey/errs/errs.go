// Package passkeyerrs 定义 Passkey / WebAuthn 域业务错误。
package passkeyerrs

import "github.com/KanoCifer/kuroome-blog/internal/apierr"

var (
	ErrPasskeyExists   = apierr.New(400, "您的账户已经绑定了Passkey")
	ErrPasskeyNotFound = apierr.New(400, "Passkey 凭证不存在")
	ErrInvalidPasskey  = apierr.New(400, "无效的 Passkey 认证响应")
)
