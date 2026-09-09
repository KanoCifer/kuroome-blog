package handler

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// NomuSyncer handler 依赖的配置同步窄接口，*service.NomuServiceStruct 满足。
type NomuSyncer interface {
	SyncNomuConfig(ctx context.Context, userId uint, local []service.NomuSyncItem, lastSyncAt *time.Time) ([]service.NomuSyncItem, error)
}

type NomuHandler struct {
	svc NomuSyncer
}

func NewNomuHandler(svc NomuSyncer) *NomuHandler {
	return &NomuHandler{svc: svc}
}

// RegisterRoutes 挂载 /nomu 路由。配置同步需登录。
func (h *NomuHandler) RegisterRoutes(r *gin.RouterGroup, mw ...gin.HandlerFunc) {
	g := r.Group("/nomu")
	g.POST("/config/sync", append(mw, h.SyncNomuConfig)...)
}

// SyncNomuRequest 配置同步请求：以本地为基准全量 push，服务端返云端全量供对齐。
type SyncNomuRequest struct {
	// Local 本地配置全量（Dexie configs 表的每行）。
	Local []service.NomuSyncItem `json:"local" binding:"required"`
	// LastSyncAt 上次成功同步的时间（RFC3339），服务端仅返回该时间后的变更；
	// 省略则返回全量。
	LastSyncAt *time.Time `json:"lastSyncAt,omitempty"`
}

// SyncNomuConfig POST /v3/nomu/config/sync
// 把本地 Nomu 配置同步到云端。语义：本地为基准 upsert + 软删传播，
// 返回云端当前全量（或 lastSyncAt 后的增量）供前端对齐。
func (h *NomuHandler) SyncNomuConfig(c *gin.Context) {
	var req SyncNomuRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body", 400)
		return
	}

	userID := c.GetInt("user_id")
	cloud, err := h.svc.SyncNomuConfig(c.Request.Context(), uint(userID), req.Local, req.LastSyncAt)
	if err != nil {
		h.respondError(c, err)
		return
	}

	slog.InfoContext(c.Request.Context(), "nomu config synced",
		"user_id", userID, "local_items", len(req.Local), "returned", len(cloud))
	response.Success(c, cloud, "synced")
}

func (h *NomuHandler) respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrSyncTooMany):
		response.APIError(c, err.Error(), 400)
	default:
		slog.ErrorContext(c.Request.Context(), "nomu sync error",
			"user_id", c.GetInt("user_id"), "error", err.Error())
		response.APIError(c, "internal error", 500)
	}
}
