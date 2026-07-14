package service

import (
	"context"
	"strings"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

func TestAuthURL_ContainsRequiredParams(t *testing.T) {
	config.Cfg = &config.Config{
		GitHub: config.GitHubConfig{
			ClientID:    "test-client-id",
			RedirectURI: "http://localhost:5555/api/v3/auth/github/callback",
		},
	}

	svc := NewGitHubOAuth(nil, nil, nil, "test-client-id", "", "http://localhost:5555/api/v3/auth/github/callback")

	url, err := svc.AuthURL(context.Background(), "login", 0)
	if err != nil {
		t.Fatalf("AuthURL returned error: %v", err)
	}

	if !strings.Contains(url, "client_id=test-client-id") {
		t.Errorf("missing client_id, got: %s", url)
	}
	if !strings.Contains(url, "redirect_uri=") {
		t.Errorf("missing redirect_uri, got: %s", url)
	}
	if !strings.Contains(url, "scope=read") || !strings.Contains(url, "user") {
		t.Errorf("missing scope, got: %s", url)
	}
	if !strings.HasPrefix(url, "https://github.com/login/oauth/authorize?") {
		t.Errorf("unexpected URL prefix: %s", url)
	}
}

func TestAuthURL_RejectsWhenNotConfigured(t *testing.T) {
	svc := NewGitHubOAuth(nil, nil, nil, "", "", "")

	_, err := svc.AuthURL(context.Background(), "login", 0)
	if err == nil {
		t.Fatal("expected error when GITHUB_CLIENT_ID is empty")
	}
}

// ---------- uniqueUsername ----------

func TestUniqueUsername_BaseAvailable(t *testing.T) {
	calls := 0
	name := uniqueUsername("alice", func(s string) bool {
		calls++
		return false
	})
	if name != "alice" {
		t.Errorf("name = %q, want alice", name)
	}
	if calls != 1 {
		t.Errorf("exists called %d times, want 1", calls)
	}
}

func TestUniqueUsername_BaseTaken(t *testing.T) {
	calls := 0
	name := uniqueUsername("bob", func(s string) bool {
		calls++
		// first call (bob) → taken, second call (bob_xxxx) → available
		return calls == 1
	})
	if name == "bob" {
		t.Errorf("name should have suffix when base taken, got %q", name)
	}
	if calls != 2 {
		t.Errorf("exists called %d times, want 2", calls)
	}
}

func TestUniqueUsername_AllTakesFallback(t *testing.T) {
	// 模拟前 5 次尝试全部被占，应走兜底长随机后缀
	calls := 0
	name := uniqueUsername("charlie", func(s string) bool {
		calls++
		return true // always taken
	})
	if name == "charlie" {
		t.Errorf("name should have suffix when all taken, got %q", name)
	}
	// 1 (base) + 5 (retries) = 6 calls
	if calls != 6 {
		t.Errorf("exists called %d times, want 6", calls)
	}
	// 兜底后缀长度为 8
	if len(name) <= len("charlie")+1 {
		t.Errorf("fallback name %q too short", name)
	}
}

// ---------- randomSuffix ----------

func TestRandomSuffix_Length(t *testing.T) {
	s := randomSuffix(4)
	if len(s) != 4 {
		t.Errorf("len = %d, want 4", len(s))
	}
	s8 := randomSuffix(8)
	if len(s8) != 8 {
		t.Errorf("len = %d, want 8", len(s8))
	}
}

func TestRandomSuffix_Uniqueness(t *testing.T) {
	// 两次调用应得到不同值（极大概率）
	s1 := randomSuffix(8)
	s2 := randomSuffix(8)
	if s1 == s2 {
		t.Errorf("randomSuffix produced same value twice: %q", s1)
	}
}
