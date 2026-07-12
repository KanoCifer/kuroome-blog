package model

import "time"

type VisitorTrack struct {
	ID               uint      `gorm:"primaryKey;autoIncrement"`
	VisitorID        string    `gorm:"size:100;index"`
	PageURL          string    `gorm:"size:200"`
	PagePath         string    `gorm:"size:200"`
	Referrer         *string   `gorm:"size:200"`
	Browser          *string   `gorm:"type:text"`
	ScreenResolution *string   `gorm:"size:100"`
	Language         *string   `gorm:"size:50"`
	IPAddress        string    `gorm:"size:100;index"`
	VisitTime        time.Time `gorm:"index;default:current_timestamp"`
	BrowserName      *string   `gorm:"size:100"`
	BrowserVersion   *string   `gorm:"size:100"`
	OSName           *string   `gorm:"size:100"`
	OSVersion        *string   `gorm:"size:100"`
	CPU              *string   `gorm:"size:50"`
	DeviceType       *string   `gorm:"size:50"`
}

// TableName 显式指定单数表名,对齐 Python SQLAlchemy 的 __tablename__ = "visitor_track"。
// GORM 默认复数化会把 VisitorTrack 映射到 visitor_tracks,与已有表不一致。
func (VisitorTrack) TableName() string {
	return "visitor_track"
}
