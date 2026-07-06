// Package model — GORM 模型定义。
//
// model.go 对应 Python backend/app/models/__init__.py 的 NamingConvention：
// 中心化管理 PostgreSQL 约束/索引命名规则，与 SQLAlchemy 后端保持一致，
// 避免 Go 端 AutoMigrate 时生成 "uni_xxx" 导致与已有 "uq_xxx" 冲突。
package model

import (
	"fmt"
	"regexp"
	"strings"

	"gorm.io/gorm/schema"
)

// namer 实现 schema.Namer 接口，按 Python SQLAlchemy 的 naming_convention 生成约束名。
//
// 与 Base.metadata.naming_convention 一一对应：
//
//	"ix": "ix_%(column_0_label)s",           → ix_<table>_<column>
//	"uq": "uq_%(table_name)s_%(column_0_name)s", → uq_<table>_<column>
//	"ck": "ck_%(table_name)s_%(constraint_name)s",
//	"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
//	"pk": "pk_%(table_name)s",
type namer struct {
	schema.NamingStrategy
}

// NewNamer 返回按 Python 命名约定配置好的 schema.Namer。
func NewNamer() schema.Namer {
	return &namer{
		NamingStrategy: schema.NamingStrategy{
			NoLowerCase:         false,
			IdentifierMaxLength: 63,
		},
	}
}

// UniqueName 覆盖 GORM 默认的 "uni_" 前缀，改用 Python 的 "uq_"。
//
// 关键：GORM 的 MigrateColumnUnique（migrator.go:608）调用的是 UniqueName 而非
// UniqueConstraintName。当 model tag 写的是 `gorm:"unique"`（非 uniqueIndex）时，
// AutoMigrate 通过此方法决定约束名。默认返回 uni_<table>_<column>，与数据库已有
// 的 uq_<table>_<column>（由 Python Alembic 创建）不一致，导致错误地尝试 DROP。
func (n *namer) UniqueName(table, column string) string {
	return fmt.Sprintf("uq_%s_%s", strings.ToLower(table), strings.ToLower(column))
}

// UniqueConstraintName 同样覆盖，保持一致性（uniqueIndex tag 路径使用）。
func (n *namer) UniqueConstraintName(table, column string) string {
	return n.UniqueName(table, column)
}

// IndexName 覆盖 GORM 默认行为，生成与 Python 一致的 ix_<table>_<column>。
// GORM 默认对多列索引会拼合所有列名；此处保持单列形式，多列索引由调用方显式命名。
func (n *namer) IndexName(table, column string) string {
	return fmt.Sprintf("ix_%s_%s", strings.ToLower(table), strings.ToLower(column))
}

// ForeignKeyName 生成形如 fk_<table>_<column>_<table> 的外键名。
func (n *namer) ForeignKeyName(table, column, referencedTable string) string {
	return fmt.Sprintf("fk_%s_%s_%s",
		strings.ToLower(table),
		strings.ToLower(column),
		strings.ToLower(referencedTable),
	)
}

// CheckerName 生成形如 ck_<table>_<name> 的检查约束名。
func (n *namer) CheckerName(table, name string) string {
	return fmt.Sprintf("ck_%s_%s", strings.ToLower(table), strings.ToLower(name))
}

// PrimaryKeyName 生成形如 pk_<table> 的主键约束名。
func (n *namer) PrimaryKeyName(table, primaryKeyColumn string) string {
	return fmt.Sprintf("pk_%s", strings.ToLower(table))
}

// 预编译正则（备用，当前未使用但保留以应对未来扩展）
var _ = regexp.MustCompile
