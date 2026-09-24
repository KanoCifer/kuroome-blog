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
	uploaderrs "github.com/KanoCifer/kuroome-blog/internal/domain/upload/errs"
	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/util"
)

// ProfileStore 是头像上传需要的数据访问能力。
type ProfileStore interface {
	GetByID(ctx context.Context, id uint) (*model.User, error)
	GetProfile(ctx context.Context, userID uint) (*model.Profile, error)
	CreateProfile(ctx context.Context, userID uint) (*model.Profile, error)
	UpdateProfile(ctx context.Context, profile *model.Profile) error
}

// AvatarService 保存头像原图、缩略图并回写 profile.photo。
type AvatarService struct {
	profiles ProfileStore
	cfg      *config.UploadConfig
}

// NewAvatarService 构造 AvatarService。
func NewAvatarService(profiles ProfileStore, cfg *config.UploadConfig) *AvatarService {
	return &AvatarService{profiles: profiles, cfg: cfg}
}

// UploadAvatar 校验并保存头像，返回 256px JPEG 缩略图的相对路径。
func (s *AvatarService) UploadAvatar(ctx context.Context, userID uint, _ string, contentType string, src io.Reader) (string, error) {
	if !allowedImageType(contentType) {
		return "", uploaderrs.ErrUnsupportedImageType
	}

	img, format, err := util.DecodeImage(src, maxBytes(s.cfg))
	if err != nil {
		return "", err
	}

	ext := "." + format
	origName := uuid.NewString() + ext
	thumbName := strings.TrimSuffix(origName, ext) + "-256.jpg"
	userDir := filepath.Join("pics", fmt.Sprint(userID))
	origFull := filepath.Join(s.cfg.UploadDir, userDir, origName)
	if err := util.EnsureDir(origFull); err != nil {
		return "", err
	}
	if err := util.EncodeImage(origFull, img, format); err != nil {
		return "", err
	}
	thumbFull := filepath.Join(s.cfg.UploadDir, userDir, thumbName)
	if err := util.EncodeImage(thumbFull, util.ResizeThumb(img), "jpeg"); err != nil {
		return "", err
	}

	photoRel := filepath.Join(userDir, thumbName)
	if err := s.updatePhoto(ctx, userID, filepath.ToSlash(photoRel)); err != nil {
		return "", err
	}
	slog.InfoContext(ctx, "avatar uploaded", "user_id", userID, "rel", photoRel)
	return photoRel, nil
}

func (s *AvatarService) updatePhoto(ctx context.Context, userID uint, photoRel string) error {
	u, err := s.profiles.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if u == nil {
		return usererrs.ErrUserNotFound
	}

	p := u.Profile
	if p == nil {
		p, err = s.profiles.GetProfile(ctx, userID)
		if err != nil {
			return err
		}
	}
	if p == nil {
		p, err = s.profiles.CreateProfile(ctx, userID)
		if err != nil {
			return err
		}
	}
	p.Photo = photoRel
	return s.profiles.UpdateProfile(ctx, p)
}
