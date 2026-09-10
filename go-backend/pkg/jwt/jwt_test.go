package jwt

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

func init() {
	// jwt 包依赖 config.Cfg.Security.SecretKey，测试前注入一个固定密钥。
	config.Cfg = &config.Config{Security: config.SecurityConfig{
		SecretKey:     "test-secret-key",
		DevTaskSecret: "devtask-test-secret",
	}}
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
	if claims.ID == "" {
		t.Fatal("ID (jti) should not be nil")
	}
}

func TestGenerateToken_JTIUnique(t *testing.T) {
	tok1, err := GenerateToken(1, time.Now().Add(time.Hour))
	if err != nil {
		t.Fatalf("GenerateToken 1 error: %v", err)
	}
	tok2, err := GenerateToken(1, time.Now().Add(time.Hour))
	if err != nil {
		t.Fatalf("GenerateToken 2 error: %v", err)
	}
	c1, err := ParseToken(tok1)
	if err != nil {
		t.Fatalf("ParseToken 1 error: %v", err)
	}
	c2, err := ParseToken(tok2)
	if err != nil {
		t.Fatalf("ParseToken 2 error: %v", err)
	}
	if c1.ID == "" || c2.ID == "" {
		t.Fatal("jti should not be empty")
	}
	if c1.ID == c2.ID {
		t.Fatalf("two tokens got same jti: %q", c1.ID)
	}
	// 当前时间窗口下锁定长度契约：8 hex 秒时间戳(2026 ≈ 1.7e9 已达 8 位) + 12 hex 随机 = 20 字符。
	// ponytail: 2106 年后时间戳突破 2^32,长度会扩到 21。届时人工调整 %08x 宽度或接受契约变化。
	if len(c1.ID) != 20 {
		t.Fatalf("jti length = %d, want 20 for current era: %q", len(c1.ID), c1.ID)
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

// ── Service token tests ──

func TestServiceToken_RoundTrip(t *testing.T) {
	tok, err := GenerateServiceToken(time.Now().Add(time.Hour), "devtask-test-secret")
	if err != nil {
		t.Fatalf("GenerateServiceToken error: %v", err)
	}
	claims, err := ParseServiceToken(tok)
	if err != nil {
		t.Fatalf("ParseServiceToken error: %v", err)
	}
	if claims.Subject != "devtask-service" {
		t.Errorf("Subject = %q, want %q", claims.Subject, "devtask-service")
	}
	if claims.Role != "service" {
		t.Errorf("Role = %q, want %q", claims.Role, "service")
	}
}

func TestServiceToken_WrongSecret(t *testing.T) {
	tok, err := GenerateServiceToken(time.Now().Add(time.Hour), "signing-secret")
	if err != nil {
		t.Fatalf("GenerateServiceToken error: %v", err)
	}
	_, err = ParseServiceToken(tok) // ParseServiceToken uses config.Cfg.DevTaskSecret ("devtask-test-secret")
	if err == nil {
		t.Fatal("expected error for token signed with wrong secret, got nil")
	}
}

func TestServiceToken_Expired(t *testing.T) {
	tok, err := GenerateServiceToken(time.Now().Add(-time.Hour), "devtask-test-secret")
	if err != nil {
		t.Fatalf("GenerateServiceToken error: %v", err)
	}
	_, err = ParseServiceToken(tok)
	if err == nil {
		t.Fatal("expected error for expired service token, got nil")
	}
}
