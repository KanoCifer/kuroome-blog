package upload

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"io"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

func testUploadConfig(t *testing.T, maxMB int) *config.UploadConfig {
	t.Helper()
	return &config.UploadConfig{UploadDir: t.TempDir(), MaxUploadMB: maxMB}
}

func testPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 300, 200))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

type sizedZeroReader struct{ remaining int64 }

func (r *sizedZeroReader) Read(p []byte) (int, error) {
	if r.remaining == 0 {
		return 0, io.EOF
	}
	if int64(len(p)) > r.remaining {
		p = p[:r.remaining]
	}
	for i := range p {
		p[i] = 0
	}
	r.remaining -= int64(len(p))
	return len(p), nil
}
