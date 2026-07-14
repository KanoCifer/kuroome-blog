package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

// ---------- mock EventRepository ----------

type mockEventRepo struct {
	countFn func(ctx context.Context, f postgres.EventFilter) (int, error)
	listFn  func(ctx context.Context, f postgres.EventFilter, offset, limit int) ([]model.Event, error)
}

func (m *mockEventRepo) Count(ctx context.Context, f postgres.EventFilter) (int, error) {
	if m.countFn != nil {
		return m.countFn(ctx, f)
	}
	return 0, nil
}

func (m *mockEventRepo) List(ctx context.Context, f postgres.EventFilter, offset, limit int) ([]model.Event, error) {
	if m.listFn != nil {
		return m.listFn(ctx, f, offset, limit)
	}
	return nil, nil
}

// ---------- clamp ----------

func TestClamp(t *testing.T) {
	tests := []struct {
		name string
		x, lo, hi, want int
	}{
		{"zero_passthrough", 0, 1, 200, 0},
		{"within_range", 50, 1, 200, 50},
		{"below_lo", -5, 1, 200, 1},
		{"above_hi", 300, 1, 200, 200},
		{"at_lo", 1, 1, 200, 1},
		{"at_hi", 200, 1, 200, 200},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := clamp(tt.x, tt.lo, tt.hi); got != tt.want {
				t.Errorf("clamp(%d, %d, %d) = %d, want %d", tt.x, tt.lo, tt.hi, got, tt.want)
			}
		})
	}
}

// ---------- toEventDTO ----------

func TestToEventDTO_WithExtra(t *testing.T) {
	e := model.Event{
		ID:        1,
		Timestamp: time.Date(2026, 7, 14, 0, 0, 0, 0, time.UTC),
		Type:      "deploy",
		Source:    "ci",
		Title:     "Deployed",
		Message:   "v1.0.0",
		Extra:     []byte(`{"version":"1.0.0"}`),
	}

	dto := toEventDTO(e)
	if dto.ID != 1 {
		t.Errorf("ID = %d, want 1", dto.ID)
	}
	if dto.Type != "deploy" {
		t.Errorf("Type = %q, want deploy", dto.Type)
	}
	if dto.Extra == nil {
		t.Fatal("Extra should not be nil")
	}
	if dto.Extra["version"] != "1.0.0" {
		t.Errorf("Extra[version] = %v, want 1.0.0", dto.Extra["version"])
	}
}

func TestToEventDTO_EmptyExtra(t *testing.T) {
	e := model.Event{ID: 2, Type: "start", Title: "Boot"}

	dto := toEventDTO(e)
	if dto.Extra != nil {
		t.Errorf("Extra = %v, want nil for empty extra", dto.Extra)
	}
}

func TestToEventDTO_InvalidExtraJSON(t *testing.T) {
	// 非法 JSON 不 panic，Extra 保持 nil
	e := model.Event{ID: 3, Extra: []byte(`not-json`)}

	dto := toEventDTO(e)
	if dto.Extra != nil {
		t.Errorf("Extra = %v, want nil for invalid JSON", dto.Extra)
	}
}

// ---------- ListEvents ----------

func TestListEvents_Pagination(t *testing.T) {
	var gotOffset, gotLimit int
	repo := &mockEventRepo{
		countFn: func(ctx context.Context, f postgres.EventFilter) (int, error) {
			// 验证 filter 字段透传
			if f.Type == nil || *f.Type != "deploy" {
				t.Errorf("filter.Type = %v, want deploy", f.Type)
			}
			return 25, nil
		},
		listFn: func(ctx context.Context, f postgres.EventFilter, offset, limit int) ([]model.Event, error) {
			gotOffset, gotLimit = offset, limit
			return []model.Event{
				{ID: 1, Type: "deploy"},
				{ID: 2, Type: "deploy"},
			}, nil
		},
	}
	svc := NewSystemService(repo)

	eventType := "deploy"
	out, err := svc.ListEvents(context.Background(), 2, 10, &eventType, nil, nil)
	if err != nil {
		t.Fatalf("ListEvents: %v", err)
	}
	if out.Pagination.Total != 25 {
		t.Errorf("Total = %d, want 25", out.Pagination.Total)
	}
	if out.Pagination.Pages != 3 {
		t.Errorf("Pages = %d, want 3", out.Pagination.Pages)
	}
	if out.Pagination.Page != 2 {
		t.Errorf("Page = %d, want 2", out.Pagination.Page)
	}
	if gotOffset != 10 {
		t.Errorf("offset = %d, want 10", gotOffset)
	}
	if gotLimit != 10 {
		t.Errorf("limit = %d, want 10", gotLimit)
	}
	if len(out.Items) != 2 {
		t.Errorf("len(Items) = %d, want 2", len(out.Items))
	}
}

func TestListEvents_Defaults(t *testing.T) {
	var gotOffset, gotLimit int
	repo := &mockEventRepo{
		countFn: func(ctx context.Context, f postgres.EventFilter) (int, error) { return 5, nil },
		listFn: func(ctx context.Context, f postgres.EventFilter, offset, limit int) ([]model.Event, error) {
			gotOffset, gotLimit = offset, limit
			return nil, nil
		},
	}
	svc := NewSystemService(repo)

	// page=0, perPage=0 → 应默认 page=1, perPage=10
	out, err := svc.ListEvents(context.Background(), 0, 0, nil, nil, nil)
	if err != nil {
		t.Fatalf("ListEvents: %v", err)
	}
	if gotOffset != 0 {
		t.Errorf("offset = %d, want 0 (page=1)", gotOffset)
	}
	if gotLimit != 10 {
		t.Errorf("limit = %d, want 10 (default perPage)", gotLimit)
	}
	if out.Pagination.PerPage != 10 {
		t.Errorf("PerPage = %d, want 10", out.Pagination.PerPage)
	}
}

func TestListEvents_PerPageClamped(t *testing.T) {
	var gotLimit int
	repo := &mockEventRepo{
		countFn: func(ctx context.Context, f postgres.EventFilter) (int, error) { return 0, nil },
		listFn: func(ctx context.Context, f postgres.EventFilter, offset, limit int) ([]model.Event, error) {
			gotLimit = limit
			return nil, nil
		},
	}
	svc := NewSystemService(repo)

	// perPage=500 应被 clamp 到 200
	_, err := svc.ListEvents(context.Background(), 1, 500, nil, nil, nil)
	if err != nil {
		t.Fatalf("ListEvents: %v", err)
	}
	if gotLimit != 200 {
		t.Errorf("limit = %d, want 200 (clamped)", gotLimit)
	}
}

func TestListEvents_CountError(t *testing.T) {
	repo := &mockEventRepo{
		countFn: func(ctx context.Context, f postgres.EventFilter) (int, error) {
			return 0, errors.New("db error")
		},
	}
	svc := NewSystemService(repo)

	_, err := svc.ListEvents(context.Background(), 1, 10, nil, nil, nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestListEvents_ListError(t *testing.T) {
	repo := &mockEventRepo{
		countFn: func(ctx context.Context, f postgres.EventFilter) (int, error) { return 5, nil },
		listFn: func(ctx context.Context, f postgres.EventFilter, offset, limit int) ([]model.Event, error) {
			return nil, errors.New("db error")
		},
	}
	svc := NewSystemService(repo)

	_, err := svc.ListEvents(context.Background(), 1, 10, nil, nil, nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestListEvents_HasPrevHasNext(t *testing.T) {
	repo := &mockEventRepo{
		countFn: func(ctx context.Context, f postgres.EventFilter) (int, error) { return 30, nil },
		listFn:  func(ctx context.Context, f postgres.EventFilter, offset, limit int) ([]model.Event, error) { return nil, nil },
	}
	svc := NewSystemService(repo)

	// page=2 of 3 → hasPrev=true, hasNext=true
	out, err := svc.ListEvents(context.Background(), 2, 10, nil, nil, nil)
	if err != nil {
		t.Fatalf("ListEvents: %v", err)
	}
	if !out.Pagination.HasPrev {
		t.Error("HasPrev = false, want true")
	}
	if !out.Pagination.HasNext {
		t.Error("HasNext = false, want true")
	}
	if out.Pagination.PrevNum == nil || *out.Pagination.PrevNum != 1 {
		t.Errorf("PrevNum = %v, want 1", out.Pagination.PrevNum)
	}
	if out.Pagination.NextNum == nil || *out.Pagination.NextNum != 3 {
		t.Errorf("NextNum = %v, want 3", out.Pagination.NextNum)
	}

	// page=1 (first) → no prev
	out, _ = svc.ListEvents(context.Background(), 1, 10, nil, nil, nil)
	if out.Pagination.HasPrev {
		t.Error("HasPrev = true, want false on first page")
	}
	if out.Pagination.PrevNum != nil {
		t.Errorf("PrevNum = %v, want nil on first page", out.Pagination.PrevNum)
	}
}
