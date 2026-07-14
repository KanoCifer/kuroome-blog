package service

import (
	"context"
	"errors"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

// 校验分支不依赖 repo，repo 为 nil 也能覆盖（在调用 repo 前返回）。

func TestAdminService_UpdatePost_InvalidID(t *testing.T) {
	svc := &adminService{} // repo/redis 均为 nil
	err := svc.UpdatePost(context.Background(), "not-a-hex", dto.PostUpdate{
		PostIn: dto.PostIn{Title: "t", Body: "b"},
		ID:     "not-a-hex",
	})
	if !errors.Is(err, errs.ErrInvalidPostID) {
		t.Errorf("err = %v, want ErrInvalidPostID", err)
	}
}

func TestAdminService_DeletePost_InvalidID(t *testing.T) {
	svc := &adminService{}
	err := svc.DeletePost(context.Background(), "%%%")
	if !errors.Is(err, errs.ErrInvalidPostID) {
		t.Errorf("err = %v, want ErrInvalidPostID", err)
	}
}

// 校验 TrackVisitor 走 visitor repo 直写，Redis 侧不再被调用。
// repo 层为 nil 的 AdminService 调用这里会 panic；故构造时注入真实
// in-memory SQLite，模拟新引入的 VisitorRepo 注入链路。
func TestAdminService_TrackVisitor_WritesToPostgres(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.VisitorTrack{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}

	svc := NewAdminService(nil, postgres.NewVisitorRepo(db), nil)
	data := dto.VisitorData{
		VisitorID:   "v-1",
		PageURL:     "https://example.com/posts/1",
		PagePath:    "/posts/1",
		BrowserName: "Chrome",
		// Referrer / Browser / ScreenResolution / Language 留空 → 期望入库 NULL
	}
	if err := svc.TrackVisitor(context.Background(), data); err != nil {
		t.Fatalf("TrackVisitor: %v", err)
	}

	var got model.VisitorTrack
	if err := db.First(&got).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}
	if got.VisitorID != "v-1" {
		t.Errorf("VisitorID = %q, want v-1", got.VisitorID)
	}
	if got.BrowserName == nil || *got.BrowserName != "Chrome" {
		t.Errorf("BrowserName = %v, want Chrome", got.BrowserName)
	}
	if got.Referrer != nil {
		t.Errorf("Referrer = %q, want nil", *got.Referrer)
	}
	if got.Browser != nil {
		t.Errorf("Browser = %q, want nil", *got.Browser)
	}
}
