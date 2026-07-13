package postgres

import (
	"context"
	"time"

	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// VisitorRepo 持有 visitor_track 表的 GORM 读写。
//
// 写入侧把前端 /track 上报同步落到 PostgreSQL；查询侧为 monitor 端点
// 提供聚合统计（overview / visitors），对齐 Python monitor_repo.py 的语义。
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

// CountVisitsSince 统计 visit_time >= start 的总访问次数。
func (r *VisitorRepo) CountVisitsSince(ctx context.Context, start time.Time) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.VisitorTrack{}).
		Where("visit_time >= ?", start).
		Count(&count).
		Error
	return int(count), err
}

// CountUniqueVisitorsSince 统计 visit_time >= start 的独立 visitor_id 数。
func (r *VisitorRepo) CountUniqueVisitorsSince(ctx context.Context, start time.Time) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.VisitorTrack{}).
		Where("visit_time >= ?", start).
		Distinct("visitor_id").
		Count(&count).
		Error
	return int(count), err
}

// CountUniqueVisitorIDsSince 在 Python 中与 CountUniqueVisitorsSince 等价
// （monitor_repo 中两者都 count distinct visitor_id），保留独立方法以对齐原语义。
func (r *VisitorRepo) CountUniqueVisitorIDsSince(ctx context.Context, start time.Time) (int, error) {
	return r.CountUniqueVisitorsSince(ctx, start)
}

// GetTopPagesSince 返回 visit_time >= start 的热门页面（按次数降序）。
func (r *VisitorRepo) GetTopPagesSince(ctx context.Context, start time.Time, limit int) ([]map[string]any, error) {
	var results []map[string]any
	err := r.db.WithContext(ctx).
		Model(&model.VisitorTrack{}).
		Select("page_path, count(id) as count").
		Where("visit_time >= ?", start).
		Group("page_path").
		Order("count(id) desc").
		Limit(limit).
		Find(&results).
		Error
	return results, err
}

// GetBrowserStatsSince 按 browser_name + browser_version 聚合访问次数。
func (r *VisitorRepo) GetBrowserStatsSince(ctx context.Context, start time.Time) ([]map[string]any, error) {
	var results []map[string]any
	err := r.db.WithContext(ctx).
		Model(&model.VisitorTrack{}).
		Select("browser_name, browser_version, count(id) as count").
		Where("visit_time >= ?", start).
		Group("browser_name, browser_version").
		Order("count(id) desc").
		Find(&results).
		Error
	return results, err
}

// GetOSSStatsSince 按 os_name + os_version 聚合访问次数。
func (r *VisitorRepo) GetOSSStatsSince(ctx context.Context, start time.Time) ([]map[string]any, error) {
	var results []map[string]any
	err := r.db.WithContext(ctx).
		Model(&model.VisitorTrack{}).
		Select("os_name, os_version, count(id) as count").
		Where("visit_time >= ?", start).
		Group("os_name, os_version").
		Order("count(id) desc").
		Find(&results).
		Error
	return results, err
}

// GetDailyTrendSince 按日期聚合访问次数（visit_time 取 date 部分）。
func (r *VisitorRepo) GetDailyTrendSince(ctx context.Context, start time.Time) ([]map[string]any, error) {
	var results []map[string]any
	err := r.db.WithContext(ctx).
		Model(&model.VisitorTrack{}).
		Select("date(visit_time) as date, count(id) as count").
		Where("visit_time >= ?", start).
		Group("date(visit_time)").
		Order("date(visit_time) desc").
		Find(&results).
		Error
	return results, err
}

// ListVisitorsSince 返回 visit_time >= start 的访客记录（按时间倒序，分页）。
func (r *VisitorRepo) ListVisitorsSince(ctx context.Context, start time.Time, offset, limit int) ([]model.VisitorTrack, error) {
	var tracks []model.VisitorTrack
	err := r.db.WithContext(ctx).
		Model(&model.VisitorTrack{}).
		Where("visit_time >= ?", start).
		Order("visit_time desc").
		Offset(offset).
		Limit(limit).
		Find(&tracks).
		Error
	return tracks, err
}
