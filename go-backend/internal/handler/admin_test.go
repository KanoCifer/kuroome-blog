package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
)

func init() {
	gin.SetMode(gin.TestMode)
	// config.Cfg 被 DevTaskToken handler 读取，测试前注入。
	if config.Cfg == nil {
		config.Cfg = &config.Config{Security: config.SecurityConfig{DevTaskSecret: "test-devtask-secret"}}
	}
}

// ---------- mock AdminService ----------

type mockAdminService struct {
	addPostFn       func(post dto.PostIn) (string, error)
	updatePostFn    func(id string, post dto.PostUpdate) error
	deletePostFn    func(id string) error
	trackFn         func(data dto.VisitorData) error
	listViewsDataFn func() ([]dto.PostViewData, error)
}

func (m *mockAdminService) AddPost(post dto.PostIn) (string, error) {
	return m.addPostFn(post)
}

func (m *mockAdminService) UpdatePost(id string, post dto.PostUpdate) error {
	return m.updatePostFn(id, post)
}

func (m *mockAdminService) DeletePost(id string) error {
	return m.deletePostFn(id)
}

func (m *mockAdminService) TrackVisitor(data dto.VisitorData) error {
	return m.trackFn(data)
}

func (m *mockAdminService) ListPostViewsData() ([]dto.PostViewData, error) {
	return m.listViewsDataFn()
}

// ---------- helpers ----------

func newAdminHandler(svc AdminService) (*AdminHandler, *gin.Engine) {
	h := NewAdminHandler(svc, config.Cfg)
	r := gin.New()
	g := r.Group("/api/v3")
	noopAuth := func(c *gin.Context) { c.Set("user_id", 1); c.Next() }
	noopAdmin := func(c *gin.Context) { c.Next() }
	h.RegisterRoutes(g, noopAuth, noopAdmin)
	return h, r
}

func postJSON(t *testing.T, path string, body any) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	return w, req
}

func putJSON(t *testing.T, path string, body any) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPut, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	return w, req
}

// ---------- DevTaskToken ----------

func TestAdmin_DevTaskToken_Success(t *testing.T) {
	config.Cfg = &config.Config{Security: config.SecurityConfig{DevTaskSecret: "test-devtask-secret"}}
	svc := &mockAdminService{}
	_, r := newAdminHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-task/token", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d; body=%s", w.Code, http.StatusOK, w.Body.String())
	}
	var resp struct {
		Data struct {
			Token     string `json:"token"`
			ExpiresAt string `json:"expires_at"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Data.Token == "" {
		t.Error("expected non-empty token in response")
	}
	if resp.Data.ExpiresAt == "" {
		t.Error("expected expires_at in response")
	}
}

func TestAdmin_DevTaskToken_SecretNotConfigured(t *testing.T) {
	config.Cfg = &config.Config{Security: config.SecurityConfig{DevTaskSecret: ""}}
	svc := &mockAdminService{}
	_, r := newAdminHandler(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-task/token", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want %d", w.Code, http.StatusServiceUnavailable)
	}
}

func TestAdmin_DevTaskToken_Unauthorized(t *testing.T) {
	config.Cfg = &config.Config{Security: config.SecurityConfig{DevTaskSecret: "test-devtask-secret"}}
	svc := &mockAdminService{}
	h := NewAdminHandler(svc, config.Cfg)
	r := gin.New()
	g := r.Group("/api/v3")
	// 真实 AuthMiddleware — 无 Authorization 头应 401
	h.RegisterRoutes(g, realAdminAuthMiddleware(), func(c *gin.Context) { c.Next() })

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v3/dev-task/token", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (missing auth)", w.Code, http.StatusUnauthorized)
	}
}

func realAdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Authorization header is required"})
			return
		}
		c.Set("user_id", 1)
		c.Next()
	}
}

// ---------- AddPost ----------

func TestAdmin_AddPost_Success(t *testing.T) {
	svc := &mockAdminService{
		addPostFn: func(post dto.PostIn) (string, error) {
			return "507f1f77bcf86cd799439011", nil
		},
	}
	_, r := newAdminHandler(svc)
	w, req := postJSON(t, "/api/v3/post/add", dto.PostIn{Title: "t", Body: "b", Tags: []string{"go"}})
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	var resp struct {
		Data    map[string]any `json:"data"`
		Message string         `json:"message"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Data["_id"] != "507f1f77bcf86cd799439011" {
		t.Errorf("data._id = %v, want 507f1f77bcf86cd799439011", resp.Data["_id"])
	}
	if resp.Message != "Blog post added successfully" {
		t.Errorf("message = %q", resp.Message)
	}
}

func TestAdmin_AddPost_Error(t *testing.T) {
	svc := &mockAdminService{
		addPostFn: func(post dto.PostIn) (string, error) {
			return "", errors.New("db down")
		},
	}
	_, r := newAdminHandler(svc)
	w, req := postJSON(t, "/api/v3/post/add", dto.PostIn{Title: "t", Body: "b"})
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

func TestAdmin_AddPost_InvalidBody(t *testing.T) {
	svc := &mockAdminService{addPostFn: func(dto.PostIn) (string, error) { return "", nil }}
	_, r := newAdminHandler(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v3/post/add", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// ---------- UpdatePost ----------

func TestAdmin_UpdatePost_InvalidID(t *testing.T) {
	svc := &mockAdminService{
		updatePostFn: func(id string, post dto.PostUpdate) error { return errs.ErrInvalidPostID },
	}
	_, r := newAdminHandler(svc)
	w, req := putJSON(t, "/api/v3/post/update", dto.PostUpdate{
		PostIn: dto.PostIn{Title: "t", Body: "b"},
		ID:     "bad-id",
	})
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d (invalid id)", w.Code, http.StatusBadRequest)
	}
}

func TestAdmin_UpdatePost_NotFound(t *testing.T) {
	svc := &mockAdminService{
		updatePostFn: func(id string, post dto.PostUpdate) error {
			return errs.ErrPostNotFound
		},
	}
	_, r := newAdminHandler(svc)
	w, req := putJSON(t, "/api/v3/post/update", dto.PostUpdate{
		PostIn: dto.PostIn{Title: "t", Body: "b"},
		ID:     "507f1f77bcf86cd799439011",
	})
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNotFound)
	}
}

func TestAdmin_UpdatePost_MissingID(t *testing.T) {
	svc := &mockAdminService{
		updatePostFn: func(id string, post dto.PostUpdate) error { return nil },
	}
	_, r := newAdminHandler(svc)
	// _id 缺失 → binding 失败
	w, req := putJSON(t, "/api/v3/post/update", dto.PostUpdate{
		PostIn: dto.PostIn{Title: "t", Body: "b"},
	})
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d (missing _id)", w.Code, http.StatusBadRequest)
	}
}

func TestAdmin_UpdatePost_ServerError(t *testing.T) {
	svc := &mockAdminService{
		updatePostFn: func(id string, post dto.PostUpdate) error {
			return errors.New("boom")
		},
	}
	_, r := newAdminHandler(svc)
	w, req := putJSON(t, "/api/v3/post/update", dto.PostUpdate{
		PostIn: dto.PostIn{Title: "t", Body: "b"},
		ID:     "507f1f77bcf86cd799439011",
	})
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

// ---------- DeletePost ----------

func TestAdmin_DeletePost_InvalidID(t *testing.T) {
	svc := &mockAdminService{deletePostFn: func(id string) error { return errs.ErrInvalidPostID }}
	_, r := newAdminHandler(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/api/v3/post/bad-id/delete", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d (invalid id)", w.Code, http.StatusBadRequest)
	}
}

func TestAdmin_DeletePost_NotFound(t *testing.T) {
	svc := &mockAdminService{deletePostFn: func(id string) error { return errs.ErrPostNotFound }}
	_, r := newAdminHandler(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/api/v3/post/507f1f77bcf86cd799439011/delete", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNotFound)
	}
}

func TestAdmin_DeletePost_Success(t *testing.T) {
	svc := &mockAdminService{deletePostFn: func(id string) error { return nil }}
	_, r := newAdminHandler(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/api/v3/post/507f1f77bcf86cd799439011/delete", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
}

// ---------- TrackVisitor ----------

func TestAdmin_TrackVisitor_Disabled(t *testing.T) {
	config.Cfg = &config.Config{Admin: config.AdminConfig{EnableTracking: false}}
	svc := &mockAdminService{trackFn: func(dto.VisitorData) error { return nil }}
	_, r := newAdminHandler(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v3/track", bytes.NewReader([]byte(`{"visitor_id":"v","page_path":"/","page_url":"u"}`)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d (tracking disabled)", w.Code, http.StatusNoContent)
	}
}

func TestAdmin_TrackVisitor_Success(t *testing.T) {
	config.Cfg = &config.Config{Admin: config.AdminConfig{EnableTracking: true}}
	svc := &mockAdminService{trackFn: func(dto.VisitorData) error { return nil }}
	_, r := newAdminHandler(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v3/track", bytes.NewReader([]byte(`{"visitor_id":"v","page_path":"/","page_url":"u"}`)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNoContent)
	}
}
