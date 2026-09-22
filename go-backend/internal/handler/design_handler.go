package handler

import (
	"context"
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

// RegisterRoutes 挂载 /design 路由。出图按张预扣积分（余额不足 402），鉴权必挂。
func (h *DesignHandler) RegisterRoutes(r *gin.RouterGroup, mw ...gin.HandlerFunc) {
	g := r.Group("/design")
	g.POST("/generate", append(mw, h.Generate)...)
}

// Generate POST /v3/design/generate
// 文生图：只传 prompt；图生图：images 传 1 张（单参考）或多张（多参考）。
// Idempotency-Key 头作为积分预扣的幂等键（缺省服务端 UUID）。
// 返回上游临时 URL（会过期），图片字节由前端自行拉取。
func (h *DesignHandler) Generate(c *gin.Context) {
	var req dto.GenerateDesignRequest
	if !bindJSON(c, &req) {
		return
	}

	userID := c.GetInt("user_id")
	res, err := h.svc.Generate(c.Request.Context(), nomu.GenerateRequest{
		UserID:         uint(userID),
		Prompt:         req.Prompt,
		Model:          req.Model,
		Size:           req.Size,
		Images:         req.Images,
		ResponseFormat: req.ResponseFormat,
		IdempotencyKey: c.GetHeader("Idempotency-Key"),
	})
	if respondErr(c, err, "design generate failed", "user_id", userID) {
		return
	}

	// 出图阶段由 images 是否为空决定：空=文生图，非空=图生图/图片编辑。
	stage := "text2image"
	if len(req.Images) > 0 {
		stage = "image2image"
	}
	slog.InfoContext(c.Request.Context(), "design generate ok",
		"user_id", userID, "model", res.Model, "stage", stage, "output", len(res.Images),
		"total_tokens", res.Usage.TotalTokens)
	response.Success(c, res, "generated successfully")
}
