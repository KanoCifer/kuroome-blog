// Package fisherrs 定义摸鱼（fish）域业务错误。
package fisherrs

import "errors"

// ErrInvalidKind 摸鱼记录类型非法。
var ErrInvalidKind = errors.New("invalid_kind")
