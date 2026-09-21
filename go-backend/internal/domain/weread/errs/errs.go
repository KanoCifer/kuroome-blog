// Package wereaderrs 定义微信读书（weread）域业务错误。
// 全仓唯一来源：service/weread 子包与 handler 都从这里引用。
package wereaderrs

import "errors"

var (
	// ErrInvalidToken 用户提交的 token 格式非法（非 wrk- 前缀等）。
	ErrInvalidToken = errors.New("[weread] Token is invaild!")
	// ErrUpstream 微信读书上游返回错误。
	ErrUpstream = errors.New("[weread] upstream failed")
	// ErrUnauthorized 用户微信读书授权已过期或无效。
	ErrUnauthorized = errors.New("[weread] unauthorized or token expired")
)

// ErrInvaildWereadToken 保留旧名（拼写错误的历史包袱），指向 ErrInvalidToken。
//
// Deprecated: 用 ErrInvalidToken。
var ErrInvaildWereadToken = ErrInvalidToken
