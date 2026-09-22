package handler

import (
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/apierr"
	"github.com/KanoCifer/kuroome-blog/internal/response"
)

// internalErrMsg 全仓统一的 500 响应文案 —— 内部错误细节只进日志，不外泄给客户端。
const internalErrMsg = "internal error"

// respondErr 统一错误出口：errors.As 命中 *apierr.Error → 用其状态码与文案
// （status==500 强制回退 internal error，兜底防误写外泄）；未命中 → 500 +
// internalErrMsg。哨兵在定义处声明状态码（internal/apierr），本层不再查表。
// 日志遵循 logging 规约：handler 对 4xx 记 WARN、5xx 记 ERROR，
// logMsg 给人、error + attrs 给机器。
// err == nil 返回 false（未响应）；否则已写出响应，调用方应立即 return。
func respondErr(c *gin.Context, err error, logMsg string, attrs ...any) bool {
	if err == nil {
		return false
	}
	status, msg := 500, internalErrMsg
	if apiErr, ok := errors.AsType[*apierr.Error](err); ok {
		status = apiErr.Status()
		msg = apiErr.Error()
		if status == 500 { // ponytail: 兜底，New(500, …) 也不外泄细节；升级路径：按需细分
			msg = internalErrMsg
		}
	}
	args := append([]any{"error", err}, attrs...)
	if status >= 500 {
		slog.ErrorContext(c.Request.Context(), logMsg, args...)
	} else {
		slog.WarnContext(c.Request.Context(), logMsg, args...)
	}
	response.APIError(c, msg, status)
	return true
}

// bindJSON 统一请求体绑定失败响应：400 + invalid request body，不外泄 gin 内部
// 绑定错误细节。成功返回 true；失败已写响应并返回 false，调用方应立即 return。
func bindJSON[T any](c *gin.Context, out *T) bool {
	if err := c.ShouldBindJSON(out); err != nil {
		slog.WarnContext(c.Request.Context(), "bind request body failed", "error", err)
		response.APIError(c, "invalid request body")
		return false
	}
	return true
}
