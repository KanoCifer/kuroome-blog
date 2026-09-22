// Package blogerrs 定义 blog(post) 域业务错误。
package blogerrs

import "github.com/KanoCifer/kuroome-blog/internal/apierr"

var (
	ErrPostNotFound  = apierr.New(404, "blog post not found")
	ErrInvalidPostID = apierr.New(400, "invalid post id")
)
