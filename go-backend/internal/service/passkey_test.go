package service

import (
	"testing"

	"github.com/go-webauthn/webauthn/webauthn"
)

// ---------- passkeyUser WebAuthn 接口 ----------

func TestPasskeyUser_WebAuthnID(t *testing.T) {
	u := passkeyUser{userID: 42, username: "alice"}
	id := u.WebAuthnID()
	if string(id) != "42" {
		t.Errorf("WebAuthnID = %q, want 42", string(id))
	}
}

func TestPasskeyUser_WebAuthnName(t *testing.T) {
	u := passkeyUser{userID: 1, username: "bob"}
	if name := u.WebAuthnName(); name != "bob" {
		t.Errorf("WebAuthnName = %q, want bob", name)
	}
}

func TestPasskeyUser_WebAuthnDisplayName(t *testing.T) {
	u := passkeyUser{userID: 1, username: "charlie"}
	if name := u.WebAuthnDisplayName(); name != "charlie" {
		t.Errorf("WebAuthnDisplayName = %q, want charlie", name)
	}
}

func TestPasskeyUser_WebAuthnCredentials(t *testing.T) {
	creds := []webauthn.Credential{}
	u := passkeyUser{userID: 1, credentials: creds}
	got := u.WebAuthnCredentials()
	if len(got) != 0 {
		t.Errorf("WebAuthnCredentials len = %d, want 0", len(got))
	}
}

func TestPasskeyUser_WebAuthnCredentials_WithData(t *testing.T) {
	creds := []webauthn.Credential{{ID: []byte("cred-1")}}
	u := passkeyUser{userID: 1, credentials: creds}
	got := u.WebAuthnCredentials()
	if len(got) != 1 {
		t.Errorf("WebAuthnCredentials len = %d, want 1", len(got))
	}
	if string(got[0].ID) != "cred-1" {
		t.Errorf("credential ID = %q, want cred-1", string(got[0].ID))
	}
}

// ---------- extractCredentialID ----------

func TestExtractCredentialID_Valid(t *testing.T) {
	resp := map[string]any{"id": "abc123"}
	id, err := extractCredentialID(resp)
	if err != nil {
		t.Fatalf("extractCredentialID: %v", err)
	}
	if id != "abc123" {
		t.Errorf("id = %q, want abc123", id)
	}
}

func TestExtractCredentialID_Missing(t *testing.T) {
	resp := map[string]any{}
	_, err := extractCredentialID(resp)
	if err == nil {
		t.Fatal("expected error for missing id, got nil")
	}
}

func TestExtractCredentialID_Empty(t *testing.T) {
	resp := map[string]any{"id": ""}
	_, err := extractCredentialID(resp)
	if err == nil {
		t.Fatal("expected error for empty id, got nil")
	}
}

func TestExtractCredentialID_NonString(t *testing.T) {
	resp := map[string]any{"id": 12345}
	_, err := extractCredentialID(resp)
	if err == nil {
		t.Fatal("expected error for non-string id, got nil")
	}
}
