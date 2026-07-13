package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
	"github.com/KanoCifer/kuroome-blog/internal/repository/mongodb"
)

// ---------- mock DevTaskRepository ----------

type mockDevTaskRepo struct {
	createFn       func(ctx context.Context, task *document.DevTask) error
	getBySlugFn    func(ctx context.Context, slug string) (*document.DevTask, error)
	listFn         func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) ([]document.DevTask, int64, error)
	updateFn       func(ctx context.Context, slug string, fields bson.M) error
	softDelFn      func(ctx context.Context, slug string) error
	hardDelFn      func(ctx context.Context, slug string) error
	archiveFn      func(ctx context.Context) (int64, error)
	findFrontierFn func(ctx context.Context, limit int) ([]document.DevTask, error)
	nextSlugSeqFn  func(ctx context.Context) (int, error)
}

func (m *mockDevTaskRepo) Create(ctx context.Context, task *document.DevTask) error {
	return m.createFn(ctx, task)
}

func (m *mockDevTaskRepo) GetBySlug(ctx context.Context, slug string) (*document.DevTask, error) {
	if m.getBySlugFn != nil {
		return m.getBySlugFn(ctx, slug)
	}
	return nil, nil
}

func (m *mockDevTaskRepo) List(ctx context.Context, filter mongodb.ListFilter, page, perPage int) ([]document.DevTask, int64, error) {
	return m.listFn(ctx, filter, page, perPage)
}

func (m *mockDevTaskRepo) Update(ctx context.Context, slug string, fields bson.M) error {
	return m.updateFn(ctx, slug, fields)
}

func (m *mockDevTaskRepo) SoftDelete(ctx context.Context, slug string) error {
	return m.softDelFn(ctx, slug)
}

func (m *mockDevTaskRepo) HardDelete(ctx context.Context, slug string) error {
	return m.hardDelFn(ctx, slug)
}

func (m *mockDevTaskRepo) ArchiveDoneTasks(ctx context.Context) (int64, error) {
	return m.archiveFn(ctx)
}

func (m *mockDevTaskRepo) FindFrontier(ctx context.Context, limit int) ([]document.DevTask, error) {
	if m.findFrontierFn != nil {
		return m.findFrontierFn(ctx, limit)
	}
	return nil, nil
}

func (m *mockDevTaskRepo) NextSlugSeq(ctx context.Context) (int, error) {
	if m.nextSlugSeqFn != nil {
		return m.nextSlugSeqFn(ctx)
	}
	return 0, nil
}

// newService 用 mock repo 构造 service。
func newService(repo DevTaskRepository) *DevTaskService {
	return &DevTaskService{repo: repo}
}

const testSlug = "task-1"

// ---------- Create ----------

func TestDevTaskService_Create_Success(t *testing.T) {
	var captured *document.DevTask
	repo := &mockDevTaskRepo{
		nextSlugSeqFn: func(ctx context.Context) (int, error) { return 1, nil },
		createFn: func(ctx context.Context, task *document.DevTask) error {
			captured = task
			return nil
		},
	}
	svc := newService(repo)

	out, err := svc.Create(context.Background(), 42, dto.DevTaskCreate{
		Title: "Write tests", Type: document.TaskTypeFeature, Priority: document.PriorityP1, Scope: document.ScopeGo,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if out.Slug != testSlug {
		t.Errorf("out.Slug = %q, want %s", out.Slug, testSlug)
	}
	if out.Status != document.StatusTriage {
		t.Errorf("out.Status = %q, want %q (default)", out.Status, document.StatusTriage)
	}
	if captured == nil || captured.UserID != 42 {
		t.Errorf("captured.UserID = %v, want 42", captured)
	}
	if captured.CreatedAt.IsZero() || captured.UpdatedAt.IsZero() {
		t.Errorf("timestamps not set: created=%v updated=%v", captured.CreatedAt, captured.UpdatedAt)
	}
}

func TestDevTaskService_Create_RepoError(t *testing.T) {
	repo := &mockDevTaskRepo{
		createFn: func(ctx context.Context, task *document.DevTask) error {
			return errors.New("mongo timeout")
		},
	}
	svc := newService(repo)

	_, err := svc.Create(context.Background(), 1, dto.DevTaskCreate{
		Title: "x", Type: document.TaskTypeBug, Priority: document.PriorityP0, Scope: document.ScopeGeneral,
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ---------- List ----------

func TestDevTaskService_List_Pagination(t *testing.T) {
	repo := &mockDevTaskRepo{
		listFn: func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) ([]document.DevTask, int64, error) {
			return []document.DevTask{
				{ID: "1", Title: "a"},
				{ID: "2", Title: "b"},
			}, 20, nil
		},
	}
	svc := newService(repo)

	out, err := svc.List(context.Background(), mongodb.ListFilter{}, 2, 10)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(out.Tasks) != 2 {
		t.Errorf("len(tasks) = %d, want 2", len(out.Tasks))
	}
	if out.Pagination.Total != 20 {
		t.Errorf("pagination.Total = %d, want 20", out.Pagination.Total)
	}
	if out.Pagination.Page != 2 {
		t.Errorf("pagination.Page = %d, want 2", out.Pagination.Page)
	}
}

func TestDevTaskService_List_Defaults(t *testing.T) {
	var gotPage, gotPerPage int
	repo := &mockDevTaskRepo{
		listFn: func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) ([]document.DevTask, int64, error) {
			gotPage, gotPerPage = page, perPage
			return []document.DevTask{}, 0, nil
		},
	}
	svc := newService(repo)

	_, err := svc.List(context.Background(), mongodb.ListFilter{}, 0, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if gotPage != 1 {
		t.Errorf("page = %d, want 1 (default)", gotPage)
	}
	if gotPerPage != 10 {
		t.Errorf("perPage = %d, want 10 (default)", gotPerPage)
	}
}

func TestDevTaskService_List_EmptyReturnsArray(t *testing.T) {
	repo := &mockDevTaskRepo{
		listFn: func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) ([]document.DevTask, int64, error) {
			return nil, 0, nil
		},
	}
	svc := newService(repo)

	out, err := svc.List(context.Background(), mongodb.ListFilter{}, 1, 10)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if out.Tasks == nil {
		t.Errorf("Tasks = nil, want empty array")
	}
	if len(out.Tasks) != 0 {
		t.Errorf("len(Tasks) = %d, want 0", len(out.Tasks))
	}
}

// ---------- Update ----------

func TestDevTaskService_Update_OnlySetFields(t *testing.T) {
	var gotFields bson.M
	repo := &mockDevTaskRepo{
		updateFn: func(ctx context.Context, slug string, fields bson.M) error {
			gotFields = fields
			return nil
		},
	}
	svc := newService(repo)

	status := document.StatusDone
	err := svc.Update(context.Background(), testSlug, dto.DevTaskUpdate{Status: &status})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if gotFields["status"] != document.StatusDone {
		t.Errorf("fields[status] = %v, want %s", gotFields["status"], document.StatusDone)
	}
	if _, ok := gotFields["title"]; ok {
		t.Errorf("fields[title] should not be set")
	}
	if _, ok := gotFields["updated_at"]; !ok {
		t.Errorf("fields[updated_at] should be auto-set")
	}
}

func TestDevTaskService_Update_NoOp(t *testing.T) {
	called := false
	repo := &mockDevTaskRepo{
		updateFn: func(ctx context.Context, slug string, fields bson.M) error {
			called = true
			return nil
		},
	}
	svc := newService(repo)

	err := svc.Update(context.Background(), testSlug, dto.DevTaskUpdate{})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if called {
		t.Error("repo.Update should not be called for empty update")
	}
}

// ---------- Delete ----------

func TestDevTaskService_SoftDelete_Success(t *testing.T) {
	repo := &mockDevTaskRepo{
		softDelFn: func(ctx context.Context, slug string) error { return nil },
	}
	svc := newService(repo)

	err := svc.SoftDelete(context.Background(), testSlug)
	if err != nil {
		t.Fatalf("SoftDelete: %v", err)
	}
}

func TestDevTaskService_HardDelete_Success(t *testing.T) {
	repo := &mockDevTaskRepo{
		hardDelFn: func(ctx context.Context, slug string) error { return nil },
	}
	svc := newService(repo)

	err := svc.HardDelete(context.Background(), testSlug)
	if err != nil {
		t.Fatalf("HardDelete: %v", err)
	}
}

// ---------- ArchiveDoneTasks ----------

func TestDevTaskService_ArchiveDoneTasks(t *testing.T) {
	repo := &mockDevTaskRepo{
		archiveFn: func(ctx context.Context) (int64, error) { return 5, nil },
	}
	svc := newService(repo)

	n, err := svc.ArchiveDoneTasks(context.Background())
	if err != nil {
		t.Fatalf("ArchiveDoneTasks: %v", err)
	}
	if n != 5 {
		t.Errorf("n = %d, want 5", n)
	}
}

// ---------- serializeTask ----------

func TestSerializeTask(t *testing.T) {
	due := time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC)
	desc := "desc"
	doc := document.DevTask{
		ID:          "507f1f77bcf86cd799439011",
		Slug:        testSlug,
		UserID:      7,
		Title:       "test",
		Description: &desc,
		Type:        document.TaskTypeBug,
		Priority:    document.PriorityP0,
		Scope:       document.ScopeGo,
		Status:      document.StatusInProgress,
		SortOrder:   3,
		DueDate:     &due,
		IsDeleted:   false,
		CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		UpdatedAt:   time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC),
	}

	out := serializeTask(doc)
	if out.Slug != testSlug || out.Title != "test" || *out.Description != "desc" {
		t.Errorf("serializeTask basic fields wrong: %+v", out)
	}
	if out.DueDate == nil || !out.DueDate.Equal(due) {
		t.Errorf("DueDate = %v, want %v", out.DueDate, due)
	}
}

func TestSerializeTasks_Empty(t *testing.T) {
	out := serializeTasks(nil)
	if out == nil || len(out) != 0 {
		t.Errorf("serializeTasks(nil) = %v, want empty non-nil slice", out)
	}
}
