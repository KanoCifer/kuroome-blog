package model

import (
	"time"

	"gorm.io/datatypes"
)

// NomuConfigScope 区分配置行类型：global = 全局设置，store = 店铺配置。
type NomuConfigScope string

const (
	NomuConfigScopeGlobal NomuConfigScope = "global"
	NomuConfigScopeStore  NomuConfigScope = "store"
)

// NomuConfig —— Nomu 扩展配置的云端同步行。
//
// 一行对应 Dexie configs 表的一条记录（global 行 id='__global__'，
// 店铺行 id 为本地生成的稳定 ID）。config_data 存整行 JSON，跟随本地 schema
// 演进而无需每次 migration。
//
// 同步语义：version 乐观并发（每次本地改动 +1，写入必须带 expectedVersion），
// deleted 软删传播删除意图，updated_at 用于 LWW 冲突与增量拉取。
type NomuConfig struct {
	ID          int64           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint            `gorm:"not null;index;uniqueIndex:uq_nomu_config_user_scope_id,priority:1" json:"userId"`
	ConfigScope NomuConfigScope `gorm:"not null;size:20;uniqueIndex:uq_nomu_config_user_scope_id,priority:2" json:"configScope"`
	ConfigID    string          `gorm:"not null;size:100;uniqueIndex:uq_nomu_config_user_scope_id,priority:3" json:"configId"`
	ConfigData  datatypes.JSON  `gorm:"type:jsonb;not null" json:"configData"`
	Deleted     bool            `gorm:"not null;default:false;index" json:"deleted"`
	Version     int64           `gorm:"not null;default:1" json:"version"`
	DeviceID    *string         `gorm:"size:100" json:"deviceId,omitempty"`
	CreatedAt   time.Time       `gorm:"not null;default:now();index" json:"createdAt"`
	UpdatedAt   time.Time       `gorm:"not null;default:now();index" json:"updatedAt"`
}

func (NomuConfig) TableName() string { return "nomu_config" }
