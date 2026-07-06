package model

import (
	"testing"

	"gorm.io/gorm/schema"
)

func TestNamer_UniqueName(t *testing.T) {
	n := NewNamer()
	got := n.UniqueName("User", "Username")
	want := "uq_user_username"
	if got != want {
		t.Errorf("UniqueName = %q, want %q", got, want)
	}
}

func TestNamer_IndexName(t *testing.T) {
	n := NewNamer()
	got := n.IndexName("User", "Name")
	want := "ix_user_name"
	if got != want {
		t.Errorf("IndexName = %q, want %q", got, want)
	}
}

func TestNamer_Concrete(t *testing.T) {
	// 这些方法仅存在于 *namer 具体类型，验证转换后可用。
	var _ interface {
		UniqueConstraintName(table, column string) string
		ForeignKeyName(table, column, referencedTable string) string
		CheckerName(table, name string) string
		PrimaryKeyName(table, primaryKeyColumn string) string
	} = NewNamer().(*namer)

	n := NewNamer().(*namer)
	if got := n.UniqueConstraintName("User", "Email"); got != "uq_user_email" {
		t.Errorf("UniqueConstraintName = %q, want uq_user_email", got)
	}
	if got := n.ForeignKeyName("Profile", "UserID", "User"); got != "fk_profile_userid_user" {
		t.Errorf("ForeignKeyName = %q, want fk_profile_userid_user", got)
	}
	if got := n.CheckerName("User", "IsActive"); got != "ck_user_isactive" {
		t.Errorf("CheckerName = %q, want ck_user_isactive", got)
	}
	if got := n.PrimaryKeyName("User", "ID"); got != "pk_user" {
		t.Errorf("PrimaryKeyName = %q, want pk_user", got)
	}
	// 编译期断言：*namer 实现了 schema.Namer 接口
	var _ schema.Namer = n
}
