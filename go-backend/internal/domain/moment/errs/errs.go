// Package momenterrs 定义 moment 域业务错误。ErrInvalidObjectID 当前仅服务
// moment 集合（mongodb/moment + helper），后续如多集合需要再抽 common。
package momenterrs

import "github.com/KanoCifer/kuroome-blog/internal/apierr"

var (
	ErrMomentNotFound  = apierr.New(404, "moment not found")
	ErrInvalidObjectID = apierr.New(400, "Invalid ObjectID")
)
