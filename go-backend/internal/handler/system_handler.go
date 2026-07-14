package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)



type SystemHandler struct {
	svc service.Systemer
}

func NewSystemHandler(svc service.Systemer) *SystemHandler {
	return &SystemHandler{svc: svc}
}

// Ping 处理 GET /system/。轻量探活，不做鉴权，对齐 Python 的 {"status":"ok"}。
func (h *SystemHandler) Ping(c *gin.Context) {
	response.Success(c, gin.H{"status": "ok"}, "")
}

// Events 处理 GET /system/events。分页查询服务事件（按时间倒序），
// 支持 type / start / end 过滤。不做鉴权。
//
// page 默认 1（>=1），per_page 默认 10（1..200），非法值返回 400。
// start / end 为 ISO 8601，解析失败返回 400。
func (h *SystemHandler) Events(c *gin.Context) {
	page := 1
	if v := c.Query("page"); v != "" {
		d, err := strconv.Atoi(v)
		if err != nil || d < 1 {
			response.APIError(c, "page must be a positive integer", http.StatusBadRequest)
			return
		}
		page = d
	}

	const defaultPerPage = 10
	perPage := defaultPerPage
	if v := c.Query("per_page"); v != "" {
		d, err := strconv.Atoi(v)
		if err != nil || d < 1 || d > 200 {
			response.APIError(c, "per_page must be an integer between 1 and 200", http.StatusBadRequest)
			return
		}
		perPage = d
	}

	var eventType *string
	if v := c.Query("type"); v != "" {
		eventType = &v
	}

	var start, end *time.Time
	if v := c.Query("start"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			response.APIError(c, "start must be ISO 8601", http.StatusBadRequest)
			return
		}
		start = &t
	}
	if v := c.Query("end"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			response.APIError(c, "end must be ISO 8601", http.StatusBadRequest)
			return
		}
		end = &t
	}

	data, err := h.svc.ListEvents(c.Request.Context(), page, perPage, eventType, start, end)
	if err != nil {
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}

	response.Success(c, data, "获取事件列表成功")
}

// RegisterRoutes 挂载 system 端点。无鉴权中间件，对齐 Python 现状。
func (h *SystemHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/system/", h.Ping)
	r.GET("/system/events", h.Events)
}
