package jwt

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

func init() {
	// jwt 包依赖 config.Cfg.Security.SecretKey，测试前注入一个固定密钥。
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret-key"}}
}

func TestGenerateToken(t *testing.T) {
	tok, err := GenerateToken(1, time.Now().Add(time.Hour))
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}
	if tok == "" {
		t.Fatal("GenerateToken returned empty string")
	}
}

func TestParseToken_Valid(t *testing.T) {
	expiry := time.Now().Add(time.Hour)
	tok, err := GenerateToken(42, expiry)
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}
	claims, err := ParseToken(tok)
	if err != nil {
		t.Fatalf("ParseToken error: %v", err)
	}
	if claims.Subject != "42" {
		t.Errorf("Subject = %q, want %q", claims.Subject, "42")
	}
	if claims.ExpiresAt == nil {
		t.Fatal("ExpiresAt should not be nil")
	}
}

func TestParseToken_InvalidSignature(t *testing.T) {
	// 用不同密钥签名
	other := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Subject:   "1",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	})
	tok, err := other.SignedString([]byte("wrong-key"))
	if err != nil {
		t.Fatalf("sign error: %v", err)
	}
	_, err = ParseToken(tok)
	if err == nil {
		t.Fatal("expected error for token signed with wrong key, got nil")
	}
}

func TestParseToken_Expired(t *testing.T) {
	tok, err := GenerateToken(1, time.Now().Add(-time.Hour))
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}
	_, err = ParseToken(tok)
	if err == nil {
		t.Fatal("expected error for expired token, got nil")
	}
}

func TestParseToken_Malformed(t *testing.T) {
	_, err := ParseToken("not.a.jwt")
	if err == nil {
		t.Fatal("expected error for malformed token, got nil")
	}
}

func TestParseToken_Empty(t *testing.T) {
	_, err := ParseToken("")
	if err == nil {
		t.Fatal("expected error for empty token, got nil")
	}
}
