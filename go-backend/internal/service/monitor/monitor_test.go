package monitor

import (
	"testing"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

func TestHasRecentLogin_CurrentLoginInWindow(t *testing.T) {
	now := time.Now()
	if !hasRecentLogin(model.User{CurrentLoginAt: &now}, now.Add(-time.Hour)) {
		t.Error("should return true when current_login_at is within window")
	}
}

func TestHasRecentLogin_LastLoginInWindow(t *testing.T) {
	now := time.Now()
	if !hasRecentLogin(model.User{LastLoginAt: &now}, now.Add(-time.Hour)) {
		t.Error("should return true when last_login_at is within window")
	}
}

func TestHasRecentLogin_BothOutsideWindow(t *testing.T) {
	old := time.Now().Add(-48 * time.Hour)
	if hasRecentLogin(model.User{CurrentLoginAt: &old, LastLoginAt: &old}, time.Now().Add(-24*time.Hour)) {
		t.Error("should return false when both logins are outside window")
	}
}

func TestHasRecentLogin_NilLogins(t *testing.T) {
	if hasRecentLogin(model.User{}, time.Now().Add(-24*time.Hour)) {
		t.Error("should return false when both login times are nil")
	}
}

func TestHasRecentLogin_ExactlyAtBoundary(t *testing.T) {
	now := time.Now()
	if !hasRecentLogin(model.User{CurrentLoginAt: &now}, now) {
		t.Error("should return true when login_at exactly equals start")
	}
}

func TestHasRecentLogin_JustBeforeBoundary(t *testing.T) {
	now := time.Now()
	if hasRecentLogin(model.User{CurrentLoginAt: &now}, now.Add(time.Second)) {
		t.Error("should return false when login_at is before start")
	}
}

func TestIsoPtr_Nil(t *testing.T) {
	if isoPtr(nil) != nil {
		t.Error("isoPtr(nil) should be nil")
	}
}

func TestIsoPtr_Value(t *testing.T) {
	tm := time.Date(2026, 7, 14, 12, 0, 0, 0, time.UTC)
	if got := isoPtr(&tm); got == nil || *got != "2026-07-14T12:00:00Z" {
		t.Errorf("isoPtr = %v", got)
	}
}

func TestRound2(t *testing.T) {
	for _, tt := range []struct{ in, want float64 }{{1.234, 1.23}, {1.235, 1.24}, {1.999, 2}, {0, 0}, {-1.234, -1.23}, {3.14159, 3.14}} {
		if got := round2(tt.in); got != tt.want {
			t.Errorf("round2(%v) = %v, want %v", tt.in, got, tt.want)
		}
	}
}

func TestMonitorPagination_EdgeCases(t *testing.T) {
	for _, tt := range []struct{ total, pageSize, want int }{{0, 10, 0}, {1, 10, 1}, {10, 10, 1}, {11, 10, 2}, {20, 10, 2}, {21, 10, 3}} {
		if got := pagination(1, tt.pageSize, tt.total).Pages; got != tt.want {
			t.Errorf("pagination = %d, want %d", got, tt.want)
		}
	}
}
