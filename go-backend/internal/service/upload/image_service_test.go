package upload

import (
	"bytes"
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	uploaderrs "github.com/KanoCifer/kuroome-blog/internal/domain/upload/errs"
)

func TestImageServiceUploadContentImages(t *testing.T) {
	cfg := testUploadConfig(t, 1)
	svc := NewImageService(cfg)
	data := testPNG(t)

	tests := []struct {
		name string
		typ  string
		run  func(context.Context) (string, error)
		path string
		ext  string
	}{
		{
			name: "blog", typ: "image/webp", path: "posts/9/", ext: ".webp",
			run: func(ctx context.Context) (string, error) {
				return svc.UploadBlogImage(ctx, 9, "spoof.php", "image/webp", bytes.NewReader(data))
			},
		},
		{
			name: "gallery", typ: "image/jpeg", path: "gallery/9/", ext: ".jpg",
			run: func(ctx context.Context) (string, error) {
				return svc.UploadGalleryImage(ctx, 9, "spoof.php", "image/jpeg", bytes.NewReader(data))
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rel, err := tt.run(context.Background())
			if err != nil {
				t.Fatalf("upload: %v", err)
			}
			if !strings.HasPrefix(rel, tt.path) || !strings.HasSuffix(rel, tt.ext) {
				t.Fatalf("path = %q, want prefix %q and suffix %q", rel, tt.path, tt.ext)
			}
			got, err := os.ReadFile(filepath.Join(cfg.UploadDir, rel))
			if err != nil {
				t.Fatalf("read uploaded image: %v", err)
			}
			if !bytes.Equal(got, data) {
				t.Fatal("uploaded image content changed")
			}
		})
	}
}

func TestImageServiceRejectsUnsupportedMIME(t *testing.T) {
	svc := NewImageService(testUploadConfig(t, 1))
	ctx := context.Background()

	if _, err := svc.UploadBlogImage(ctx, 1, "a.png", "text/plain", bytes.NewReader(nil)); !errors.Is(err, uploaderrs.ErrUnsupportedImageType) {
		t.Fatalf("blog error = %v, want ErrUnsupportedImageType", err)
	}
	if _, err := svc.UploadGalleryImage(ctx, 1, "a.png", "text/plain", bytes.NewReader(nil)); !errors.Is(err, uploaderrs.ErrUnsupportedImageType) {
		t.Fatalf("gallery error = %v, want ErrUnsupportedImageType", err)
	}
}

func TestImageServiceContentUploadTooLarge(t *testing.T) {
	svc := NewImageService(testUploadConfig(t, 1))

	_, err := svc.UploadBlogImage(context.Background(), 1, "a.bin", "image/png", &sizedZeroReader{remaining: 1<<20 + 1})
	if !errors.Is(err, uploaderrs.ErrImageTooLarge) {
		t.Fatalf("error = %v, want ErrImageTooLarge", err)
	}
}

func TestImageServiceUploadDesignImage(t *testing.T) {
	cfg := testUploadConfig(t, 1)
	svc := NewImageService(cfg)

	rel, err := svc.UploadDesignImage(context.Background(), 4, bytes.NewReader([]byte("jpeg")))
	if err != nil {
		t.Fatalf("UploadDesignImage: %v", err)
	}
	if !strings.HasPrefix(rel, "design/4/") || !strings.HasSuffix(rel, ".jpg") {
		t.Fatalf("unexpected design path %q", rel)
	}
}

func TestImageServiceUploadDesignImageTooLarge(t *testing.T) {
	svc := NewImageService(testUploadConfig(t, 1))

	_, err := svc.UploadDesignImage(context.Background(), 1, &sizedZeroReader{remaining: designMaxBytes + 1})
	if !errors.Is(err, uploaderrs.ErrImageTooLarge) {
		t.Fatalf("error = %v, want ErrImageTooLarge", err)
	}
}
