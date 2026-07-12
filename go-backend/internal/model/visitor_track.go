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
