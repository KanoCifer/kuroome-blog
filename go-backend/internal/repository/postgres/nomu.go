package postgres

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"errors"

	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/jackc/pgx/v5/pgconn"
)



var (
    ErrNotFound     = errors.New("nomu config not found")
    ErrConfigExists = errors.New("config id already exists")
)

type NomuRepository struct {
    db *gorm.DB
}

func NewNomuRepository(db *gorm.DB) *NomuRepository {
    return &NomuRepository{db: db}
}

func (r *NomuRepository) active() *gorm.DB {
    return r.db.Where("deleted = ?", false)
}

func (r *NomuRepository) FindByUserId(ctx context.Context, userId uint) ([]model.NomuConfig, error) {
    var cfgs []model.NomuConfig
    if err := r.active().WithContext(ctx).
        Where("user_id = ?", userId).
        Find(&cfgs).Error; err != nil {
        return nil, fmt.Errorf("find nomu config: %w", err)
    }
    return cfgs, nil
}

func (r *NomuRepository) Create(ctx context.Context, cfg *model.NomuConfig) error {
    if err := r.db.WithContext(ctx).Create(cfg).Error; err != nil {
        var pgErr *pgconn.PgError
        if errors.As(err, &pgErr) && pgErr.Code == "23505" {
            return ErrConfigExists
        }
        return fmt.Errorf("create nomu config: %w", err)
    }
    return nil
}

func (r *NomuRepository) Update(ctx context.Context, userId uint, scope model.NomuConfigScope, configId string, updates *model.NomuConfig) error {
    res := r.active().WithContext(ctx).
        Model(&model.NomuConfig{}).
        Where("user_id = ? AND config_scope = ? AND config_id = ?", userId, scope, configId).
        Select("config_data", "version", "device_id", "updated_at").
        Updates(updates)
    if res.Error != nil {
        return fmt.Errorf("update nomu config: %w", res.Error)
    }
    if res.RowsAffected == 0 {
        return ErrNotFound
    }
    return nil
}

func (r *NomuRepository) Delete(ctx context.Context, userId uint, scope model.NomuConfigScope, configId string) error {
    res := r.active().WithContext(ctx).
        Model(&model.NomuConfig{}).
        Where("user_id = ? AND config_scope = ? AND config_id = ?", userId, scope, configId).
        UpdateColumns(map[string]any{
            "deleted":    true,
            "updated_at": time.Now().UTC(),
        })
    if res.Error != nil {
        return fmt.Errorf("delete nomu config: %w", res.Error)
    }
    if res.RowsAffected == 0 {
        return ErrNotFound
    }
    return nil
}
