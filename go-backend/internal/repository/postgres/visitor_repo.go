package postgres

import (
	"context"

	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// VisitorRepo 持有 visitor_track 表的 GORM 写入。
//
// 当前唯一职责是把前端 /track 上报同步落到 PostgreSQL。查询侧走 Python
// monitor_repo（读模型），Go 端未来若需要读 visitor_track 再在这里加方法。
type VisitorRepo struct {
	db *gorm.DB
}

func NewVisitorRepo(db *gorm.DB) *VisitorRepo {
	return &VisitorRepo{db: db}
}

// Insert 写入一条 visitor_track 记录。
func (r *VisitorRepo) Insert(ctx context.Context, v *model.VisitorTrack) error {
	return r.db.WithContext(ctx).Create(v).Error
}
