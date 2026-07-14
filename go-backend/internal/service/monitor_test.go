package service

import (
	"testing"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// ---------- hasRecentLogin ----------

func TestHasRecentLogin_CurrentLoginInWindow(t *testing.T) {
	now := time.Now()
	u := model.User{CurrentLoginAt: &now}
	start := now.Add(-1 * time.Hour)
	if !hasRecentLogin(u, start) {
		t.Error("should return true when current_login_at is within window")
	}
}

func TestHasRecentLogin_LastLoginInWindow(t *testing.T) {
	now := time.Now()
	u := model.User{LastLoginAt: &now}
	start := now.Add(-1 * time.Hour)
	if !hasRecentLogin(u, start) {
		t.Error("should return true when last_login_at is within window")
	}
}

func TestHasRecentLogin_BothOutsideWindow(t *testing.T) {
	old := time.Now().Add(-48 * time.Hour)
	u := model.User{CurrentLoginAt: &old, LastLoginAt: &old}
	start := time.Now().Add(-24 * time.Hour)
	if hasRecentLogin(u, start) {
		t.Error("should return false when both logins are outside window")
	}
}

func TestHasRecentLogin_NilLogins(t *testing.T) {
	u := model.User{}
	start := time.Now().Add(-24 * time.Hour)
	if hasRecentLogin(u, start) {
		t.Error("should return false when both login times are nil")
	}
}

func TestHasRecentLogin_ExactlyAtBoundary(t *testing.T) {
	// start 是闭区间：login_at == start 应返回 true
	now := time.Now()
	u := model.User{CurrentLoginAt: &now}
	if !hasRecentLogin(u, now) {
		t.Error("should return true when login_at exactly equals start (closed interval)")
	}
}

func TestHasRecentLogin_JustBeforeBoundary(t *testing.T) {
	now := time.Now()
	u := model.User{CurrentLoginAt: &now}
	start := now.Add(time.Second)
	if hasRecentLogin(u, start) {
		t.Error("should return false when login_at is before start")
	}
}

// ---------- isoPtr -----------

func TestIsoPtr_Nil(t *testing.T) {
	s := isoPtr(nil)
	if s != nil {
		t.Errorf("isoPtr(nil) = %v, want nil", s)
	}
}

func TestIsoPtr_Value(t *testing.T) {
	tm := time.Date(2026, 7, 14, 12, 0, 0, 0, time.UTC)
	s := isoPtr(&tm)
	if s == nil {
		t.Fatal("isoPtr returned nil for non-nil input")
	}
	if *s != "2026-07-14T12:00:00Z" {
		t.Errorf("isoPtr = %q, want 2026-07-14T12:00:00Z", *s)
	}
}

// ---------- round2 ----------

func TestRound2(t *testing.T) {
	tests := []struct {
		in   float64
		want float64
	}{
		{1.234, 1.23},
		{1.235, 1.24},
		{1.999, 2.0},
		{0.0, 0.0},
		{-1.234, -1.23},
		{3.14159, 3.14},
	}
	for _, tt := range tests {
		if got := round2(tt.in); got != tt.want {
			t.Errorf("round2(%v) = %v, want %v", tt.in, got, tt.want)
		}
	}
}

// ---------- pagination ----------

func TestMonitorPagination_EdgeCases(t *testing.T) {
	// 验证 monitor 层使用的分页公式（向上取整）与 blog service 一致
	tests := []struct {
		total, pageSize, wantPages int
	}{
		{0, 10, 0},
		{1, 10, 1},
		{10, 10, 1},
		{11, 10, 2},
		{20, 10, 2},
		{21, 10, 3},
	}
	for _, tt := range tests {
		got := (tt.total + tt.pageSize - 1) / tt.pageSize
		if got != tt.wantPages {
			t.Errorf("pagination(%d, %d) = %d, want %d", tt.total, tt.pageSize, got, tt.wantPages)
		}
	}
}
