package model

import (
	"time"

	"gorm.io/datatypes"
)

// Event 承载关键服务事件（启动 / 部署 / 启动失败等业务事件）。
//
// 区别于 Log 表：log 是机器噪音/WARNING+ 持久化；event 是给人看的业务事件。
// 字段与索引对齐 Python backend/app/models/event.py 的 SQLAlchemy 定义，
// 确保 GORM AutoMigrate 生成的约束/索引名与 Alembic 已有的命名一致。
type Event struct {
	ID        uint           `gorm:"primaryKey;index"`
	Timestamp time.Time      `gorm:"index:ix_event_type_timestamp,priority:2;default:current_timestamp"`
	Type      string         `gorm:"size:50;index:ix_event_type_timestamp,priority:1"`
	Source    string         `gorm:"size:100"`
	Title     string         `gorm:"size:255"`
	Message   string         `gorm:"type:text"`
	Extra     datatypes.JSON `gorm:"type:jsonb"`
}

// TableName 对齐 Python SQLAlchemy 的 __tablename__ = "event"。
func (Event) TableName() string {
	return "event"
}
