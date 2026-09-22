// Package fisherrs 定义摸鱼（fish）域业务错误。
package fisherrs

import "github.com/KanoCifer/kuroome-blog/internal/apierr"

// ErrInvalidKind 摸鱼记录类型非法。
var ErrInvalidKind = apierr.New(400, "invalid_kind: kind 必须在 lake/river/reservoir 之一")
