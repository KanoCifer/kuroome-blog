// Package apierr 定义携带 HTTP 状态码的业务错误。
//
// sentinel 在定义处声明对外状态码与文案，handler 用 errors.As 取用
// （见 internal/handler/respond.go 的 respondErr）：命中 → 用其状态码与
// 文案；未命中 → 500 internal error。本包是叶子包（仅依赖标准库），
// domain / infra / service 层均可安全 import。
package apierr

// Error 携带 HTTP 状态码的业务错误。msg 同时充当日志文本与对外文案；
// 内部细节不应写进 msg —— 5xx 对外文案由 respondErr 兜底为
// internal error（status==500 时强制），非 500 的 5xx（如 502/503）
// 若需公开固定文案则显式传入。
type Error struct {
	status int
	msg    string
}

// New 构造携带状态码的错误。sentinel 定义处使用：
//
//	var ErrUserNotFound = apierr.New(404, "用户不存在")
func New(status int, msg string) *Error {
	return &Error{status: status, msg: msg}
}

func (e *Error) Error() string { return e.msg }

func (e *Error) Status() int { return e.status }
