package model

import (
	"time"

	"gorm.io/datatypes"
)

type Log struct {
	ID        uint      `gorm:"primaryKey;index"`
	Timestamp time.Time `gorm:"index;default:current_timestamp"`
	Level     string    `gorm:"size:50;index"`
	Message   string    `gorm:"type:text"`
	Extra     *datatypes.JSON
}
