package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
	"github.com/KanoCifer/kuroome-blog/internal/repository/mongodb"
	"github.com/KanoCifer/kuroome-blog/internal/response"
)

// DevTaskService devtask 读表面 —— handler 依赖接口，便于 mock 测试。
type DevTaskService interface {
	Create(ctx context.Context, userID int, req dto.DevTaskCreate) (*dto.DevTaskOut, error)
	GetByID(ctx context.Context, id string) (*dto.DevTaskOut, error)
	GetBySlug(ctx context.Context, slug string) (*dto.DevTaskOut, error)
	List(ctx context.Context, filter mongodb.ListFilter, page, perPage int) (*dto.DevTaskListOut, error)
	Update(ctx context.Context, id string, req dto.DevTaskUpdate) error
	SoftDelete(ctx context.Context, id string) error
	HardDelete(ctx context.Context, id string) error
	FindFrontier(ctx context.Context, limit int) ([]dto.DevTaskOut, error)
}

// DevTaskHandler 处理开发与需求看板请求（需登录 + admin）。
type DevTaskHandler struct {
	svc DevTaskService
}

func NewDevTaskHandler(svc DevTaskService) *DevTaskHandler {
	return &DevTaskHandler{svc: svc}
}

// userID 从 context 提取当前登录用户 ID。
func userID(c *gin.Context) int {
	v, _ := c.Get("user_id")
	id, _ := v.(int)
	return id
}

// CreateTask 创建任务  POST /api/v3/dev-tasks
func (h *DevTaskHandler) CreateTask(c *gin.Context) {
	var req dto.DevTaskCreate
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error())
		return
	}

	data, err := h.svc.Create(c.Request.Context(), userID(c), req)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "create dev task", "error", err)
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, data, "Task created successfully")
}

// GetTask 获取单条任务  GET /api/v3/dev-tasks/:id
func (h *DevTaskHandler) GetTask(c *gin.Context) {
	id := c.Param("id")

	data, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrInvalidTaskID):
			response.APIError(c, err.Error(), http.StatusBadRequest)
		case errors.Is(err, errs.ErrTaskNotFound):
			response.APIError(c, err.Error(), http.StatusNotFound)
		default:
			slog.ErrorContext(c.Request.Context(), "get dev task", "error", err, "id", id)
			response.APIError(c, err.Error(), http.StatusInternalServerError)
		}
		return
	}
	response.Success(c, data, "Task retrieved successfully")
}

// GetTaskBySlug 按 slug 查单条任务  GET /api/v3/dev-tasks/by-slug/:slug
func (h *DevTaskHandler) GetTaskBySlug(c *gin.Context) {
	slug := c.Param("slug")

	data, err := h.svc.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrTaskNotFound):
			response.APIError(c, err.Error(), http.StatusNotFound)
		default:
			slog.ErrorContext(c.Request.Context(), "get dev task by slug", "error", err, "slug", slug)
			response.APIError(c, err.Error(), http.StatusInternalServerError)
		}
		return
	}
	response.Success(c, data, "Task retrieved successfully")
}

// listFilter 从 query 参数解析过滤条件。
func listFilter(c *gin.Context) mongodb.ListFilter {
	var filter mongodb.ListFilter

	if s := c.Query("status"); s != "" {
		st := document.DevTaskStatus(s)
		filter.Status = &st
	}
	if p := c.Query("priority"); p != "" {
		pri := document.DevTaskPriority(p)
		filter.Priority = &pri
	}
	if t := c.Query("type"); t != "" {
		ty := document.DevTaskType(t)
		filter.Type = &ty
	}
	if d := c.Query("include_deleted"); d == "true" {
		deleted := true
		filter.IsDeleted = &deleted
	} else {
		notDeleted := false
		filter.IsDeleted = &notDeleted
	}
	if f := c.Query("for_agent"); f != "" {
		switch f {
		case "true":
			t := true
			filter.ForAgent = &t
		case "false":
			f := false
			filter.ForAgent = &f
		}
	}
	return filter
}

// ListTasks 分页列出任务  GET /api/v3/dev-tasks?page=1&per_page=10&status=&priority=&type=
func (h *DevTaskHandler) ListTasks(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	data, err := h.svc.List(c.Request.Context(), listFilter(c), page, perPage)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "list dev tasks", "error", err)
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, data, "Tasks retrieved successfully")
}

// FrontierTasks 返回 agent 当前可认领的任务列表（for_agent=true + 未阻塞 + 待排期）。
// GET /api/v3/dev-tasks/frontier?limit=10
func (h *DevTaskHandler) FrontierTasks(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	data, err := h.svc.FindFrontier(c.Request.Context(), limit)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "frontier dev tasks", "error", err)
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	// 直接返回数组（无分页 envelope），因为 frontier 语义是"接下来干什么的简短清单"。
	response.Success(c, data, "Frontier tasks retrieved successfully")
}

// UpdateTask 部分更新任务  PATCH /api/v3/dev-tasks/:id
func (h *DevTaskHandler) UpdateTask(c *gin.Context) {
	id := c.Param("id")

	var req dto.DevTaskUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error())
		return
	}

	if err := h.svc.Update(c.Request.Context(), id, req); err != nil {
		if errors.Is(err, errs.ErrInvalidTaskID) {
			response.APIError(c, err.Error(), http.StatusBadRequest)
			return
		}
		slog.ErrorContext(c.Request.Context(), "update dev task", "error", err, "id", id)
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, nil, "Task updated successfully")
}

// SoftDeleteTask 逻辑删除  DELETE /api/v3/dev-tasks/:id
func (h *DevTaskHandler) SoftDeleteTask(c *gin.Context) {
	id := c.Param("id")

	if err := h.svc.SoftDelete(c.Request.Context(), id); err != nil {
		if errors.Is(err, errs.ErrInvalidTaskID) {
			response.APIError(c, err.Error(), http.StatusBadRequest)
			return
		}
		slog.ErrorContext(c.Request.Context(), "soft delete dev task", "error", err, "id", id)
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, nil, "Task soft-deleted successfully")
}

// HardDeleteTask 物理删除  DELETE /api/v3/dev-tasks/:id/permanent
func (h *DevTaskHandler) HardDeleteTask(c *gin.Context) {
	id := c.Param("id")

	if err := h.svc.HardDelete(c.Request.Context(), id); err != nil {
		if errors.Is(err, errs.ErrInvalidTaskID) {
			response.APIError(c, err.Error(), http.StatusBadRequest)
			return
		}
		slog.ErrorContext(c.Request.Context(), "hard delete dev task", "error", err, "id", id)
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, nil, "Task permanently deleted")
}

// RegisterRoutes 挂载 devtask 路由（需 auth + admin）。
func (h *DevTaskHandler) RegisterRoutes(r *gin.RouterGroup, authMW gin.HandlerFunc, adminMW gin.HandlerFunc) {
	g := r.Group("/dev-tasks", authMW, adminMW)
	g.POST("", h.CreateTask)
	g.GET("", h.ListTasks)
	// 静态前缀必须注册在 :id 之前 —— Gin 路由按注册顺序匹配，:id 会吞掉同级的静态 path。
	g.GET("/frontier", h.FrontierTasks)
	g.GET("/by-slug/:slug", h.GetTaskBySlug)
	g.GET("/:id", h.GetTask)
	g.PATCH("/:id", h.UpdateTask)
	g.DELETE("/:id", h.SoftDeleteTask)
	g.DELETE("/:id/permanent", h.HardDeleteTask)
}
