package handler

import (
	"context"
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service/nomu"
)

// DesignGenerator handler 依赖的出图能力窄接口，*nomu.DesignService 满足。
type DesignGenerator interface {
	Generate(ctx context.Context, req nomu.GenerateRequest) (*nomu.GenerateResult, error)
}

type DesignHandler struct {
	svc DesignGenerator
}

func NewDesignHandler(svc DesignGenerator) *DesignHandler {
	return &DesignHandler{svc: svc}
}

// RegisterRoutes 挂载 /design 路由。出图按 token 计费，鉴权必挂；
// 限流与用量计费待计费系统上线后接入。
func (h *DesignHandler) RegisterRoutes(r *gin.RouterGroup, mw ...gin.HandlerFunc) {
	g := r.Group("/design")
	g.POST("/generate", append(mw, h.Generate)...)
}

// Generate POST /v3/design/generate
// 文生图：只传 prompt；图生图：images 传 1 张（单参考）或多张（多参考）。
// 返回上游临时 URL（会过期），图片字节由前端自行拉取。
func (h *DesignHandler) Generate(c *gin.Context) {
	var req dto.GenerateDesignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body", 400)
		return
	}

	userID := c.GetInt("user_id")
	res, err := h.svc.Generate(c.Request.Context(), nomu.GenerateRequest{
		Prompt: req.Prompt,
		Model:  req.Model,
		Size:   req.Size,
		Images: req.Images,
	})
	if err != nil {
		h.respondError(c, err)
		return
	}

	slog.InfoContext(c.Request.Context(), "design generate ok",
		"user_id", userID, "model", res.Model, "output", len(res.Images),
		"total_tokens", res.Usage.TotalTokens)
	response.Success(c, res, "generated successfully")
}

func (h *DesignHandler) respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, nomu.ErrEmptyPrompt),
		errors.Is(err, nomu.ErrUnknownModel),
		errors.Is(err, nomu.ErrInvalidSize):
		response.APIError(c, err.Error(), 400)
	case errors.Is(err, nomu.ErrUpstream):
		// 上游真实错误（状态码/body 片段）只在日志里，响应保持笼统文案。
		slog.WarnContext(c.Request.Context(), "design upstream error",
			"user_id", c.GetInt("user_id"), "error", err.Error())
		response.APIError(c, "design upstream error", 502)
	default:
		slog.ErrorContext(c.Request.Context(), "design handler unexpected error",
			"path", c.FullPath(), "error", err.Error())
		response.APIError(c, "internal error", 500)
	}
}
