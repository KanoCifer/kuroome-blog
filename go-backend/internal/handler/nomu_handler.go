package handler

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"

	nomuerrs "github.com/KanoCifer/kuroome-blog/internal/domain/nomu/errs"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// NomuSyncer handler 依赖的配置同步窄接口，*service.NomuServiceStruct 满足。
type NomuSyncer interface {
	SyncNomuConfig(ctx context.Context, userId uint, local []service.NomuSyncItem, lastSyncAt *time.Time) ([]service.NomuSyncItem, error)
	ProxyBlob(ctx context.Context, url *url.URL) (contentLength int64, contentType string, body io.ReadCloser, extraHeaders map[string]string, err error)
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
	g.GET("/proxy", nomuProxyCORS(), h.ProxyBlob)
}

// nomuProxyCORS /nomu/proxy 仅作为图片代理被前端跨源读取，开放 * 即可。
func nomuProxyCORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
		c.Next()
	}
}

// SyncNomuRequest 配置同步请求：以本地为基准全量 push，服务端返云端全量供对齐。
type SyncNomuRequest struct {
	// Local 本地配置全量（Dexie configs 表的每行）。
	Local []service.NomuSyncItem `json:"local" binding:"required"`
	// LastSyncAt 上次成功同步的时间（RFC3339），服务端仅返回该时间后的变更；
	// 省略则返回全量。
	LastSyncAt *time.Time `json:"lastSyncAt,omitempty"`
}

func (h *NomuHandler) ProxyBlob(c *gin.Context) {
	rawUrl := c.Query("url")
	if rawUrl == "" {
		response.APIError(c, "url is required", 400)
		return
	}
	u, err := url.Parse(rawUrl)
	if err != nil || u.Scheme != "https" {
		response.APIError(c, "invalid url", 400)
		return
	}

	contentLength, contentType, body, extraHeaders, err := h.svc.ProxyBlob(c.Request.Context(), u)
	if err != nil {
		h.respondError(c, err)
		return
	}
	// body 归 handler 所有：DataFromReader 只负责读，不负责关。
	defer body.Close()
	c.DataFromReader(http.StatusOK, contentLength, contentType, body, extraHeaders)
}

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
	case errors.Is(err, nomuerrs.ErrSyncTooMany):
		response.APIError(c, err.Error(), 400)
	default:
		slog.ErrorContext(c.Request.Context(), "nomu sync error",
			"user_id", c.GetInt("user_id"), "error", err.Error())
		response.APIError(c, "internal error", 500)
	}
}
