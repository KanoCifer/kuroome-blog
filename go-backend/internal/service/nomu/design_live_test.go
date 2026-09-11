//go:build live

// 真连 apiyi 的联调测试：默认不编译（-tags live 才启用），避免普通 go test
// 触发真实计费。运行：
//
//	APIYI_API_KEY=sk-xxx go test -tags live ./internal/service/nomu/ -run TestLive -v
//
// 产出图写入临时目录（t.TempDir()，测试结束自动清理），并打印本次两张图的
// 响应与用量；需要留档时把日志里的路径复制出来。
package nomu

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

// liveStore 把结果图写到 dir，返回文件名（仅联调用，替代 uploadService）。
type liveStore struct{ dir string }

func (s liveStore) UploadDesignImage(_ context.Context, _ uint, src io.Reader) (string, error) {
	b, err := io.ReadAll(src)
	if err != nil {
		return "", err
	}
	name := fmt.Sprintf("%d.png", time.Now().UnixNano())
	if err := os.WriteFile(filepath.Join(s.dir, name), b, 0o644); err != nil {
		return "", err
	}
	return name, nil
}

// referenceImage 生成一张带色块的 PNG 作为图片编辑的参考图（避免依赖外部素材）。
func referenceImage(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 512, 512))
	for y := 0; y < 512; y++ {
		for x := 0; x < 512; x++ {
			img.Set(x, y, color.RGBA{uint8(x % 256), uint8(y % 256), 128, 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestLive_Apiyi_Text2ImageAndEdit(t *testing.T) {
	key := os.Getenv("APIYI_API_KEY")
	if key == "" {
		t.Skip("APIYI_API_KEY 未设置，跳过真实调用")
	}
	dir := t.TempDir()
	t.Logf("产出图目录: %s", dir)

	svc := NewSingleDesignService(httpclient.WithLongTimeout(), ApiyiProvider(key, ""), liveStore{dir}, nil)
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
	defer cancel()

	// 1) 文生图
	t2i, err := svc.Generate(ctx, GenerateRequest{
		Prompt: "横版 16:9 一只戴墨镜的橘猫，扁平插画风，纯色背景",
	})
	if err != nil {
		t.Fatalf("文生图失败: %v", err)
	}
	reportLive(t, "text2image", t2i)

	// 2) 图片编辑（参考图走 data URL，途经压缩 + multipart）
	ref := "data:image/png;base64," + base64.StdEncoding.EncodeToString(referenceImage(t))
	edit, err := svc.Generate(ctx, GenerateRequest{
		Prompt: "图1 改成赛博朋克霓虹风格，保留主体构图",
		Images: []string{ref},
	})
	if err != nil {
		t.Fatalf("图片编辑失败: %v", err)
	}
	reportLive(t, "image-edit", edit)
}

func reportLive(t *testing.T, label string, res *GenerateResult) {
	t.Helper()
	for _, img := range res.Images {
		slog.Info(label, "index", img.Index, "url", img.URL)
	}
	t.Logf("[%s] model=%s images=%d created=%d usage=%+v",
		label, res.Model, len(res.Images), res.Created, res.Usage)
}
