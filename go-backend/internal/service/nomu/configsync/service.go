package configsync

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"gorm.io/datatypes"

	nomuerrs "github.com/KanoCifer/kuroome-blog/internal/domain/nomu/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

const syncMaxBatch = 200

// Repository is the config persistence needed by Service.
type Repository interface {
	FindByUserId(ctx context.Context, userId uint) ([]model.NomuConfig, error)
	Create(ctx context.Context, cfg *model.NomuConfig) error
	Update(ctx context.Context, userId uint, scope model.NomuConfigScope, configId string, updates *model.NomuConfig) error
}

// Item is one config row in the sync protocol.
type Item struct {
	ConfigScope model.NomuConfigScope `json:"configScope"`
	ConfigID    string                `json:"configId"`
	ConfigData  datatypes.JSON        `json:"configData"`
	Deleted     bool                  `json:"deleted"`
	Version     int64                 `json:"version"`
	DeviceID    *string               `json:"deviceId,omitempty"`
	UpdatedAt   time.Time             `json:"updatedAt"`
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) SyncNomuConfig(ctx context.Context, userId uint, local []Item, lastSyncAt *time.Time) ([]Item, error) {
	if len(local) > syncMaxBatch {
		return nil, nomuerrs.ErrSyncTooMany
	}

	now := time.Now().UTC()

	// Local is authoritative: update first, create on not found, and retry an
	// update when another request won the create race.
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
			if createErr := s.repo.Create(ctx, cfg); createErr != nil {
				if errors.Is(createErr, postgres.ErrConfigExists) {
					if updateErr := s.repo.Update(ctx, userId, item.ConfigScope, item.ConfigID, updates); updateErr != nil {
						return nil, updateErr
					}
					continue
				}
				return nil, createErr
			}
		}
	}

	cloud, err := s.repo.FindByUserId(ctx, userId)
	if err != nil {
		return nil, err
	}

	out := make([]Item, 0, len(cloud))
	for _, c := range cloud {
		if lastSyncAt != nil && !c.UpdatedAt.After(*lastSyncAt) {
			continue
		}
		out = append(out, Item{
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
