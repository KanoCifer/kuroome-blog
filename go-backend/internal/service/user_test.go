package service

import (
	"testing"

	"golang.org/x/crypto/bcrypt"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

func TestCheckPassword_Correct(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash error: %v", err)
	}
	svc := &userService{}
	u := &model.User{PasswordHash: string(hash)}
	if !svc.CheckPassword(u, "secret123") {
		t.Error("CheckPassword should return true for correct password")
	}
}

func TestCheckPassword_Wrong(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash error: %v", err)
	}
	svc := &userService{}
	u := &model.User{PasswordHash: string(hash)}
	if svc.CheckPassword(u, "wrong") {
		t.Error("CheckPassword should return false for wrong password")
	}
}

func TestCheckPassword_EmptyHash(t *testing.T) {
	svc := &userService{}
	u := &model.User{PasswordHash: ""}
	if svc.CheckPassword(u, "anything") {
		t.Error("CheckPassword should return false when hash is empty")
	}
}

func TestBoolToInt_Helper(t *testing.T) {
	// 复用 service.boolToInt 目前在 admin_test.go 未覆盖，此处顺手测。
	// 注意 boolToInt 为包内小写，需在 package service 内测试。
	tests := []struct {
		in   bool
		want int
	}{
		{true, 1},
		{false, 0},
	}
	for _, tt := range tests {
		if got := boolToInt(tt.in); got != tt.want {
			t.Errorf("boolToInt(%v) = %d, want %d", tt.in, got, tt.want)
		}
	}
}
