package dto

import "testing"

func TestToUserResponse(t *testing.T) {
	got := ToUserResponse(1, "alice", true)
	if got.ID != 1 {
		t.Errorf("ID = %d, want 1", got.ID)
	}
	if got.Username != "alice" {
		t.Errorf("Username = %q, want %q", got.Username, "alice")
	}
	if !got.IsAdmin {
		t.Error("IsAdmin = false, want true")
	}
}

func TestToUserResponse_ZeroValues(t *testing.T) {
	got := ToUserResponse(0, "", false)
	if got.ID != 0 || got.Username != "" || got.IsAdmin {
		t.Errorf("zero-value ToUserResponse = %+v, want {0 \"\" false}", got)
	}
}
