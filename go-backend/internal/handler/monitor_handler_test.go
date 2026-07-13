package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ---------- mock MonitorService ----------

type mockMonitorService struct {
	overviewFn   func(ctx context.Context, days int) (dto.Overview, error)
	visitorsFn   func(ctx context.Context, days, page, pageSize int) (dto.Visitors, error)
	userLoginsFn func(ctx context.Context, days, page, pageSize int) (dto.UserLogins, error)
}

func (m *mockMonitorService) GetOverview(ctx context.Context, days int) (dto.Overview, error) {
	return m.overviewFn(ctx, days)
}

func (m *mockMonitorService) GetVisitors(ctx context.Context, days, page, pageSize int) (dto.Visitors, error) {
	return m.visitorsFn(ctx, days, page, pageSize)
}

func (m *mockMonitorService) GetUserLogins(ctx context.Context, days, page, pageSize int) (dto.UserLogins, error) {
	return m.userLoginsFn(ctx, days, page, pageSize)
}

// ---------- helpers ----------

func setupMonitor(svc MonitorService, adminMW gin.HandlerFunc) *gin.Engine {
	h := NewMonitorHandler(svc)
	r := gin.New()
	g := r.Group("/api/v3")
	noopAuth := func(c *gin.Context) { c.Set("user_id", 1); c.Next() }
	h.RegisterRoutes(g, noopAuth, adminMW)
	return r
}

func requestGet(t *testing.T, r *gin.Engine, path string) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, path, nil)
	r.ServeHTTP(w, req)
	return w
}

// ---------- overview ----------

func TestGetOverview_ReturnsData(t *testing.T) {
	svc := &mockMonitorService{
		overviewFn: func(ctx context.Context, days int) (dto.Overview, error) {
			return dto.Overview{TotalVisits: 10, UniqueVisitors: 5, PeriodDays: days}, nil
		},
	}
	adminAllow := func(c *gin.Context) { c.Next() }
	r := setupMonitor(svc, adminAllow)

	w := requestGet(t, r, "/api/v3/status/overview?days=7")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"total_visits":10`) {
		t.Fatalf("unexpected body: %s", w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"message":"Visitor overview data retrieved successfully"`) {
		t.Fatalf("unexpected message: %s", w.Body.String())
	}
}

func TestGetOverview_DefaultsDaysTo7(t *testing.T) {
	svc := &mockMonitorService{
		overviewFn: func(ctx context.Context, days int) (dto.Overview, error) {
			return dto.Overview{PeriodDays: days}, nil
		},
	}
	adminAllow := func(c *gin.Context) { c.Next() }
	r := setupMonitor(svc, adminAllow)

	w := requestGet(t, r, "/api/v3/status/overview")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"period_days":7`) {
		t.Fatalf("expected default days=7, got: %s", w.Body.String())
	}
}

func TestGetOverview_InvalidDays(t *testing.T) {
	svc := &mockMonitorService{}
	adminAllow := func(c *gin.Context) { c.Next() }
	r := setupMonitor(svc, adminAllow)

	w := requestGet(t, r, "/api/v3/status/overview?days=0")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for days=0, got %d", w.Code)
	}

	w = requestGet(t, r, "/api/v3/status/overview?days=91")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for days=91, got %d", w.Code)
	}
}

// ---------- visitors ----------

func TestGetVisitors_ReturnsPaginatedList(t *testing.T) {
	svc := &mockMonitorService{
		visitorsFn: func(ctx context.Context, days, page, pageSize int) (dto.Visitors, error) {
			return dto.Visitors{Total: 50, Page: 1, PageSize: 20, TotalPages: 3}, nil
		},
	}
	adminAllow := func(c *gin.Context) { c.Next() }
	r := setupMonitor(svc, adminAllow)

	w := requestGet(t, r, "/api/v3/status/visitors?days=7&page=1&page_size=20")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"total":50`) || !strings.Contains(w.Body.String(), `"total_pages":3`) {
		t.Fatalf("unexpected body: %s", w.Body.String())
	}
}

func TestGetVisitors_InvalidPageSize(t *testing.T) {
	svc := &mockMonitorService{}
	adminAllow := func(c *gin.Context) { c.Next() }
	r := setupMonitor(svc, adminAllow)

	w := requestGet(t, r, "/api/v3/status/visitors?page_size=101")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for page_size=101, got %d", w.Code)
	}
}

// ---------- user-logins ----------

func TestGetUserLogins_ReturnsList(t *testing.T) {
	svc := &mockMonitorService{
		userLoginsFn: func(ctx context.Context, days, page, pageSize int) (dto.UserLogins, error) {
			return dto.UserLogins{Total: 2, Page: 1, PageSize: 20, TotalPages: 1}, nil
		},
	}
	adminAllow := func(c *gin.Context) { c.Next() }
	r := setupMonitor(svc, adminAllow)

	w := requestGet(t, r, "/api/v3/status/user-logins?days=7&page=1&page_size=20")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"total":2`) {
		t.Fatalf("unexpected body: %s", w.Body.String())
	}
}

// ---------- admin enforcement ----------

func TestMonitorEndpoints_RequireAdmin(t *testing.T) {
	svc := &mockMonitorService{}
	// adminMW that rejects (simulates non-admin user)
	adminReject := func(c *gin.Context) { c.AbortWithStatusJSON(403, gin.H{"error": "Admin access required"}) }
	r := setupMonitor(svc, adminReject)

	paths := []string{
		"/api/v3/status/overview",
		"/api/v3/status/visitors",
		"/api/v3/status/user-logins",
	}
	for _, p := range paths {
		w := requestGet(t, r, p)
		if w.Code != http.StatusForbidden {
			t.Fatalf("%s: expected 403 for non-admin, got %d", p, w.Code)
		}
	}
}

// ---------- error propagation ----------

func TestGetOverview_ServiceError(t *testing.T) {
	svc := &mockMonitorService{
		overviewFn: func(ctx context.Context, days int) (dto.Overview, error) {
			return dto.Overview{}, errors.New("db boom")
		},
	}
	adminAllow := func(c *gin.Context) { c.Next() }
	r := setupMonitor(svc, adminAllow)

	w := requestGet(t, r, "/api/v3/status/overview")
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 on service error, got %d", w.Code)
	}
}
