package model

import (
	"encoding/json"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// 积分系统三表（spec task-543）：钱包 / 流水 / 价格。
//
// 数值全部采用厘制整型（BIGINT，单位 0.01 分），"分"换算只发生在 API 边界。
// schema 由 Go 端 GORM AutoMigrate 统一管理，Python 侧只做读写
// （先例：llm_usage.go）。复合唯一索引显式命名 uq_ 前缀，对齐 model.go Namer。

// CreditWallet 用户积分钱包，一人一行；懒创建（EnsureCreditWallet）。
type CreditWallet struct {
	ID         uint  `gorm:"primaryKey;autoIncrement"`
	UserID     uint  `gorm:"uniqueIndex"` // → uq_credit_wallet_user_id
	Balance    int64 // 厘
	TotalSpent int64 // 历史累计净消耗（厘），退款冲减
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (CreditWallet) TableName() string { return "credit_wallet" }

// CreditTransaction 积分流水。Type: grant / consume / refund。
// Amount 正=入账、负=出账；BalanceAfter 为记账后余额快照。
// (Source, UserID, BizID) 联合唯一 = 幂等键：重复请求命中唯一约束即已计费，不双扣；
// user_id 入键使跨用户同键互不命中（各扣各的），退款/结算按 (user_id, source, biz_id)
// 精确命中本人流水。
type CreditTransaction struct {
	ID           uint           `gorm:"primaryKey;autoIncrement;index:ix_credit_transaction_user_id_created_at_id,priority:3"`
	UserID       uint           `gorm:"uniqueIndex:uq_credit_transaction_source_user_biz,priority:2;index:ix_credit_transaction_user_id_created_at_id,priority:1"`
	Source       string         `gorm:"size:50;uniqueIndex:uq_credit_transaction_source_user_biz,priority:1"` // translate / nomu_prompt_optimize / design_generate / admin_grant…
	BizID        string         `gorm:"size:64;uniqueIndex:uq_credit_transaction_source_user_biz,priority:3"` // 客户端 Idempotency-Key 或服务端 UUID 兜底
	Type         string         `gorm:"size:20"`                                                              // grant / consume / refund
	Amount       int64          // 厘，正入负出
	BalanceAfter int64          // 厘
	Meta         datatypes.JSON `gorm:"type:jsonb"` // variant、张数等上下文
	CreatedAt    time.Time      `gorm:"index:ix_credit_transaction_user_id_created_at_id,priority:2;default:current_timestamp"`
}

func (CreditTransaction) TableName() string { return "credit_transaction" }

// PreconsumedQty 读 consume 流水 meta.qty（预扣张数）；缺失/非法按 1。
func (t CreditTransaction) PreconsumedQty() int {
	var m struct {
		Qty int `json:"qty"`
	}
	if len(t.Meta) > 0 && json.Unmarshal(t.Meta, &m) == nil && m.Qty > 0 {
		return m.Qty
	}
	return 1
}

// CreditPrice 按次定额价格表。(Source, Variant) 联合唯一；
// 非档位服务 Variant 为空串。调价第一期直改表数据，不做 API。
type CreditPrice struct {
	ID        uint   `gorm:"primaryKey;autoIncrement"`
	Source    string `gorm:"size:50;uniqueIndex:uq_credit_price_source_variant"`
	Variant   string `gorm:"size:20;uniqueIndex:uq_credit_price_source_variant;default:''"`
	UnitPrice int64  `gorm:""` // 厘/次（生图为厘/张）
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (CreditPrice) TableName() string { return "credit_price" }

// creditPriceSeeds 初始定价（厘制 = 展示分 ×100），与 spec 定价表一致。
var creditPriceSeeds = []CreditPrice{
	{Source: "translate", Variant: "", UnitPrice: 10},
	{Source: "nomu_prompt_optimize", Variant: "", UnitPrice: 20},
	{Source: "design_generate", Variant: "lite", UnitPrice: 3000},
	{Source: "design_generate", Variant: "pro", UnitPrice: 4000},
}

// SeedCreditPrices 幂等 seed：冲突（source,variant 已存在）即跳过，不覆盖人工调价。
func SeedCreditPrices(db *gorm.DB) error {
	return db.Clauses(clause.OnConflict{DoNothing: true}).
		CreateInBatches(&creditPriceSeeds, len(creditPriceSeeds)).Error
}

// EnsureCreditWallet 懒创建钱包行（balance=0），并发下靠 user_id 唯一索引兜底，
// 只产生一行。后续扣费在调用方事务内以条件 UPDATE 原子完成。
func EnsureCreditWallet(db *gorm.DB, userID uint) error {
	return db.Clauses(clause.OnConflict{DoNothing: true}).
		Create(&CreditWallet{UserID: userID}).Error
}
