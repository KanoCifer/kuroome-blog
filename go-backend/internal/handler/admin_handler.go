package handler

import (
	"context"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// Adminer 定义 handler 依赖的管理后台能力集合。
// 由 *service.AdminService 隐式满足。
type Adminer interface {
	AddPost(ctx context.Context, post dto.PostRequest) (id string, err error)
	UpdatePost(ctx context.Context, id string, post dto.PostUpdate) error
	DeletePost(ctx context.Context, id string) error
	TrackVisitor(ctx context.Context, data dto.VisitorTrackRequest) error
	ListPostViewsData(ctx context.Context) ([]dto.PostViewResponse, error)
}

var _ Adminer = (*service.AdminService)(nil)

type AdminHandler struct {
	adminSvc Adminer
	cfg      *config.Config
}

func NewAdminHandler(adminSvc Adminer, cfg *config.Config) *AdminHandler {
	return &AdminHandler{adminSvc: adminSvc, cfg: cfg}
}

func (h *AdminHandler) AddPost(c *gin.Context) {
	var req dto.PostRequest
	if !bindJSON(c, &req) {
		return
	}
	id, err := h.adminSvc.AddPost(c.Request.Context(), req)
	if respondErr(c, err, "add post failed") {
		return
	}
	slog.InfoContext(c.Request.Context(), "post created", "post_id", id)
	response.Success(c, gin.H{"_id": id}, "Blog post added successfully")
}

func (h *AdminHandler) UpdatePost(c *gin.Context) {
	var req dto.PostUpdate
	if !bindJSON(c, &req) {
		return
	}
	if req.ID == "" {
		response.APIError(c, "_id is required")
		return
	}
	if err := h.adminSvc.UpdatePost(c.Request.Context(), req.ID, req); respondErr(c, err, "update post failed", "post_id", req.ID) {
		return
	}
	response.Success(c, gin.H{"_id": req.ID}, "Blog post updated successfully")
}

func (h *AdminHandler) DeletePost(c *gin.Context) {
	postID := c.Param("post_id")
	if err := h.adminSvc.DeletePost(c.Request.Context(), postID); respondErr(c, err, "delete post failed", "post_id", postID) {
		return
	}
	response.Success(c, gin.H{"_id": postID}, "Blog post deleted successfully")
}

func (h *AdminHandler) ListPostViewsData(c *gin.Context) {
	data, err := h.adminSvc.ListPostViewsData(c.Request.Context())
	if respondErr(c, err, "list post views data") {
		return
	}
	response.Success(c, data, "Post views data retrieved successfully")
}

func (h *AdminHandler) RegisterRoutes(r *gin.RouterGroup, authMW gin.HandlerFunc, adminMW gin.HandlerFunc) {
	r.POST("/post/add", authMW, adminMW, h.AddPost)
	r.PUT("/post/update", authMW, adminMW, h.UpdatePost)
	r.DELETE("/post/:post_id/delete", authMW, adminMW, h.DeletePost)
	r.GET("/post/views", authMW, adminMW, h.ListPostViewsData)
}
