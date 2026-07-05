package response

import "github.com/gin-gonic/gin"

type Response struct {
	Data    any    `json:"data"`
	Message string `json:"message"`
}

func Success(c *gin.Context, data any, message ...string) {
	msg := "success"
	if len(message) > 0 {
		msg = message[0]
	}
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
	c.AbortWithStatusJSON(code, Response{
		Data:    nil,
		Message: message,
	})
}
