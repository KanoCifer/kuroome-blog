// Package nomuerrs 定义 Nomu 同步（nomu）域业务错误。
// 仅覆盖 nomu_service 的配置同步面；design 子系统（service/nomu/）自带错误集，
// 见 service/nomu/design_service.go。
package nomuerrs

import "github.com/KanoCifer/kuroome-blog/internal/apierr"

var (
	ErrSyncConflict = apierr.New(409, "nomu: config version conflict")
	ErrSyncTooMany  = apierr.New(400, "nomu: sync batch too large")
)
