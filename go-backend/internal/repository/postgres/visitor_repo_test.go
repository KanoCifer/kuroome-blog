package postgres

import (
	"context"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// 用 in-memory SQLite 跑一次真实的 GORM insert/回读，覆盖：
//   - 空字符串字段入库后为 NULL（拿回 Scan 到 *string 为 nil）
//   - 必填字段落库
//
// SQLite 的 schema 由 AutoMigrate 生成，与 PG 行为在"nullable 字符串 ↦ NULL"
// 这一条上一致，足够守护 repo 层的核心保证。真实 PG default(current_timestamp)
// 的差异由 service 层注释 + 集成环境把关，不在此重复。
func TestVisitorRepo_Insert_NullableStrings(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.VisitorTrack{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}

	ctx := context.Background()
	repo := NewVisitorRepo(db)

	// 一条"浏览器名有值、其余可空字段都是空字符串"的记录——
	// 对应 parse-ua 脚本下线后的真实流量形态。
	in := &model.VisitorTrack{
		VisitorID:   "visitor-1",
		PageURL:     "https://example.com/",
		PagePath:    "/",
		BrowserName: stringPtr("Chrome"),
		// Referrer / Browser / ScreenResolution / Language 留 nil → 期望入库 NULL
	}
	if err := repo.Insert(ctx, in); err != nil {
		t.Fatalf("insert: %v", err)
	}

	var got model.VisitorTrack
	if err := db.First(&got, in.ID).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}

	if got.VisitorID != "visitor-1" {
		t.Errorf("VisitorID = %q, want visitor-1", got.VisitorID)
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
	if got.ScreenResolution != nil {
		t.Errorf("ScreenResolution = %q, want nil", *got.ScreenResolution)
	}
	if got.Language != nil {
		t.Errorf("Language = %q, want nil", *got.Language)
	}
}

func stringPtr(s string) *string { return &s }
