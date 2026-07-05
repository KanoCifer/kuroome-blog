package model

type Profile struct {
	ID               uint    `gorm:"primaryKey;autoIncrement"`
	Email            *string `gorm:"size:100;unique"`
	Gender           *string `gorm:"size:10"`
	Mobile           *string `gorm:"size:15"`
	UserID           uint    `gorm:"uniqueIndex"`
	Photo            string  `gorm:"size:200;default:default.png"`
	BarkDeviceKey    *string `gorm:"size:100"`
	FeishuWebhookURL *string `gorm:"size:500"`
}

func (Profile) TableName() string { return "profile" }
