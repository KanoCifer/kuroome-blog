package postgres

import (
	"context"
	"time"

	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// EventRepo 持有 event 表的 GORM 读写。
//
// 为 system 端点提供事件计数与分页查询，对齐 Python EventRepo 的语义
// （count_events / get_events：可选 type/start/end 过滤，按时间倒序）。
type EventRepo struct {
	db *gorm.DB
}

func NewEventRepo(db *gorm.DB) *EventRepo {
	return &EventRepo{db: db}
}

// EventFilter 是 Count / List 共享的可选过滤条件。
// 所有字段均为指针：nil 表示"不过滤"。start / end 为闭区间（含端点），
// 对齐 Python 的 Event.timestamp >= start / <= end 语义。
type EventFilter struct {
	Type  *string
	Start *time.Time
	End   *time.Time
}

// buildFilter 把可选过滤条件拼成一条共享的 *gorm.DB，供 Count / List 复用。
func (r *EventRepo) buildFilter(ctx context.Context, f EventFilter) *gorm.DB {
	tx := r.db.WithContext(ctx).Model(&model.Event{})
	if f.Type != nil {
		tx = tx.Where("type = ?", *f.Type)
	}
	if f.Start != nil {
		tx = tx.Where("timestamp >= ?", *f.Start)
	}
	if f.End != nil {
		tx = tx.Where("timestamp <= ?", *f.End)
	}
	return tx
}

// Count 统计满足过滤条件的事件总数，对齐 Python EventRepo.count_events。
func (r *EventRepo) Count(ctx context.Context, f EventFilter) (int, error) {
	var count int64
	err := r.buildFilter(ctx, f).Count(&count).Error
	return int(count), err
}

// List 分页查询事件（按时间倒序），对齐 Python EventRepo.get_events。
func (r *EventRepo) List(ctx context.Context, f EventFilter, offset, limit int) ([]model.Event, error) {
	var events []model.Event
	err := r.buildFilter(ctx, f).
		Order("timestamp desc").
		Offset(offset).
		Limit(limit).
		Find(&events).
		Error
	return events, err
}
