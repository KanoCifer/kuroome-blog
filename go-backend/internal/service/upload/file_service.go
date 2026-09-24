// Package upload 提供通用文件、内容图片和头像上传能力。
package upload

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/util"
)

// FileService 保存通用上传文件。
type FileService struct {
	cfg *config.UploadConfig
}

// NewFileService 构造 FileService。
func NewFileService(cfg *config.UploadConfig) *FileService {
	return &FileService{cfg: cfg}
}

// UploadFile 把通用文件保存到 {UploadDir}/uploads/{userID}/{uuid}{ext}。
func (s *FileService) UploadFile(ctx context.Context, userID uint, filename string, src io.Reader) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	rel := filepath.Join("uploads", fmt.Sprint(userID), uuid.NewString()+ext)

	if err := util.WriteFile(filepath.Join(s.cfg.UploadDir, rel), src, maxBytes(s.cfg)); err != nil {
		return "", err
	}
	slog.InfoContext(ctx, "file uploaded", "user_id", userID, "rel", rel, "kind", "file")
	return rel, nil
}

func maxBytes(cfg *config.UploadConfig) int64 {
	return int64(cfg.MaxUploadMB) * 1024 * 1024
}
