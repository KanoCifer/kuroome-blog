package nomu

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"

	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp" // 注册 webp 解码（仅解码，无编码器）
)

const (
	// compressTriggerBytes 单图超过此大小才压缩（1.5MB）。
	compressTriggerBytes = 1500 * 1024
	// maxLongEdge 压缩后长边上限（px），只缩不放。
	maxLongEdge = 2048
	// maxSingleBytes 单张参考图硬上限（10MB）。
	maxSingleBytes = 10 << 20
	// maxTotalBytes 多图合计上限（6MB）。
	maxTotalBytes = 6 << 20
)

// ErrImageTooLarge 参考图经压缩收敛后仍超过上传上限。
var ErrImageTooLarge = errors.New("design: reference image too large")

// compressionPass 逐级收敛的压缩档位：先 2048/q90，不够再降尺寸与质量。
type compressionPass struct {
	maxDim  int
	quality int
}

var compressionPasses = []compressionPass{
	{maxLongEdge, 90}, {1536, 80}, {1024, 70}, {768, 60},
}

// compressImages 把参考图压到上传预算内，返回可发送的字节。
//
// 首选档（pass 0）只处理 >1.5MB 的图：长边缩到 2048px 内（不放大小图）、
// 按原格式以质量 0.9 重编码。单张解码/编码失败则回退原图继续，不中断整个请求。
// 若合计 >6MB 或单张 >10MB，后续档位强制处理所有图（含 <1.5MB 的）逐级降尺寸/质量。
// 所有档位仍超标才返回 ErrImageTooLarge。
func compressImages(raws [][]byte) ([][]byte, error) {
	for i, pass := range compressionPasses {
		forced := i > 0 // 首档尊重 1.5MB 门槛；后续为满足总量预算强制处理
		out := make([][]byte, len(raws))
		total, overSingle := 0, false
		for j, raw := range raws {
			enc := raw
			if forced || len(raw) > compressTriggerBytes {
				if b, err := compressOne(raw, pass.maxDim, pass.quality); err == nil {
					enc = b
				}
				// err != nil：压缩失败，回退原图继续
			}
			out[j] = enc
			total += len(enc)
			if len(enc) > maxSingleBytes {
				overSingle = true
			}
		}
		if !overSingle && total <= maxTotalBytes {
			return out, nil
		}
	}
	return nil, ErrImageTooLarge
}

// compressOne 解码单张图，长边缩到 maxDim 内（不放大小图），
// 按原格式重编码（jpeg 用 quality；png 无损）。webp 无编码器 → 返回错误由调用方回退。
// 重编码后更大则保留原图，避免越压越大。
func compressOne(raw []byte, maxDim, quality int) ([]byte, error) {
	src, format, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	dst := resizeToMax(src, maxDim)

	var buf bytes.Buffer
	switch format {
	case "jpeg":
		err = jpeg.Encode(&buf, dst, &jpeg.Options{Quality: quality})
	case "png":
		err = png.Encode(&buf, dst)
	default:
		return nil, fmt.Errorf("unsupported format %q", format)
	}
	if err != nil {
		return nil, fmt.Errorf("encode: %w", err)
	}
	if buf.Len() >= len(raw) {
		return raw, nil
	}
	return buf.Bytes(), nil
}

// resizeToMax 等比缩放使长边不超过 maxDim；已经够小则原样返回（不放大小图）。
func resizeToMax(src image.Image, maxDim int) image.Image {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= maxDim && h <= maxDim {
		return src
	}
	scale := float64(maxDim) / float64(max(w, h))
	nw, nh := max(1, int(float64(w)*scale)), max(1, int(float64(h)*scale))
	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, b, xdraw.Over, nil)
	return dst
}
