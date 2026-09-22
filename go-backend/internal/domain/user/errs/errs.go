// Package usererrs 定义 user 域业务错误。
// 跨域使用（如 passkey/upload/github）正常 import 此包。
package usererrs

import "github.com/KanoCifer/kuroome-blog/internal/apierr"

var (
	ErrInvalidCredentials = apierr.New(401, "用户名或密码错误")
	ErrUserExists         = apierr.New(409, "用户名已存在")
	ErrEmailExists        = apierr.New(409, "邮箱已注册")
	ErrInvalidEmailCode   = apierr.New(400, "验证码无效")
	ErrUserNotFound       = apierr.New(404, "用户不存在")
	ErrInvalidToken       = apierr.New(401, "无效的令牌")
	ErrInvalidMagicToken  = apierr.New(401, "魔法链接无效或已过期")
)
