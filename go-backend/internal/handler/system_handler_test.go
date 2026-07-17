package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ---------- mock SystemService ----------

type mockSystemService struct {
	listEventsFn func(
		ctx context.Context,
		page, perPage int,
		eventType *string,
		start, end *time.Time,
	) (dto.Events, error)
}

func (m *mockSystemService) ListEvents(
	ctx context.Context,
	page, perPage int,
	eventType *string,
	start, end *time.Time,
) (dto.Events, error) {
	if m.listEventsFn != nil {
		return m.listEventsFn(ctx, page, perPage, eventType, start, end)
	}
	return dto.Events{}, nil
}

// ---------- helpers ----------

func setupSystem(svc service.Systemer) *gin.Engine {
	h := NewSystemHandler(svc)
	r := gin.New()
	v3 := r.Group("/v3")
	h.RegisterRoutes(v3)
	return r
}

func systemRequestGet(t *testing.T, r *gin.Engine, path string) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, path, nil)
	r.ServeHTTP(w, req)
	return w
}

// ---------- ping ----------

func TestPing_ReturnsStatusOK(t *testing.T) {
	r := setupSystem(&mockSystemService{})

	w := systemRequestGet(t, r, "/v3/system/")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected body: %s", w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"data":{"status":"ok"}`) {
		t.Fatalf("expected data envelope, got: %s", w.Body.String())
	}
}

// ---------- events ----------

func TestEvents_DefaultParamsReturnsItemsAndPagination(t *testing.T) {
	svc := &mockSystemService{
		listEventsFn: func(
			ctx context.Context, page, perPage int, eventType *string, start, end *time.Time,
		) (dto.Events, error) {
			return dto.Events{
				Items: []dto.Event{
					{ID: 1, Type: "startup", Message: "boot"},
					{ID: 2, Type: "deploy", Message: "v1"},
				},
				Pagination: dto.Pagination{Page: 1, PerPage: 10, Total: 2, Pages: 1,
					HasPrev: false, HasNext: false},
			}, nil
		},
	}
	r := setupSystem(svc)

	w := systemRequestGet(t, r, "/v3/system/events")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"items":[`) {
		t.Fatalf("expected items, got: %s", w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"total":2`) {
		t.Fatalf("expected total=2, got: %s", w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"has_next":false`) {
		t.Fatalf("expected pagination has_next, got: %s", w.Body.String())
	}
	// 消息对齐 Python APIResponse message
	if !strings.Contains(w.Body.String(), `"message":"获取事件列表成功"`) {
		t.Fatalf("unexpected message: %s", w.Body.String())
	}
}

func TestEvents_PassesPageAndTypeToService(t *testing.T) {
	var capturedPage int
	var capturedType string
	svc := &mockSystemService{
		listEventsFn: func(
			ctx context.Context, page, perPage int, eventType *string, start, end *time.Time,
		) (dto.Events, error) {
			capturedPage = page
			if eventType != nil {
				capturedType = *eventType
			}
			return dto.Events{
				Items:      []dto.Event{},
				Pagination: dto.Pagination{Page: page, PerPage: perPage, Total: 0, Pages: 0},
			}, nil
		},
	}
	r := setupSystem(svc)

	w := systemRequestGet(t, r, "/v3/system/events?page=2&per_page=5&type=deploy")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if capturedPage != 2 {
		t.Fatalf("expected page=2 passed to service, got %d", capturedPage)
	}
	if capturedType != "deploy" {
		t.Fatalf("expected type=deploy passed to service, got %q", capturedType)
	}
}

// ---------- invalid params ----------

func TestEvents_InvalidPage(t *testing.T) {
	r := setupSystem(&mockSystemService{})

	w := systemRequestGet(t, r, "/v3/system/events?page=0")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for page=0, got %d", w.Code)
	}

	w = systemRequestGet(t, r, "/v3/system/events?page=abc")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for page=abc, got %d", w.Code)
	}
}

func TestEvents_InvalidPerPage(t *testing.T) {
	r := setupSystem(&mockSystemService{})

	w := systemRequestGet(t, r, "/v3/system/events?per_page=0")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for per_page=0, got %d", w.Code)
	}

	w = systemRequestGet(t, r, "/v3/system/events?per_page=201")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for per_page=201, got %d", w.Code)
	}
}

func TestEvents_InvalidStartFormat(t *testing.T) {
	r := setupSystem(&mockSystemService{})

	w := systemRequestGet(t, r, "/v3/system/events?start=not-a-date")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid start, got %d", w.Code)
	}
}

// ---------- service error ----------

func TestEvents_ServiceError(t *testing.T) {
	svc := &mockSystemService{
		listEventsFn: func(
			ctx context.Context, page, perPage int, eventType *string, start, end *time.Time,
		) (dto.Events, error) {
			return dto.Events{}, errors.New("db boom")
		},
	}
	r := setupSystem(svc)

	w := systemRequestGet(t, r, "/v3/system/events")
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 on service error, got %d", w.Code)
	}
}
