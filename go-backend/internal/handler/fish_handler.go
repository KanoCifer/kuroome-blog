package handler

import (
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// FishHandler 处理钓点资源的 CRUD 请求。
type FishHandler struct {
	svc service.Fisher
}

func NewFishHandler(svc service.Fisher) *FishHandler {
	return &FishHandler{svc: svc}
}

// GetFishingSpotsList 列出所有钓点  GET /fish/spots
func (h *FishHandler) GetFishingSpotsList(c *gin.Context) {
	spots, err := h.svc.GetFishingSpots(c.Request.Context())
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "list fishing spots", "error", err)
		response.APIError(c, err.Error())
		return
	}
	response.Success(c, spots)
}

// GetFishingSpot 按 ID 查单条钓点  GET /fish/spots/:id
func (h *FishHandler) GetFishingSpot(c *gin.Context) {
	id := c.Param("id")
	spot, err := h.svc.GetFishingSpotByID(c.Request.Context(), id)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "get fishing spot", "error", err, "id", id)
		response.APIError(c, err.Error())
		return
	}
	response.Success(c, spot)
}

// CreateFishingSpot 创建钓点  POST /fish/spots
func (h *FishHandler) CreateFishingSpot(c *gin.Context) {
	var req dto.FishingSpotIn
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error())
		return
	}
	if err := h.svc.CreateFishingSpot(c.Request.Context(), &req); err != nil {
		slog.ErrorContext(c.Request.Context(), "create fishing spot", "error", err)
		response.APIError(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// UpdateFishingSpot 部分更新钓点  PATCH /fish/spots/:id
// 配合 dto.FishingSpotUpdate 指针字段：仅传了的字段才覆盖，未传字段保持原值。
func (h *FishHandler) UpdateFishingSpot(c *gin.Context) {
	id := c.Param("id")
	var req dto.FishingSpotUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error())
		return
	}
	if err := h.svc.UpdateFishingSpot(c.Request.Context(), id, &req); err != nil {
		slog.ErrorContext(c.Request.Context(), "update fishing spot", "error", err, "id", id)
		response.APIError(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// DeleteFishingSpot 删除钓点  DELETE /fish/spots/:id
// 默认软删（设 DeletedAt）；?hard=true 时走物理删除。
func (h *FishHandler) DeleteFishingSpot(c *gin.Context) {
	id := c.Param("id")
	hard := c.Query("hard") == "true"
	if err := h.svc.Delete(c.Request.Context(), id, hard); err != nil {
		slog.ErrorContext(c.Request.Context(), "delete fishing spot", "error", err, "id", id)
		response.APIError(c, err.Error())
		return
	}
	response.Success(c, nil)
}

// RegisterRoutes 在 r 下挂载钓点路由。
// GET 公开（列表 / 详情）；POST / PATCH / DELETE 需 admin 中间件保护。
func (h *FishHandler) RegisterRoutes(r *gin.RouterGroup, adminMW gin.HandlerFunc) {
	f := r.Group("/fish")
	f.GET("/spots", h.GetFishingSpotsList)
	f.GET("/spots/:id", h.GetFishingSpot)
	f.POST("/spots", adminMW, h.CreateFishingSpot)
	f.PATCH("/spots/:id", adminMW, h.UpdateFishingSpot)
	f.DELETE("/spots/:id", adminMW, h.DeleteFishingSpot)
}
