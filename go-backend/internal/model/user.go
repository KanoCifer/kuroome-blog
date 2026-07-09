package model

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	GithubID          *int   `gorm:"unique"`
	Name              string `gorm:"size:50;index"`
	Username          string `gorm:"size:50;unique"`
	PasswordHash      string `gorm:"size:200"`
	LastLoginAt       *time.Time
	CurrentLoginAt    *time.Time
	LastLoginIP       *string
	CurrentLoginIP    *string
	LoginCount        int  `gorm:"default:0"`
	Active            bool `gorm:"default:false"`
	Profile           *Profile
	PasskeyCredential *PasskeyCredential `gorm:"foreignKey:UserID"`
}

func (User) TableName() string { return "user" }
