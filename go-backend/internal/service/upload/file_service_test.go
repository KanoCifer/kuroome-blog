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

func TestFileServiceUploadFile(t *testing.T) {
	cfg := testUploadConfig(t, 1)
	svc := NewFileService(cfg)
	data := []byte("file body")

	rel, err := svc.UploadFile(context.Background(), 7, "REPORT.PnG", bytes.NewReader(data))
	if err != nil {
		t.Fatalf("UploadFile: %v", err)
	}
	if !strings.HasPrefix(rel, "uploads/7/") || !strings.HasSuffix(rel, ".png") {
		t.Fatalf("unexpected path %q", rel)
	}
	got, err := os.ReadFile(filepath.Join(cfg.UploadDir, rel))
	if err != nil {
		t.Fatalf("read uploaded file: %v", err)
	}
	if !bytes.Equal(got, data) {
		t.Fatalf("uploaded data = %q, want %q", got, data)
	}
}

func TestFileServiceUploadFileTooLarge(t *testing.T) {
	svc := NewFileService(testUploadConfig(t, 1))

	_, err := svc.UploadFile(context.Background(), 1, "a.bin", &sizedZeroReader{remaining: 1<<20 + 1})
	if !errors.Is(err, uploaderrs.ErrImageTooLarge) {
		t.Fatalf("error = %v, want ErrImageTooLarge", err)
	}
}
