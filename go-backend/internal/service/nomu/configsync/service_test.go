package configsync

import (
	"context"
	"errors"
	"testing"
	"time"

	nomuerrs "github.com/KanoCifer/kuroome-blog/internal/domain/nomu/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

type fakeRepository struct {
	cloud       []model.NomuConfig
	updateCalls int
	createErr   error
}

func (r *fakeRepository) FindByUserId(context.Context, uint) ([]model.NomuConfig, error) {
	return r.cloud, nil
}

func (r *fakeRepository) Create(context.Context, *model.NomuConfig) error {
	return r.createErr
}

func (r *fakeRepository) Update(context.Context, uint, model.NomuConfigScope, string, *model.NomuConfig) error {
	r.updateCalls++
	if r.updateCalls == 1 {
		return postgres.ErrNotFound
	}
	return nil
}

func TestSyncNomuConfigRetriesCreateRaceAndFiltersByLastSyncAt(t *testing.T) {
	updated := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	lastSync := updated.Add(-time.Minute)
	repo := &fakeRepository{
		createErr: postgres.ErrConfigExists,
		cloud: []model.NomuConfig{
			{ConfigID: "old", UpdatedAt: lastSync.Add(-time.Second)},
			{ConfigID: "new", ConfigData: []byte(`{"enabled":true}`), UpdatedAt: updated},
		},
	}
	svc := NewService(repo)

	got, err := svc.SyncNomuConfig(t.Context(), 1, []Item{{ConfigID: "new", Version: 2, UpdatedAt: updated}}, &lastSync)
	if err != nil {
		t.Fatalf("SyncNomuConfig: %v", err)
	}
	if repo.updateCalls != 2 {
		t.Fatalf("update calls = %d, want 2", repo.updateCalls)
	}
	if len(got) != 1 || got[0].ConfigID != "new" {
		t.Fatalf("result = %#v, want only new config", got)
	}
}

func TestSyncNomuConfigRejectsBatchOver200(t *testing.T) {
	_, err := NewService(&fakeRepository{}).SyncNomuConfig(t.Context(), 1, make([]Item, 201), nil)
	if !errors.Is(err, nomuerrs.ErrSyncTooMany) {
		t.Fatalf("error = %v, want ErrSyncTooMany", err)
	}
}
