package model

import "time"

type RssInfo struct {
	ID              uint    `gorm:"primaryKey;autoIncrement"`
	RssURL          string  `gorm:"size:200;index"`
	FeedTitle       *string `gorm:"size:255"`
	FeedLink        *string `gorm:"size:500"`
	FeedDescription *string `gorm:"type:text"`
	FeedPublishedAt *time.Time
	EntryCount      int `gorm:"default:0"`
	LastFetchedAt   *time.Time
	CreatedAt       time.Time `gorm:"index;default:current_timestamp"`
	UpdatedAt       time.Time
	UserID          uint `gorm:"index"`
}
