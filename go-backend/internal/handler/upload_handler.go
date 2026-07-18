package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// uploadStatus 把上传领域错误映射到 HTTP 状态码：校验类 400，其余 500。
func uploadStatus(err error) int {
	switch {
	case errors.Is(err, errs.ErrUnsupportedImageType),
		errors.Is(err, errs.ErrImageTooLarge),
		errors.Is(err, errs.ErrInvalidImageData):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}

// avatarViewer 是 UploadPic 成功后回读用户字典所需的最小接口。
// service.Userer 满足此接口；handler 以窄接口注入，便于 mock 测试。
type avatarViewer interface {
	GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error)
	UserToDict(u *model.User, p *model.Profile) map[string]any
}

// UploadHandler 处理文件 / 图片上传（均需登录）。
type UploadHandler struct {
	uploadSvc  service.Uploader
	avatarView avatarViewer
}

// NewUploadHandler 构造 UploadHandler。
func NewUploadHandler(uploadSvc service.Uploader, avatarView avatarViewer) *UploadHandler {
	return &UploadHandler{uploadSvc: uploadSvc, avatarView: avatarView}
}

// UploadBlogImage POST /upload-image 和 POST /blog/upload-image —— 博客文章图片上传。
// 校验图片类型后保存到 posts/{userID}/，返回公开访问 URL。需登录。
// multipart form field: file。
func (h *UploadHandler) UploadBlogImage(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.APIError(c, "未收到上传图片", http.StatusBadRequest)
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		response.APIError(c, "读取图片失败", http.StatusBadRequest)
		return
	}
	defer f.Close()

	userID := uint(c.GetInt("user_id"))
	rel, err := h.uploadSvc.UploadBlogImage(c.Request.Context(), userID, fileHeader.Filename, fileHeader.Header.Get("Content-Type"), f)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "upload blog image", "error", err)
		response.APIError(c, err.Error(), uploadStatus(err))
		return
	}

	response.Success(c, gin.H{
		"url":      "/v3/media/" + rel,
		"filename": rel,
	}, "图片上传成功")
}

// UploadGalleryImage POST /upload-gallery-image —— 图片墙上传。
// 校验图片类型后保存到 gallery/{userID}/，返回公开访问 URL。需登录。
// multipart form field: file。
func (h *UploadHandler) UploadGalleryImage(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.APIError(c, "未收到上传图片", http.StatusBadRequest)
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		response.APIError(c, "读取图片失败", http.StatusBadRequest)
		return
	}
	defer f.Close()

	userID := uint(c.GetInt("user_id"))
	rel, err := h.uploadSvc.UploadGalleryImage(c.Request.Context(), userID, fileHeader.Filename, fileHeader.Header.Get("Content-Type"), f)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "upload gallery image", "error", err)
		response.APIError(c, err.Error(), uploadStatus(err))
		return
	}

	response.Success(c, gin.H{
		"url":      "/v3/media/" + rel,
		"filename": rel,
	}, "图片上传成功")
}

// Upload POST /upload —— 通用文件上传（任意类型），保存到 uploads/{userID}/。
// multipart form field: file。
func (h *UploadHandler) Upload(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.APIError(c, "未收到上传文件", http.StatusBadRequest)
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		response.APIError(c, "读取文件失败", http.StatusBadRequest)
		return
	}
	defer f.Close()

	rel, err := h.uploadSvc.UploadFile(c.Request.Context(), uint(c.GetInt("user_id")), fileHeader.Filename, f)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "upload file", "error", err)
		response.APIError(c, err.Error(), uploadStatus(err))
		return
	}

	response.Success(c, gin.H{
		"url":      "/v3/media/" + rel,
		"filename": rel,
	}, "文件上传成功")
}

// UploadPic POST /upload-pic —— 头像图片上传（校验类型 + 256px 缩略图 + 回写 profile.photo）。
// multipart form field: image。返回完整用户字典（含 photo），与 Python 端形状对齐。
func (h *UploadHandler) UploadPic(c *gin.Context) {
	fileHeader, err := c.FormFile("image")
	if err != nil {
		response.APIError(c, "未收到上传图片", http.StatusBadRequest)
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		response.APIError(c, "读取图片失败", http.StatusBadRequest)
		return
	}
	defer f.Close()

	userID := uint(c.GetInt("user_id"))
	_, err = h.uploadSvc.UploadAvatar(c.Request.Context(), userID, fileHeader.Filename, fileHeader.Header.Get("Content-Type"), f)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "upload avatar", "error", err)
		response.APIError(c, err.Error(), uploadStatus(err))
		return
	}

	u, p, err := h.avatarView.GetByID(c.Request.Context(), userID)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "get user after avatar upload", "error", err)
		response.APIError(c, "上传成功但获取用户信息失败", http.StatusInternalServerError)
		return
	}

	response.Success(c, h.avatarView.UserToDict(u, p), "头像上传成功")
}

// RegisterRoutes 挂载上传端点，全部需要 AuthMiddleware。
// 同时注册 POST / PUT：前端头像上传沿用 PUT（对齐 Python 端），通用上传为 POST。
func (h *UploadHandler) RegisterRoutes(r *gin.RouterGroup, authMW gin.HandlerFunc) {
	r.POST("/upload", authMW, h.Upload)
	r.PUT("/upload", authMW, h.Upload)
	r.POST("/upload-image", authMW, h.UploadBlogImage)
	r.POST("/blog/upload-image", authMW, h.UploadBlogImage)
	r.POST("/upload-gallery-image", authMW, h.UploadGalleryImage)
	r.POST("/upload-pic", authMW, h.UploadPic)
	r.PUT("/upload-pic", authMW, h.UploadPic)
}
