// Package uploaderrs 定义上传/媒体域业务错误。ErrInvalidImageData/ErrImageTooLarge
// 也被 internal/util/image.go 引用（util 服务于 upload）。
package uploaderrs

import "github.com/KanoCifer/kuroome-blog/internal/apierr"

var (
	ErrInvalidUploadType    = apierr.New(400, "未知的上传类型")
	ErrUnsupportedImageType = apierr.New(400, "不支持的图片类型")
	ErrImageTooLarge        = apierr.New(400, "图片过大")
	ErrInvalidImageData     = apierr.New(400, "无效的图片数据")
)
