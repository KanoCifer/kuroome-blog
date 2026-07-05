package model

import "time"

type PasskeyCredential struct {
	ID           uint      `gorm:"primaryKey;autoIncrement"`
	CredentialID string    `gorm:"size:255;unique"`
	PublicKey    string    `gorm:"size:500"`
	SignCount    int       `gorm:"default:0"`
	CreatedAt    time.Time `gorm:"index;default:current_timestamp"`
	UserID       uint      `gorm:"index"`
}
