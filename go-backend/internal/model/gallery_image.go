package model

import (
	"time"

	"gorm.io/datatypes"
)

type GalleryImage struct {
	ID          uint            `gorm:"primaryKey;autoIncrement"`
	URL         string          `gorm:"size:500;not null"`
	Description string          `gorm:"size:500;default:\"\""`
	FileSize    int             `gorm:"default:0"`
	MimeType    string          `gorm:"size:50;default:image/jpeg"`
	SortOrder   int             `gorm:"index;default:0"`
	UploadedAt  time.Time       `gorm:"default:current_timestamp"`
	CreatedAt   time.Time       `gorm:"index;default:current_timestamp"`
	UpdatedAt   time.Time
	Exif        *datatypes.JSON
	UserID      *uint `gorm:"index"`
}
