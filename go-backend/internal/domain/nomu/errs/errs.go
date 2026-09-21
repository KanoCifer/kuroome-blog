// Package nomuerrs 定义 Nomu 同步（nomu）域业务错误。
// 仅覆盖 nomu_service 的配置同步面；design 子系统（service/nomu/）自带错误集，
// 见 service/nomu/design_service.go。
package nomuerrs

import "errors"

var (
	ErrSyncConflict = errors.New("nomu: config version conflict")
	ErrSyncTooMany  = errors.New("nomu: sync batch too large")
)
