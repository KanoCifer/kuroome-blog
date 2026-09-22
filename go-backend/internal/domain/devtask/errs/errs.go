// Package devtaskerrs 定义 devtask 看板域业务错误。
package devtaskerrs

import "github.com/KanoCifer/kuroome-blog/internal/apierr"

var ErrTaskNotFound = apierr.New(404, "task not found")

var (
	ErrSlugInvalidFormat    = apierr.New(400, "invalid slug format, expected task-N where N is a positive integer")
	ErrSlugConflict         = apierr.New(409, "slug already exists")
	ErrSlugSequenceTooSmall = apierr.New(400, "custom slug number must be >= current sequence")
)
