package handler

import (

	"context"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// Momenter 定义 moment 服务的能力集合。
// 由 *service.MomentService 隐式满足。
type Momenter interface {
	Create(ctx context.Context, userID int, req dto.MomentRequest) (*dto.MomentResponse, error)
	GetByID(ctx context.Context, id string) (*dto.MomentResponse, error)
	GetByIDAdmin(ctx context.Context, id string) (*dto.MomentResponse, error)
	ListPublic(ctx context.Context, filter dto.MomentFilter, page, pageSize int) (*dto.MomentListResponse, error)
	ListAdmin(ctx context.Context, filter dto.MomentFilter, page, pageSize int) (*dto.MomentListResponse, error)
	Update(ctx context.Context, id string, req dto.MomentUpdate) error
	SoftDelete(ctx context.Context, id string) error
	HardDelete(ctx context.Context, id string) error
}

var _ Momenter = (*service.MomentService)(nil)


// MomentHandler 处理 moment 资源的 HTTP 请求。
//
// 错误处理契约（哨兵在 errs 包声明状态码，respondErr 经 errors.As 取用）：
//   - momenterrs.ErrMomentNotFound   → 404
//   - momenterrs.ErrInvalidObjectID  → 400
//   - 其他                           → 500
type MomentHandler struct {
	svc Momenter
}

func NewMomentHandler(svc Momenter) *MomentHandler {
	return &MomentHandler{svc: svc}
}

// ---------- 公开读 ----------

// ListPublicMoments  GET  /v3/moments?page=&page_size=&tag=
func (h *MomentHandler) ListPublicMoments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	filter := dto.MomentFilter{Tag: c.Query("tag")}

	data, err := h.svc.ListPublic(c.Request.Context(), filter, page, pageSize)
	if respondErr(c, err, "list public moments") {
		return
	}
	response.Success(c, data, "Moments retrieved successfully")
}

// GetPublicMoment  GET  /v3/moments/:id
func (h *MomentHandler) GetPublicMoment(c *gin.Context) {
	id := c.Param("id")

	data, err := h.svc.GetByID(c.Request.Context(), id)
	if respondErr(c, err, "get public moment", "id", id) {
		return
	}
	response.Success(c, data, "Moment retrieved successfully")
}

// ---------- 鉴权写 ----------

// CreateMoment  POST /v3/moments
func (h *MomentHandler) CreateMoment(c *gin.Context) {
	var req dto.MomentRequest
	if !bindJSON(c, &req) {
		return
	}

	data, err := h.svc.Create(c.Request.Context(), userID(c), req)
	if respondErr(c, err, "create moment") {
		return
	}
	response.Success(c, data, "Moment created successfully")
}

// UpdateMoment  PATCH /v3/moments/:id
// 字段三态语义完全由 dto.MomentUpdate 指针字段 + service.Update 处理，
// handler 不做预处理。
func (h *MomentHandler) UpdateMoment(c *gin.Context) {
	id := c.Param("id")

	var req dto.MomentUpdate
	if !bindJSON(c, &req) {
		return
	}

	if err := h.svc.Update(c.Request.Context(), id, req); respondErr(c, err, "update moment", "id", id) {
		return
	}
	response.Success(c, nil, "Moment updated successfully")
}

// DeleteMoment  DELETE /v3/moments/:id  （软删）
func (h *MomentHandler) DeleteMoment(c *gin.Context) {
	id := c.Param("id")

	if err := h.svc.SoftDelete(c.Request.Context(), id); respondErr(c, err, "soft delete moment", "id", id) {
		return
	}
	response.Success(c, nil, "Moment deleted successfully")
}

// ---------- 管理员 ----------

// ListAdminMoments  GET /v3/moments/admin?page=&page_size=&status=&include_deleted=
func (h *MomentHandler) ListAdminMoments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	filter := dto.MomentFilter{Status: c.Query("status")}
	if d := c.Query("include_deleted"); d == "true" {
		t := true
		filter.IncludeDeleted = &t
	} else {
		f := false
		filter.IncludeDeleted = &f
	}

	data, err := h.svc.ListAdmin(c.Request.Context(), filter, page, pageSize)
	if respondErr(c, err, "list admin moments") {
		return
	}
	response.Success(c, data, "Moments retrieved successfully")
}

// GetAdminMoment  GET /v3/moments/admin/:id
func (h *MomentHandler) GetAdminMoment(c *gin.Context) {
	id := c.Param("id")

	data, err := h.svc.GetByIDAdmin(c.Request.Context(), id)
	if respondErr(c, err, "get admin moment", "id", id) {
		return
	}
	response.Success(c, data, "Moment retrieved successfully")
}

// HardDeleteMoment  DELETE /v3/moments/admin/:id/permanent  （物理删除）
func (h *MomentHandler) HardDeleteMoment(c *gin.Context) {
	id := c.Param("id")

	if err := h.svc.HardDelete(c.Request.Context(), id); respondErr(c, err, "hard delete moment", "id", id) {
		return
	}
	response.Success(c, nil, "Moment permanently deleted")
}

// RegisterRoutes 在 v3 组下挂载 moment 路由。
//
// 鉴权策略：
//   - 公开读：ListPublicMoments / GetPublicMoment
//   - 登录写：CreateMoment / UpdateMoment / DeleteMoment（需登录，可由 owner 调用）
//   - 管理员：ListAdminMoments / GetAdminMoment / HardDeleteMoment
//
// 路由顺序注意：admin 子树挂在 :id 之前 —— /moments/admin/:id 是静态前缀优先，
// 否则 :id 会吞掉 /admin/。
func (h *MomentHandler) RegisterRoutes(
	r *gin.RouterGroup,
	authMW gin.HandlerFunc,
	adminMW gin.HandlerFunc,
) {
	r.GET("/moments", h.ListPublicMoments)
	r.GET("/moments/admin", authMW, adminMW, h.ListAdminMoments)
	r.GET("/moments/admin/:id", authMW, adminMW, h.GetAdminMoment)
	r.DELETE("/moments/admin/:id/permanent", authMW, adminMW, h.HardDeleteMoment)

	r.GET("/moments/:id", h.GetPublicMoment)
	r.POST("/moments", authMW, h.CreateMoment)
	r.PATCH("/moments/:id", authMW, h.UpdateMoment)
	r.DELETE("/moments/:id", authMW, h.DeleteMoment)
}
