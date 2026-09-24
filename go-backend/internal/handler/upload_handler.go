package handler

import (
	"context"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	uploaderrs "github.com/KanoCifer/kuroome-blog/internal/domain/upload/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// Uploader 定义 handler 依赖的文件上传能力集合。
// 由 *service.UploadService 隐式满足。
type Uploader interface {
	// UploadFile 保存通用文件，返回相对存储根的路径（如 uploads/1/xxx.png）。
	UploadFile(ctx context.Context, userID uint, filename string, src io.Reader) (string, error)

	// UploadBlogImage 保存博客文章图片，校验类型后保存到 posts/{userID}/ 并返回相对路径。
	UploadBlogImage(ctx context.Context, userID uint, filename, contentType string, src io.Reader) (string, error)

	// UploadGalleryImage 保存图片墙图片，校验类型后保存到 gallery/{userID}/ 并返回相对路径。
	UploadGalleryImage(ctx context.Context, userID uint, filename, contentType string, src io.Reader) (string, error)

	// UploadAvatar 保存头像图片，回写 profile.photo 后返回相对路径。
	UploadAvatar(ctx context.Context, userID uint, filename, contentType string, src io.Reader) (string, error)

	// UploadDesignImage 保存 AI 出图结果（上游固定 output_format=jpeg），
	// 保存到 design/{userID}/ 并返回相对路径。
	UploadDesignImage(ctx context.Context, userID uint, src io.Reader) (string, error)
}

var _ Uploader = (*service.UploadService)(nil)

type avatarReader interface {
	GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error)
}

type userRenderer interface {
	Render(u *model.User, p *model.Profile) map[string]any
}

// UploadHandler 处理文件 / 图片上传（均需登录）。
type UploadHandler struct {
	uploadSvc Uploader
	users     avatarReader
	userView  userRenderer
}

// NewUploadHandler 构造 UploadHandler。
func NewUploadHandler(uploadSvc Uploader, users avatarReader, userView userRenderer) *UploadHandler {
	return &UploadHandler{uploadSvc: uploadSvc, users: users, userView: userView}
}

// Upload POST /upload —— 统一文件 / 图片上传入口。
//
// 通过 multipart form 的 type 字段区分处理路径：
//   - blog：博客文章图片，校验类型后保存到 posts/{userID}/
//   - gallery：图片墙图片，校验类型后保存到 gallery/{userID}/
//   - generic 或空：通用文件，仅限大小，保存到 uploads/{userID}/
//
// multipart form field: file, type。返回公开访问 URL。需登录。
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

	userID := uint(c.GetInt("user_id"))
	filename := fileHeader.Filename
	contentType := fileHeader.Header.Get("Content-Type")

	uploadType := c.PostForm("type")

	// 拒绝未知的非空上传类型：空串（无 type 字段）保持向后兼容走 generic，
	// 仅 "blog" / "gallery" 被显式放行，其余（含 "avatar"、拼写错误、脏数据）返回 400。
	if uploadType != "" && uploadType != "blog" && uploadType != "gallery" {
		respondErr(c, uploaderrs.ErrInvalidUploadType, "upload rejected", "type", uploadType)
		return
	}

	var rel string
	switch uploadType {
	case "blog":
		rel, err = h.uploadSvc.UploadBlogImage(c.Request.Context(), userID, filename, contentType, f)
	case "gallery":
		rel, err = h.uploadSvc.UploadGalleryImage(c.Request.Context(), userID, filename, contentType, f)
	default:
		rel, err = h.uploadSvc.UploadFile(c.Request.Context(), userID, filename, f)
	}

	if respondErr(c, err, "upload", "type", uploadType) {
		return
	}

	response.Success(c, gin.H{
		"url":      "/v3/media/" + rel,
		"filename": rel,
	}, "上传成功")
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
	if respondErr(c, err, "upload avatar") {
		return
	}

	u, p, err := h.users.GetByID(c.Request.Context(), userID)
	if respondErr(c, err, "get user after avatar upload", "user_id", userID) {
		return
	}

	response.Success(c, h.userView.Render(u, p), "头像上传成功")
}

// RegisterRoutes 挂载上传端点，全部需要 AuthMiddleware。
//
// /upload 通过 type 字段统一处理 generic/blog/gallery（对齐前端 useUpload composable）；
// /upload-pic 独立处理头像（缩略图 + 回写 profile.photo）。
// 同时注册 POST / PUT：前端头像上传沿用 PUT（对齐 Python 端），通用上传为 POST。
func (h *UploadHandler) RegisterRoutes(r *gin.RouterGroup, authMW gin.HandlerFunc) {
	r.POST("/upload", authMW, h.Upload)
	r.PUT("/upload", authMW, h.Upload)
	r.POST("/upload-pic", authMW, h.UploadPic)
	r.PUT("/upload-pic", authMW, h.UploadPic)
}
