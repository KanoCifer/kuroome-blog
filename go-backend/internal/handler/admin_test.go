package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"app/internal/config"
	"app/internal/dto"
	"app/internal/service"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ---------- mock AdminService ----------

type mockAdminService struct {
	addPostFn    func(post dto.PostIn) (string, error)
	updatePostFn func(id string, post dto.PostUpdate) error
	deletePostFn func(id string) error
	trackFn      func(data dto.VisitorData) error
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

// ---------- helpers ----------

func newAdminHandler(svc AdminService) (*AdminHandler, *gin.Engine) {
	h := NewAdminHandler(svc)
	r := gin.New()
	g := r.Group("/api/v3")
	h.RegisterRoutes(g, func(c *gin.Context) { c.Next() })
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
		updatePostFn: func(id string, post dto.PostUpdate) error { return service.ErrInvalidPostID },
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
			return service.ErrPostNotFound
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
	svc := &mockAdminService{deletePostFn: func(id string) error { return service.ErrInvalidPostID }}
	_, r := newAdminHandler(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/api/v3/post/bad-id/delete", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d (invalid id)", w.Code, http.StatusBadRequest)
	}
}

func TestAdmin_DeletePost_NotFound(t *testing.T) {
	svc := &mockAdminService{deletePostFn: func(id string) error { return service.ErrPostNotFound }}
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
	config.Cfg = &config.Config{ENABLE_TRACKING: false}
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
	config.Cfg = &config.Config{ENABLE_TRACKING: true}
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
