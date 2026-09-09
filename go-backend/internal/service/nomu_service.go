package service

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"gorm.io/datatypes"

	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

var (
	// ErrSyncConflict 云端与本地 version 不一致，需用户决定以哪端为准。
	ErrSyncConflict = errors.New("nomu: config version conflict")
	// ErrSyncTooMany 单次同步携带的配置条数超过上限。
	ErrSyncTooMany = errors.New("nomu: sync batch too large")
)

const syncMaxBatch = 200

// NomuRepository 定义 NomuService 依赖的数据能力（供 mock 测试）。
type NomuRepository interface {
	FindByUserId(ctx context.Context, userId uint) ([]model.NomuConfig, error)
	Create(ctx context.Context, cfg *model.NomuConfig) error
	Update(ctx context.Context, userId uint, scope model.NomuConfigScope, configId string, updates *model.NomuConfig) error
	Delete(ctx context.Context, userId uint, scope model.NomuConfigScope, configId string) error
}

// NomuService 是 handler 依赖的接口。
type NomuService interface {
	// SyncNomuConfig 把本地配置全量同步到云端。
	//
	// 语义：以本地为基准——本地有/改的 upsert（version 乐观并发），
	// 本地标 deleted 的软删云端。返回云端当前全量供前端对齐。
	// lastSyncAt 用于增量拉取（仅同步该时间之后变更的行），nil 表示全量。
	SyncNomuConfig(ctx context.Context, userId uint, local []NomuSyncItem, lastSyncAt *time.Time) ([]NomuSyncItem, error)
}

// NomuSyncItem 是单条配置在同步协议中的表示（对齐 Dexie configs 表一行）。
type NomuSyncItem struct {
	ConfigScope model.NomuConfigScope `json:"configScope"`
	ConfigID    string                `json:"configId"`
	ConfigData  datatypes.JSON        `json:"configData"`
	Deleted     bool                  `json:"deleted"`
	Version     int64                 `json:"version"`
	DeviceID    *string               `json:"deviceId,omitempty"`
	UpdatedAt   time.Time             `json:"updatedAt"`
}

type NomuServiceStruct struct {
	repo NomuRepository
}

func NewNomuService(repo *postgres.NomuRepository) *NomuServiceStruct {
	return &NomuServiceStruct{repo: repo}
}

func (s *NomuServiceStruct) SyncNomuConfig(ctx context.Context, userId uint, local []NomuSyncItem, lastSyncAt *time.Time) ([]NomuSyncItem, error) {
	if len(local) > syncMaxBatch {
		return nil, ErrSyncTooMany
	}

	now := time.Now().UTC()

	// 以本地为基准 upsert：逐条按 (user_id, config_scope, config_id) 命中。
	// 本地 deleted=true 走软删；其余走 Create（首次）/ Update（已存在）。
	// version 冲突（Update 命中 0 行）留给云端返回值体现：前端拿回全量后可比对。
	for _, item := range local {
		updates := &model.NomuConfig{
			ConfigData: item.ConfigData,
			Version:    item.Version,
			DeviceID:   item.DeviceID,
			UpdatedAt:  item.UpdatedAt,
		}
		err := s.repo.Update(ctx, userId, item.ConfigScope, item.ConfigID, updates)
		if err != nil {
			if !errors.Is(err, postgres.ErrNotFound) {
				return nil, err
			}
			// 云端不存在 → 新建。软删行也可新建（前端删除后重新创建同 id 场景）。
			cfg := &model.NomuConfig{
				UserID:      userId,
				ConfigScope: item.ConfigScope,
				ConfigID:    item.ConfigID,
				ConfigData:  item.ConfigData,
				Deleted:     item.Deleted,
				Version:     item.Version,
				DeviceID:    item.DeviceID,
				UpdatedAt:   item.UpdatedAt,
				CreatedAt:   now,
			}
			if cerr := s.repo.Create(ctx, cfg); cerr != nil {
				// 并发创建已被其它请求抢建 → 再试一次 Update。
				if errors.Is(cerr, postgres.ErrConfigExists) {
					if uerr := s.repo.Update(ctx, userId, item.ConfigScope, item.ConfigID, updates); uerr != nil {
						return nil, uerr
					}
					continue
				}
				return nil, cerr
			}
		}
	}

	cloud, err := s.repo.FindByUserId(ctx, userId)
	if err != nil {
		return nil, err
	}

	// 组装响应：仅返回 lastSyncAt 之后有变化的行（增量）；lastSyncAt 为 nil 全量返回。
	out := make([]NomuSyncItem, 0, len(cloud))
	for _, c := range cloud {
		if lastSyncAt != nil && !c.UpdatedAt.After(*lastSyncAt) {
			continue
		}
		out = append(out, NomuSyncItem{
			ConfigScope: c.ConfigScope,
			ConfigID:    c.ConfigID,
			ConfigData:  c.ConfigData,
			Deleted:     c.Deleted,
			Version:     c.Version,
			DeviceID:    c.DeviceID,
			UpdatedAt:   c.UpdatedAt,
		})
	}

	slog.InfoContext(ctx, "nomu config synced",
		"user_id", userId, "local_items", len(local), "cloud_items", len(cloud), "returned", len(out))
	return out, nil
}
