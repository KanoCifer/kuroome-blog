package upload

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"path/filepath"

	"github.com/google/uuid"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	uploaderrs "github.com/KanoCifer/kuroome-blog/internal/domain/upload/errs"
	"github.com/KanoCifer/kuroome-blog/internal/util"
)

const designMaxBytes int64 = 64 << 20

// MIME 映射同时定义图片白名单与服务端安全后缀。
var mimeToExt = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
	"image/exif": ".jpg",
}

// ImageService 保存博客、图片墙和 Nomu 设计图。
type ImageService struct {
	cfg *config.UploadConfig
}

// NewImageService 构造 ImageService。
func NewImageService(cfg *config.UploadConfig) *ImageService {
	return &ImageService{cfg: cfg}
}

// UploadBlogImage 校验图片类型后保存到 {UploadDir}/posts/{userID}/。
func (s *ImageService) UploadBlogImage(ctx context.Context, userID uint, _ string, contentType string, src io.Reader) (string, error) {
	return s.uploadImage(ctx, "posts", userID, contentType, src, "blog")
}

// UploadGalleryImage 校验图片类型后保存到 {UploadDir}/gallery/{userID}/。
func (s *ImageService) UploadGalleryImage(ctx context.Context, userID uint, _ string, contentType string, src io.Reader) (string, error) {
	return s.uploadImage(ctx, "gallery", userID, contentType, src, "gallery")
}

func (s *ImageService) uploadImage(ctx context.Context, dir string, userID uint, contentType string, src io.Reader, kind string) (string, error) {
	if !allowedImageType(contentType) {
		return "", uploaderrs.ErrUnsupportedImageType
	}

	rel := filepath.Join(dir, fmt.Sprint(userID), uuid.NewString()+mimeToExt[contentType])
	if err := util.WriteFile(filepath.Join(s.cfg.UploadDir, rel), src, maxBytes(s.cfg)); err != nil {
		return "", err
	}
	slog.InfoContext(ctx, "image uploaded", "user_id", userID, "rel", rel, "kind", kind)
	return rel, nil
}

// UploadDesignImage 把上游固定 JPEG 结果保存到 {UploadDir}/design/{userID}/，上限 64MB。
func (s *ImageService) UploadDesignImage(ctx context.Context, userID uint, src io.Reader) (string, error) {
	rel := filepath.Join("design", fmt.Sprint(userID), uuid.NewString()+".jpg")
	if err := util.WriteFile(filepath.Join(s.cfg.UploadDir, rel), src, designMaxBytes); err != nil {
		return "", err
	}
	slog.InfoContext(ctx, "design image saved", "user_id", userID, "rel", rel)
	return rel, nil
}

func allowedImageType(contentType string) bool {
	_, ok := mimeToExt[contentType]
	return ok
}
