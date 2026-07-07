package service

import (
	"errors"
	"testing"

	"app/internal/dto"
)

// 校验分支不依赖 repo，repo 为 nil 也能覆盖（在调用 repo 前返回）。

func TestAdminService_UpdatePost_InvalidID(t *testing.T) {
	svc := &AdminService{} // repo/redis 均为 nil
	err := svc.UpdatePost("not-a-hex", dto.PostUpdate{
		PostIn: dto.PostIn{Title: "t", Body: "b"},
		ID:     "not-a-hex",
	})
	if !errors.Is(err, ErrInvalidPostID) {
		t.Errorf("err = %v, want ErrInvalidPostID", err)
	}
}

func TestAdminService_DeletePost_InvalidID(t *testing.T) {
	svc := &AdminService{}
	err := svc.DeletePost("%%%")
	if !errors.Is(err, ErrInvalidPostID) {
		t.Errorf("err = %v, want ErrInvalidPostID", err)
	}
}
