package model

import "time"

type PasskeyCredential struct {
	ID                uint      `gorm:"primaryKey;autoIncrement"`
	CredentialID      string    `gorm:"size:255;unique"`          // base64url 编码的凭证 ID
	PublicKey         string    `gorm:"size:500"`                 // base64url 编码的 COSE 公钥
	SignCount         int       `gorm:"default:0"`
	AttestationFormat string    `gorm:"size:50;default:none"`     // 证明格式（packed / tpm / none 等）
	BackupEligible    bool      `gorm:"default:false"`            // 凭证是否可备份/同步
	BackupState       bool      `gorm:"default:false"`            // 凭证是否已备份
	CreatedAt         time.Time `gorm:"index;default:current_timestamp"`
	UserID            uint      `gorm:"index"`
	User              *User     `gorm:"foreignKey:UserID"`
}

func (PasskeyCredential) TableName() string { return "passkey_credential" }
