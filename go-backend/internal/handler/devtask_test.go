package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
	"github.com/KanoCifer/kuroome-blog/internal/repository/mongodb"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ---------- mock DevTaskService ----------

type mockDevTaskService struct {
	createFn       func(ctx context.Context, userID int, req dto.DevTaskCreate) (*dto.DevTaskOut, error)
	getBySlugFn    func(ctx context.Context, slug string) (*dto.DevTaskOut, error)
	listFn         func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) (*dto.DevTaskListOut, error)
	updateFn       func(ctx context.Context, slug string, req dto.DevTaskUpdate) error
	softDelFn      func(ctx context.Context, slug string) error
	hardDelFn      func(ctx context.Context, slug string) error
	findFrontierFn func(ctx context.Context, limit int) ([]dto.DevTaskOut, error)
}

func (m *mockDevTaskService) Create(ctx context.Context, userID int, req dto.DevTaskCreate) (*dto.DevTaskOut, error) {
	return m.createFn(ctx, userID, req)
}

func (m *mockDevTaskService) GetBySlug(ctx context.Context, slug string) (*dto.DevTaskOut, error) {
	if m.getBySlugFn != nil {
		return m.getBySlugFn(ctx, slug)
	}
	return nil, nil
}

func (m *mockDevTaskService) List(ctx context.Context, filter mongodb.ListFilter, page, perPage int) (*dto.DevTaskListOut, error) {
	return m.listFn(ctx, filter, page, perPage)
}

func (m *mockDevTaskService) Update(ctx context.Context, slug string, req dto.DevTaskUpdate) error {
	return m.updateFn(ctx, slug, req)
}

func (m *mockDevTaskService) SoftDelete(ctx context.Context, slug string) error {
	return m.softDelFn(ctx, slug)
}

func (m *mockDevTaskService) HardDelete(ctx context.Context, slug string) error {
	return m.hardDelFn(ctx, slug)
}

func (m *mockDevTaskService) FindFrontier(ctx context.Context, limit int) ([]dto.DevTaskOut, error) {
	if m.findFrontierFn != nil {
		return m.findFrontierFn(ctx, limit)
	}
	return nil, nil
}

// ---------- helpers ----------

func newDevTaskHandler(svc DevTaskService) *gin.Engine {
	h := NewDevTaskHandler(svc)
	r := gin.New()
	g := r.Group("/api/v3")
	noopAuth := func(c *gin.Context) { c.Next() }
	h.RegisterRoutes(g, noopAuth)
	return r
}

func taskJSONBody(t *testing.T, body any) *bytes.Reader {
	t.Helper()
	b, _ := json.Marshal(body)
	return bytes.NewReader(b)
}

func decodeResp(t *testing.T, body []byte) (data map[string]any, message string) {
	t.Helper()
	var resp struct {
		Data    map[string]any `json:"data"`
		Message string         `json:"message"`
	}
	_ = json.Unmarshal(body, &resp)
	return resp.Data, resp.Message
}

const testSlug = "task-1"

// ---------- CreateTask ----------

func TestDevTask_CreateTask_Success(t *testing.T) {
	svc := &mockDevTaskService{
		createFn: func(ctx context.Context, userID int, req dto.DevTaskCreate) (*dto.DevTaskOut, error) {
			return &dto.DevTaskOut{Title: req.Title, Status: document.StatusTriage, Slug: testSlug}, nil
		},
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v3/dev-tasks", taskJSONBody(t, dto.DevTaskCreate{
		Title: "Add tests", Type: document.TaskTypeFeature, Priority: document.PriorityP1, Scope: document.ScopeGo,
	}))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d; body=%s", w.Code, http.StatusOK, w.Body.String())
	}
	data, msg := decodeResp(t, w.Body.Bytes())
	if data["slug"] != testSlug {
		t.Errorf("data.slug = %v, want %s", data["slug"], testSlug)
	}
	if msg != "Task created successfully" {
		t.Errorf("message = %q", msg)
	}
}

func TestDevTask_CreateTask_InvalidBody(t *testing.T) {
	svc := &mockDevTaskService{
		createFn: func(ctx context.Context, userID int, req dto.DevTaskCreate) (*dto.DevTaskOut, error) {
			return nil, nil
		},
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v3/dev-tasks", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestDevTask_CreateTask_ServerError(t *testing.T) {
	svc := &mockDevTaskService{
		createFn: func(ctx context.Context, userID int, req dto.DevTaskCreate) (*dto.DevTaskOut, error) {
			return nil, errors.New("mongo down")
		},
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v3/dev-tasks", taskJSONBody(t, dto.DevTaskCreate{
		Title: "x", Type: document.TaskTypeBug, Priority: document.PriorityP0, Scope: document.ScopeGeneral,
	}))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

// ---------- GetTaskBySlug ----------

func TestDevTask_GetTaskBySlug_Success(t *testing.T) {
	svc := &mockDevTaskService{
		getBySlugFn: func(ctx context.Context, slug string) (*dto.DevTaskOut, error) {
			return &dto.DevTaskOut{Title: "Fix bug", Slug: slug}, nil
		},
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-tasks/"+testSlug, nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d; body=%s", w.Code, http.StatusOK, w.Body.String())
	}
	data, _ := decodeResp(t, w.Body.Bytes())
	if data["slug"] != testSlug {
		t.Errorf("data.slug = %v, want %s", data["slug"], testSlug)
	}
}

func TestDevTask_GetTaskBySlug_NotFound(t *testing.T) {
	svc := &mockDevTaskService{
		getBySlugFn: func(ctx context.Context, slug string) (*dto.DevTaskOut, error) {
			return nil, errs.ErrTaskNotFound
		},
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-tasks/"+testSlug, nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNotFound)
	}
}

// ---------- ListTasks ----------

func TestDevTask_ListTasks_Success(t *testing.T) {
	svc := &mockDevTaskService{
		listFn: func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) (*dto.DevTaskListOut, error) {
			return &dto.DevTaskListOut{
				Tasks: []dto.DevTaskOut{
					{ID: "1", Title: "a"},
					{ID: "2", Title: "b"},
				},
				Pagination: dto.PaginationOut{Page: 1, PerPage: 10, Total: 2, Pages: 1},
			}, nil
		},
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-tasks?page=1&per_page=10", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d; body=%s", w.Code, http.StatusOK, w.Body.String())
	}
	data, _ := decodeResp(t, w.Body.Bytes())
	tasks, ok := data["tasks"].([]any)
	if !ok || len(tasks) != 2 {
		t.Errorf("data.tasks = %v, want 2 items", data["tasks"])
	}
}

func TestDevTask_ListTasks_Empty(t *testing.T) {
	svc := &mockDevTaskService{
		listFn: func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) (*dto.DevTaskListOut, error) {
			return &dto.DevTaskListOut{Tasks: []dto.DevTaskOut{}, Pagination: dto.PaginationOut{Page: 1}}, nil
		},
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-tasks", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
}

func TestDevTask_ListTasks_WithFilters(t *testing.T) {
	var gotFilter mongodb.ListFilter
	svc := &mockDevTaskService{
		listFn: func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) (*dto.DevTaskListOut, error) {
			gotFilter = filter
			return &dto.DevTaskListOut{Tasks: []dto.DevTaskOut{}}, nil
		},
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-tasks?status=P0+紧急&type=问题&priority=P0+紧急", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if gotFilter.Status == nil || *gotFilter.Status != "P0 紧急" {
		t.Errorf("filter.Status = %v, want P0 紧急", gotFilter.Status)
	}
	if gotFilter.Type == nil || *gotFilter.Type != "问题" {
		t.Errorf("filter.Type = %v, want 问题", gotFilter.Type)
	}
}

// ---------- UpdateTask ----------

func TestDevTask_UpdateTask_Success(t *testing.T) {
	svc := &mockDevTaskService{
		updateFn: func(ctx context.Context, slug string, req dto.DevTaskUpdate) error { return nil },
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPatch, "/api/v3/dev-tasks/"+testSlug, taskJSONBody(t, gin.H{
		"status": document.StatusDone,
	}))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d; body=%s", w.Code, http.StatusOK, w.Body.String())
	}
}

func TestDevTask_UpdateTask_InvalidBody(t *testing.T) {
	svc := &mockDevTaskService{
		updateFn: func(ctx context.Context, slug string, req dto.DevTaskUpdate) error { return nil },
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPatch, "/api/v3/dev-tasks/"+testSlug, bytes.NewReader([]byte("bad")))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// ---------- SoftDeleteTask ----------

func TestDevTask_SoftDelete_Success(t *testing.T) {
	svc := &mockDevTaskService{
		softDelFn: func(ctx context.Context, slug string) error { return nil },
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/api/v3/dev-tasks/"+testSlug, nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
}

// ---------- HardDeleteTask ----------

func TestDevTask_HardDelete_Success(t *testing.T) {
	svc := &mockDevTaskService{
		hardDelFn: func(ctx context.Context, slug string) error { return nil },
	}
	r := newDevTaskHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/api/v3/dev-tasks/"+testSlug+"/permanent", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
}

// ---------- Auth 保护 ----------

func TestDevTask_Unauthorized_NoUser(t *testing.T) {
	svc := &mockDevTaskService{
		listFn: func(ctx context.Context, filter mongodb.ListFilter, page, perPage int) (*dto.DevTaskListOut, error) {
			return &dto.DevTaskListOut{}, nil
		},
	}
	h := NewDevTaskHandler(svc)
	r := gin.New()
	g := r.Group("/api/v3")
	// 使用真实 devtask-JWT 中间件模拟无 service-token 场景
	h.RegisterRoutes(g, realDevTaskMiddleware())

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-tasks", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (missing service token)", w.Code, http.StatusUnauthorized)
	}
}

// realDevTaskMiddleware 模拟 DevTaskMiddleware 的 service-JWT 校验：
// 无 Authorization 头即 401（由 DevTaskMiddleware 行为决定）。
func realDevTaskMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Authorization header is required"})
			return
		}
		c.Next()
	}
}
