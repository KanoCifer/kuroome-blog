package handler

import (
	"context"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/response"
)

var errNotNumber = errors.New("not a number")

// MonitorService 定义 monitor handler 依赖的能力集合。
// 由 service.MonitorService 实现；handler 仅依赖此接口，便于测试替换。
type MonitorService interface {
	GetOverview(ctx context.Context, days int) (dto.Overview, error)
	GetVisitors(ctx context.Context, days, page, pageSize int) (dto.Visitors, error)
	GetUserLogins(ctx context.Context, days, page, pageSize int) (dto.UserLogins, error)
	GetServerStatus() (dto.ServerStatus, error)
	StreamServerStatus(ctx context.Context) (<-chan dto.ServerStatus, error)
}

type MonitorHandler struct {
	svc MonitorService
}

func NewMonitorHandler(svc MonitorService) *MonitorHandler {
	return &MonitorHandler{svc: svc}
}

const (
	defaultDays = 7
	maxDays     = 90
)

// bindDays 解析并校验 days 查询参数（1..90，默认 7）。
func bindDays(c *gin.Context) (int, bool) {
	days := defaultDays
	if daysStr := c.Query("days"); daysStr != "" {
		var d int
		if _, err := ginStrAtoi(daysStr, &d); err != nil || d < 1 || d > maxDays {
			response.APIError(c, "days must be an integer between 1 and 90", http.StatusBadRequest)
			return 0, false
		}
		days = d
	}
	return days, true
}

func ginStrAtoi(s string, out *int) (int, error) {
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0, errNotNumber
		}
		n = n*10 + int(ch-'0')
	}
	*out = n
	return n, nil
}

// bindPagination 解析 page / page_size（page>=1, 1<=page_size<=100）。
func bindPagination(c *gin.Context) (page, pageSize int, ok bool) {
	page = 1
	pageSize = 20
	if v := c.Query("page"); v != "" {
		var d int
		if _, err := ginStrAtoi(v, &d); err != nil || d < 1 {
			response.APIError(c, "page must be a positive integer", http.StatusBadRequest)
			return 0, 0, false
		}
		page = d
	}
	if v := c.Query("page_size"); v != "" {
		var d int
		if _, err := ginStrAtoi(v, &d); err != nil || d < 1 || d > 100 {
			response.APIError(c, "page_size must be an integer between 1 and 100", http.StatusBadRequest)
			return 0, 0, false
		}
		pageSize = d
	}
	return page, pageSize, true
}

// GetOverview 处理 GET /status/overview。
func (h *MonitorHandler) GetOverview(c *gin.Context) {
	days, ok := bindDays(c)
	if !ok {
		return
	}
	data, err := h.svc.GetOverview(c.Request.Context(), days)
	if err != nil {
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, data, "Visitor overview data retrieved successfully")
}

// GetVisitors 处理 GET /status/visitors。
func (h *MonitorHandler) GetVisitors(c *gin.Context) {
	days, ok := bindDays(c)
	if !ok {
		return
	}
	page, pageSize, ok := bindPagination(c)
	if !ok {
		return
	}
	data, err := h.svc.GetVisitors(c.Request.Context(), days, page, pageSize)
	if err != nil {
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, data, "Visitor list retrieved successfully")
}

// GetUserLogins 处理 GET /status/user-logins。
func (h *MonitorHandler) GetUserLogins(c *gin.Context) {
	days, ok := bindDays(c)
	if !ok {
		return
	}
	page, pageSize, ok := bindPagination(c)
	if !ok {
		return
	}
	data, err := h.svc.GetUserLogins(c.Request.Context(), days, page, pageSize)
	if err != nil {
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, data, "User login logs retrieved successfully")
}

// ServerStatus 处理 GET /status/server/status，返回实时 CPU/内存/磁盘指标。
func (h *MonitorHandler) ServerStatus(c *gin.Context) {
	data, err := h.svc.GetServerStatus()
	if err != nil {
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, data, "Server status retrieved successfully")
}

// ServerStatusStream 处理 GET /status/server/status/stream，通过 SSE 每 5s
// 推送一帧 server status payload，对齐 Python EventSourceResponse。
func (h *MonitorHandler) ServerStatusStream(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	ch, err := h.svc.StreamServerStatus(c.Request.Context())
	if err != nil {
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}

	c.Stream(func(w io.Writer) bool {
		select {
		case <-c.Request.Context().Done():
			return false
		case data, ok := <-ch:
			if !ok {
				return false
			}
			c.SSEvent("message", data)
			return true
		}
	})
}

// RegisterRoutes 挂载 monitor 端点，全部走 auth + admin 中间件。
func (h *MonitorHandler) RegisterRoutes(r *gin.RouterGroup, authMW gin.HandlerFunc, adminMW gin.HandlerFunc) {
	r.GET("/status/overview", authMW, adminMW, h.GetOverview)
	r.GET("/status/visitors", authMW, adminMW, h.GetVisitors)
	r.GET("/status/user-logins", authMW, adminMW, h.GetUserLogins)
	r.GET("/status/server/status", authMW, adminMW, h.ServerStatus)
	r.GET("/status/server/status/stream", authMW, adminMW, h.ServerStatusStream)
}

