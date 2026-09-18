package response

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/middleware"
)

type Response struct {
	Data    any    `json:"data"`
	Message string `json:"message"`
}

// setProcessTime 从 Context 取出请求起始时间，计算耗时并写入
// X-Process-Time 头。须在 c.JSON / c.AbortWithStatusJSON 之前调用，
// 否则 header 已被刷到网络，再设无效。
func setProcessTime(c *gin.Context) {
	v, ok := c.Get(middleware.RequestStart)
	if !ok {
		return
	}
	start, ok := v.(time.Time)
	if !ok {
		return
	}
	p := strconv.FormatInt(time.Since(start).Milliseconds(), 10)
	c.Header("X-Process-Time", p+"ms")
}

func Success(c *gin.Context, data any, message ...string) {
	msg := "success"
	if len(message) > 0 {
		msg = message[0]
	}
	setProcessTime(c)
	c.JSON(200, Response{
		Data:    data,
		Message: msg,
	})
}

func APIError(c *gin.Context, message string, statusCode ...int) {
	code := 400
	if len(statusCode) > 0 {
		code = statusCode[0]
	}
	setProcessTime(c)
	c.AbortWithStatusJSON(code, Response{
		Data:    nil,
		Message: message,
	})
}

// APIErrorWithCode 结构化错误响应,带 code 字段供客户端程序化识别。
//
// 适用场景: 客户端需要区分错误类型(token 过期 / 限流 / 参数错)而不仅是 message
// 字符串。code 应使用稳定的 snake_case 短串,见 handler 各调用点列出的可选值。
//
// 与 APIError 的关系: 新增字段而不替换,老调用点可以保留;只在确实需要客户端按
// code 分支处理的失败路径上替换为 APIErrorWithCode。
func APIErrorWithCode(c *gin.Context, code, message string, statusCode ...int) {
	status := 400
	if len(statusCode) > 0 {
		status = statusCode[0]
	}
	setProcessTime(c)
	c.AbortWithStatusJSON(status, gin.H{
		"code":    code,
		"data":    nil,
		"message": message,
	})
}
