package service

import (
	"strings"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

func TestAuthURL_ContainsRequiredParams(t *testing.T) {
	config.Cfg = &config.Config{
		GITHUB_CLIENT_ID:     "test-client-id",
		GITHUB_REDIRECT_URI:  "http://localhost:5555/api/v3/auth/github/callback",
	}

	svc := NewGitHubOAuth(nil, nil, nil) // redis/repo not needed for URL gen

	url, err := svc.AuthURL("login", 0)
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
	config.Cfg = &config.Config{GITHUB_CLIENT_ID: ""}
	svc := NewGitHubOAuth(nil, nil, nil)

	_, err := svc.AuthURL("login", 0)
	if err == nil {
		t.Fatal("expected error when GITHUB_CLIENT_ID is empty")
	}
}
