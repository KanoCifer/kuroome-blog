// Package crediterrs 定义积分（credit）域业务错误。
// 跨域使用（如 nomu/design 会判 ErrInsufficientBalance）正常 import 此包。
package crediterrs

import (
	"errors"

	"github.com/KanoCifer/kuroome-blog/internal/apierr"
)

var (
	ErrInsufficientBalance = apierr.New(402, "insufficient credits")
	ErrInvalidAmount       = apierr.New(400, "invalid_credit_amount")
	ErrInvalidBizID        = apierr.New(400, "invalid_biz_id")

	// 下列哨兵不对 HTTP 层暴露状态码（未命中 → 500 internal error）。
	ErrPriceNotFound       = errors.New("credit_price_not_found")
	ErrTransactionNotFound = errors.New("credit_transaction_not_found")
)

// ErrIdempotentHit 不是对外错误，而是 repo → service 的内部控制流信号：
// 流水唯一索引撞车（并发重复请求），「本次事务什么都没写，请回滚并查回首次流水」。
// 必须让 Transaction 收到非 nil error 才会回滚，因此它跨 repo/service 边界共享，
// 放在域 errs 包里避免 service import 具体 repository 包。
var ErrIdempotentHit = errors.New("credit_idempotent_hit")
