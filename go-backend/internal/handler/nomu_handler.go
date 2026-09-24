package handler

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service/nomu/blobproxy"
	"github.com/KanoCifer/kuroome-blog/internal/service/nomu/configsync"
)

// ConfigSyncer is the config synchronization capability needed by NomuHandler.
type ConfigSyncer interface {
	SyncNomuConfig(ctx context.Context, userId uint, local []configsync.Item, lastSyncAt *time.Time) ([]configsync.Item, error)
}

// BlobProxy fetches an upstream blob. The returned body must be closed by the caller.
type BlobProxy interface {
	ProxyBlob(ctx context.Context, url *url.URL) (contentLength int64, contentType string, body io.ReadCloser, extraHeaders map[string]string, err error)
}

var (
	_ ConfigSyncer = (*configsync.Service)(nil)
	_ BlobProxy    = (*blobproxy.Service)(nil)
)

type NomuHandler struct {
	configSyncer ConfigSyncer
	blobProxy    BlobProxy
}

func NewNomuHandler(configSyncer ConfigSyncer, blobProxy BlobProxy) *NomuHandler {
	return &NomuHandler{configSyncer: configSyncer, blobProxy: blobProxy}
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
	Local []configsync.Item `json:"local" binding:"required"`
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

	contentLength, contentType, body, extraHeaders, err := h.blobProxy.ProxyBlob(c.Request.Context(), u)
	if respondErr(c, err, "nomu proxy error") {
		return
	}
	// body 归 handler 所有：DataFromReader 只负责读，不负责关。
	defer body.Close()
	c.DataFromReader(http.StatusOK, contentLength, contentType, body, extraHeaders)
}

func (h *NomuHandler) SyncNomuConfig(c *gin.Context) {
	var req SyncNomuRequest
	if !bindJSON(c, &req) {
		return
	}

	userID := c.GetInt("user_id")
	cloud, err := h.configSyncer.SyncNomuConfig(c.Request.Context(), uint(userID), req.Local, req.LastSyncAt)
	if respondErr(c, err, "nomu config sync failed", "user_id", userID) {
		return
	}

	slog.InfoContext(c.Request.Context(), "nomu config synced",
		"user_id", userID, "local_items", len(req.Local), "returned", len(cloud))
	response.Success(c, cloud, "synced")
}
