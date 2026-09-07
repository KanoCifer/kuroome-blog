// Package dto —— 积分（credit）接口的请求/响应视图。
//
// 存储层全部厘制整型（0.01 分），"分"换算只发生在这一层：
// 金额字段一律 float64"分"，对齐 Subscription.Price 的展示惯例。
package dto

import "time"

// CreditBalanceResponse GET /v3/credits/balance 的响应。无钱包行时返回 0（非 404）。
type CreditBalanceResponse struct {
	Balance    float64 `json:"balance"`     // 余额（分）
	TotalSpent float64 `json:"total_spent"` // 历史累计净消耗（分），退款冲减
}

// CreditTransactionView 单条流水的对外视图（厘 → 分）。
// Meta 解析为对象输出，避免 model.CreditTransaction 直出的 base64 JSON。
type CreditTransactionView struct {
	ID           uint           `json:"id"`
	Source       string         `json:"source"`
	BizID        string         `json:"biz_id"`
	Type         string         `json:"type"`          // grant / consume / refund
	Amount       float64        `json:"amount"`        // 分，正入负出
	BalanceAfter float64        `json:"balance_after"` // 分
	Meta         map[string]any `json:"meta"`
	CreatedAt    time.Time      `json:"created_at"`
}

// CreditTransactionsResponse GET /v3/credits/transactions 的响应，分页信封对齐 EventsResponse。
type CreditTransactionsResponse struct {
	Items      []CreditTransactionView `json:"items"`
	Pagination Pagination              `json:"pagination"`
}

// GrantCreditRequest POST /v3/admin/credits/grant 的请求体。
type GrantCreditRequest struct {
	UserID uint `json:"user_id" binding:"required"`
	// Amount 发放额度，单位"分"，支持两位小数；服务端 ×100 转厘。
	Amount float64 `json:"amount" binding:"required"`
	// BizID 可选幂等键；缺省服务端生成 UUID。重复 (admin_grant, biz_id) 不双发。
	BizID string `json:"biz_id"`
}
