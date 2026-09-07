package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// CreditService 积分核心服务（spec task-543 / task-545）：预扣、退款、发放、余额、流水。
//
// 与其它 service 不同，本服务直接持有 *gorm.DB——计费的正确性依赖"条件 UPDATE +
// 流水写入在同一事务内"这一原语，透传 repository 接口只会增加层次、减少保证。
//
// 数值全部厘制整型（单位 0.01 分）；Amount 正=入账、负=出账。
// (UserID, Source, BizID) 联合唯一索引即幂等键：user 入键使跨用户同键互不命中，
// Refund/Settle 按 (user_id, source, biz_id) 精确命中本人流水。
//
// ponytail: 崩溃窗口丢退款（预扣成功、业务失败前进程挂掉，consume 流水无终态），
// 第一期接受；升级路径=对账 job（扫 consume 无终态超时退款）。
type CreditService struct {
	db *gorm.DB
}

// Creditser 定义 credit handler（task-546/547/549）依赖的能力集合。
type Creditser interface {
	// Preconsume 返回 created=true 表示本次调用真正新扣费；幂等命中返回 (首次流水, false)。
	// 调用方只对"本次新扣"的流水挂失败退款——重放请求失败时不得退掉首笔已成功交付的扣费。
	Preconsume(ctx context.Context, userID uint, source, variant string, qty int, bizID string, meta map[string]any) (*model.CreditTransaction, bool, error)
	Refund(ctx context.Context, userID uint, source, bizID string, amount int64, meta map[string]any) (*model.CreditTransaction, error)
	Settle(ctx context.Context, userID uint, source, bizID string, actualQty int) (*model.CreditTransaction, error)
	Grant(ctx context.Context, userID uint, amountLi int64, bizID string, meta map[string]any) (*model.CreditTransaction, error)
	// GrantRegisterBonus 注册赠送渠道（source=register_bonus），bizID 由 userID
	// 推导，与 admin_grant 各自走 (user_id, source, biz_id) 唯一键、互不干扰。
	GrantRegisterBonus(ctx context.Context, userID uint, meta map[string]any) (*model.CreditTransaction, error)
	GetBalance(ctx context.Context, userID uint) (int64, int64, error)
	ListTransactions(ctx context.Context, userID uint, page, pageSize int) ([]model.CreditTransaction, int64, error)
}

var _ Creditser = (*CreditService)(nil)

func NewCreditService(db *gorm.DB) *CreditService {
	return &CreditService{db: db}
}

// 哨兵错误。
var (
	// ErrInsufficientBalance 余额不足；调用方保证未产生任何扣费流水。
	ErrInsufficientBalance = errors.New("insufficient_balance")
	// ErrPriceNotFound (source, variant) 无定价。
	ErrPriceNotFound = errors.New("credit_price_not_found")
	// ErrTransactionNotFound 找不到对应的 consume 流水（退款）。
	ErrTransactionNotFound = errors.New("credit_transaction_not_found")
	// ErrInvalidAmount 数量/金额非正。
	ErrInvalidAmount = errors.New("invalid_credit_amount")
	// ErrInvalidBizID 客户端幂等键非法：超长或撞内部保留前缀（见 validateBizID）。
	ErrInvalidBizID = errors.New("invalid_biz_id")
)

// creditRefundPrefix 退款幂等键前缀：refund 流水的 biz_id = "refund:" + 原 consume biz_id，
// 同一笔 consume 靠 (user_id, source, biz_id) 唯一索引天然只退一次。
const creditRefundPrefix = "refund:"

// creditSettlePrefix 补扣幂等键前缀（Settle 差额）：与 refund: 同为内部保留键。
const creditSettlePrefix = "settle:"

const creditGrantSource = "admin_grant"

// creditRegisterBonusSource 注册赠送渠道（GrantRegisterBonus 专用）。
const creditRegisterBonusSource = "register_bonus"

// creditRegisterBonusPrefix 注册赠送 bizID 前缀："register:" + userID 推导
// 确定性键，命中 (user_id, source, biz_id) 唯一索引天然幂等。
const creditRegisterBonusPrefix = "register:"

// MaxBizIDLen 客户端幂等键长度上限。推导：biz_id 列宽 64，Settle 补扣与 Refund
// 冲正都以确定性键 "<前缀>+原键" 复用同一列（"refund:"/"settle:" 前缀同为 7 字符），
// 客户端键必须 ≤ 64-7=57 才能保证派生键不溢出列宽。
const MaxBizIDLen = 64 - len(creditRefundPrefix)

// validateBizID 客户端幂等键入口校验（Preconsume/Grant）：
//   - 超长 → 派生 refund:/settle: 键会溢出 64 列宽；
//   - 以 refund:/settle: 开头 → 内部终态键保留前缀，客户端伪造可抢占真实终态流水
//     （预埋假 refund 行会让真退款幂等空转，假 settle 行同理）。
func validateBizID(bizID string) error {
	if len(bizID) > MaxBizIDLen ||
		strings.HasPrefix(bizID, creditRefundPrefix) ||
		strings.HasPrefix(bizID, creditSettlePrefix) {
		return fmt.Errorf("%w: biz_id must be at most %d chars and must not start with %q or %q",
			ErrInvalidBizID, MaxBizIDLen, creditRefundPrefix, creditSettlePrefix)
	}
	return nil
}

// Preconsume 按次预扣（计费核心路径）。
//
// 入口先校验 bizID（非法 → ErrInvalidBizID，零扣费），随后快路径查幂等，再查价，
// 最后事务扣减。钱包懒创建按需发生：条件 UPDATE 未命中（无钱包=余额 0）时补一行
// 空钱包重试一次，仍 0 行才 ErrInsufficientBalance。
//
// 单价 × qty 计算成本后，钱包行上"balance >= cost 才扣减"的单条件 UPDATE 原子防超卖
// （无先查后改、无应用层锁），同事务写 consume 流水（Amount=-cost）。bizID 为空由服
// 务端生成 UUID。
//
// 幂等：(user_id, source, bizID) 命中唯一索引（或调用前已存在）→ 查回首次流水返回
// (existing, false, nil)，不双扣。返回值 created=true 表示本次真正新扣；调用方只对
// 本次新扣的流水挂失败退款，重放（created=false）请求失败时不得退掉首笔扣费。
//
// 错误：bizID 非法 ErrInvalidBizID；无定价 ErrPriceNotFound；余额不足
// ErrInsufficientBalance（事务回滚，零流水、零扣费）；参数非法 ErrInvalidAmount。
func (s *CreditService) Preconsume(
	ctx context.Context,
	userID uint,
	source, variant string,
	qty int,
	bizID string,
	meta map[string]any,
) (*model.CreditTransaction, bool, error) {
	if qty <= 0 {
		return nil, false, fmt.Errorf("%w: qty must be positive", ErrInvalidAmount)
	}
	if bizID == "" {
		bizID = uuid.NewString()
	} else if err := validateBizID(bizID); err != nil {
		return nil, false, err
	}

	// 快路径：重复请求不碰钱包。漏网的并发重复由流水唯一索引兜底（见下 OnConflict）。
	if existing, err := s.findTx(ctx, userID, source, bizID); err != nil {
		return nil, false, err
	} else if existing != nil {
		return existing, false, nil
	}

	var price model.CreditPrice
	if err := s.db.WithContext(ctx).
		Where("source = ? AND variant = ?", source, variant).
		First(&price).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, false, fmt.Errorf("%w: %s/%s", ErrPriceNotFound, source, variant)
		}
		return nil, false, err
	}
	cost := price.UnitPrice * int64(qty)

	var tx *model.CreditTransaction
	err := s.db.WithContext(ctx).Transaction(func(txdb *gorm.DB) error {
		// 防超卖核心：balance 守卫写进 UPDATE 的 WHERE，判断与扣减是同一条语句，
		// 无先查后改、无应用层锁。0 行 = 无钱包或余额不足。
		debitOnce := func() (int64, error) {
			res := txdb.Model(&model.CreditWallet{}).
				Where("user_id = ? AND balance >= ?", userID, cost).
				Updates(map[string]any{
					"balance":     gorm.Expr("balance - ?", cost),
					"total_spent": gorm.Expr("total_spent + ?", cost),
				})
			return res.RowsAffected, res.Error
		}
		rows, err := debitOnce()
		if err != nil {
			return err
		}
		if rows == 0 {
			// 懒创建按需：只有热路径未命中（多半无钱包）才补空钱包重试一次。
			if err := model.EnsureCreditWallet(txdb, userID); err != nil {
				return err
			}
			if rows, err = debitOnce(); err != nil {
				return err
			}
			if rows == 0 {
				return ErrInsufficientBalance // 无钱包=余额 0；事务回滚，空钱包不落库
			}
		}
		after, err := creditBalanceAfter(txdb, userID)
		if err != nil {
			return err
		}

		tx = &model.CreditTransaction{
			UserID:       userID,
			Source:       source,
			BizID:        bizID,
			Type:         "consume",
			Amount:       -cost,
			BalanceAfter: after,
			Meta:         creditMeta(meta, map[string]any{"variant": variant, "qty": qty}),
		}
		// 声明式幂等：ON CONFLICT DO NOTHING + RowsAffected==0 → 并发重复请求已有一份
		// 流水（sqlite/PG 双驱动一致），回滚本次扣减，交给外层查回。
		res := txdb.Clauses(clause.OnConflict{DoNothing: true}).Create(tx)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errIdempotentHit
		}
		return nil
	})
	if errors.Is(err, errIdempotentHit) {
		existing, herr := s.resolveIdempotentHit(ctx, userID, source, bizID)
		return existing, false, herr
	}
	if err != nil {
		if !errors.Is(err, ErrInsufficientBalance) {
			slog.ErrorContext(ctx, "credit preconsume failed",
				"user_id", userID, "source", source, "biz_id", bizID, "error", err)
		}
		return nil, false, err
	}

	slog.InfoContext(ctx, "credit preconsumed",
		"user_id", userID, "source", source, "biz_id", bizID,
		"cost", cost, "balance_after", tx.BalanceAfter)
	return tx, true, nil
}

// Refund 退还一笔 consume（同事务反向回补 balance、冲减 total_spent）。
//
// 原 consume 按 (user_id, source, biz_id) 定位：只能退本人流水，跨用户同键
// （如两个用户都用 "k1"）互不误伤。
// amount 省略（<=0）→ 全额退还该笔 consume；支持部分退款。
// amount 不得超过原 consume 成本。refund 流水的 biz_id 为确定性键
// "refund:"+原 biz_id，同一笔 consume 重复退款命中唯一索引 → 幂等返回首次退款流水。
func (s *CreditService) Refund(
	ctx context.Context,
	userID uint,
	source, bizID string,
	amount int64,
	meta map[string]any,
) (*model.CreditTransaction, error) {
	consume, err := s.findTx(ctx, userID, source, bizID)
	if err != nil {
		return nil, err
	}
	if consume == nil || consume.Type != "consume" {
		return nil, fmt.Errorf("%w: consume %s/%s", ErrTransactionNotFound, source, bizID)
	}
	cost := -consume.Amount
	if amount <= 0 {
		amount = cost
	}
	if amount > cost {
		return nil, fmt.Errorf("%w: refund %d exceeds consume %d", ErrInvalidAmount, amount, cost)
	}

	refundBizID := creditRefundPrefix + bizID
	if existing, err := s.findTx(ctx, userID, source, refundBizID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}

	var tx *model.CreditTransaction
	err = s.db.WithContext(ctx).Transaction(func(txdb *gorm.DB) error {
		// 反向单语句原子回补；total_spent 守卫防累计净消耗被退成负数。
		res := txdb.Model(&model.CreditWallet{}).
			Where("user_id = ? AND total_spent >= ?", userID, amount).
			Updates(map[string]any{
				"balance":     gorm.Expr("balance + ?", amount),
				"total_spent": gorm.Expr("total_spent - ?", amount),
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return fmt.Errorf("credit refund: wallet missing or total_spent < refund amount %d", amount)
		}
		after, err := creditBalanceAfter(txdb, userID)
		if err != nil {
			return err
		}

		tx = &model.CreditTransaction{
			UserID:       userID,
			Source:       source,
			BizID:        refundBizID,
			Type:         "refund",
			Amount:       amount,
			BalanceAfter: after,
			Meta:         creditMeta(meta, map[string]any{"refund_of": bizID}),
		}
		cres := txdb.Clauses(clause.OnConflict{DoNothing: true}).Create(tx)
		if cres.Error != nil {
			return cres.Error
		}
		if cres.RowsAffected == 0 {
			return errIdempotentHit
		}
		return nil
	})
	if errors.Is(err, errIdempotentHit) {
		return s.resolveIdempotentHit(ctx, userID, source, refundBizID)
	}
	if err != nil {
		return nil, err
	}

	slog.InfoContext(ctx, "credit refunded",
		"user_id", userID, "source", source, "biz_id", bizID,
		"amount", amount, "balance_after", tx.BalanceAfter)
	return tx, nil
}

// Settle 按实际产出张数校正一笔预扣（生图场景：方舟单次调用可返回 data[] 多张，
// 张数只有响应回来才知道）。
//
// 原 consume 流水 meta.qty 为预扣张数；unit = -Amount/qty 从流水反推（价格表可能
// 已调价，以账为准）。actual 相等 → no-op 返回原流水；少了 → 差额 Refund（复用
// "refund:"+bizID 确定性键）；多了 → 补扣差额，写一笔新 consume 流水
// （biz_id = "settle:"+原键，幂等）。
//
// 补扣不设余额守卫、允许扣成负数：图已生成、上游成本已实际发生，不补扣即坏账；
// 负余额在调用方下次 Preconsume 时被余额守卫挡出 402，先欠后还。
func (s *CreditService) Settle(
	ctx context.Context,
	userID uint,
	source, bizID string,
	actualQty int,
) (*model.CreditTransaction, error) {
	consume, err := s.findTx(ctx, userID, source, bizID)
	if err != nil {
		return nil, err
	}
	if consume == nil || consume.Type != "consume" {
		return nil, fmt.Errorf("%w: consume %s/%s", ErrTransactionNotFound, source, bizID)
	}
	preQty := consume.PreconsumedQty() // meta.qty，缺省 1
	if actualQty <= 0 {
		actualQty = 1 // 防御：调用方解析出 0 张也不该退掉整笔预扣闸门费
	}
	if actualQty == preQty {
		return consume, nil
	}
	unit := -consume.Amount / int64(preQty)

	if actualQty < preQty {
		return s.Refund(ctx, userID, source, bizID, unit*int64(preQty-actualQty),
			map[string]any{"settle": true})
	}

	// 补扣差额
	delta := unit * int64(actualQty-preQty)
	settleBizID := creditSettlePrefix + bizID
	if existing, err := s.findTx(ctx, userID, source, settleBizID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}

	var tx *model.CreditTransaction
	err = s.db.WithContext(ctx).Transaction(func(txdb *gorm.DB) error {
		// 无 balance 守卫：允许扣负（见函数注释）。
		res := txdb.Model(&model.CreditWallet{}).
			Where("user_id = ?", userID).
			Updates(map[string]any{
				"balance":     gorm.Expr("balance - ?", delta),
				"total_spent": gorm.Expr("total_spent + ?", delta),
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return fmt.Errorf("credit settle: wallet not found for user %d", userID)
		}
		after, err := creditBalanceAfter(txdb, userID)
		if err != nil {
			return err
		}
		tx = &model.CreditTransaction{
			UserID:       userID,
			Source:       source,
			BizID:        settleBizID,
			Type:         "consume",
			Amount:       -delta,
			BalanceAfter: after,
			Meta:         creditMeta(nil, map[string]any{"settle_of": bizID, "qty": actualQty - preQty}),
		}
		cres := txdb.Clauses(clause.OnConflict{DoNothing: true}).Create(tx)
		if cres.Error != nil {
			return cres.Error
		}
		if cres.RowsAffected == 0 {
			return errIdempotentHit
		}
		return nil
	})
	if errors.Is(err, errIdempotentHit) {
		return s.resolveIdempotentHit(ctx, userID, source, settleBizID)
	}
	if err != nil {
		return nil, err
	}
	slog.InfoContext(ctx, "credit settled",
		"user_id", userID, "source", source, "biz_id", bizID,
		"pre_qty", preQty, "actual_qty", actualQty, "delta", delta, "balance_after", tx.BalanceAfter)
	return tx, nil
}

// Grant 管理员发放积分（source=admin_grant，正流水 + 余额增加同事务）。
// amountLi 单位厘。bizID 为空生成 UUID；非法（超长/保留前缀，同 Preconsume）→
// ErrInvalidBizID。重复 (user_id, admin_grant, bizID) 幂等返回首次流水，不双发。
func (s *CreditService) Grant(
	ctx context.Context,
	userID uint,
	amountLi int64,
	bizID string,
	meta map[string]any,
) (*model.CreditTransaction, error) {
	if amountLi <= 0 {
		return nil, fmt.Errorf("%w: grant amount must be positive", ErrInvalidAmount)
	}
	if bizID == "" {
		bizID = uuid.NewString()
	} else if err := validateBizID(bizID); err != nil {
		return nil, err
	}

	return s.runGrant(ctx, creditGrantSource, userID, amountLi, bizID, meta)
}

// creditRegisterBonusLi 注册赠送积分（厘）= 100 分 = 10000 厘。
const creditRegisterBonusLi int64 = 100 * 100

// GrantRegisterBonus 注册赠送渠道（100 分；source=register_bonus）。
// bizID 由 userID 推导（"register:<id>"），同一用户重复调用命中唯一索引 → 幂等。
// 失败语义同 Grant：钱包懒创建 + 余额/流水同事务。
func (s *CreditService) GrantRegisterBonus(
	ctx context.Context,
	userID uint,
	meta map[string]any,
) (*model.CreditTransaction, error) {
	bizID := creditRegisterBonusPrefix + strconv.FormatUint(uint64(userID), 10)
	return s.runGrant(ctx, creditRegisterBonusSource, userID, creditRegisterBonusLi, bizID, meta)
}

// runGrant 两条入账渠道（admin_grant / register_bonus / 未来）的共享原子原语：
// 幂等查 → 事务内 lazy-create wallet → 余额增加 + 流水写入同事务。
// source/bizID/amount 由调用方定，函数内不二次校验（Grant 已 validateBizID，
// GrantRegisterBonus 走确定性键；新渠道复用时各自在公开方法校验）。
func (s *CreditService) runGrant(
	ctx context.Context,
	source string,
	userID uint,
	amountLi int64,
	bizID string,
	meta map[string]any,
) (*model.CreditTransaction, error) {
	if existing, err := s.findTx(ctx, userID, source, bizID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}

	var tx *model.CreditTransaction
	err := s.db.WithContext(ctx).Transaction(func(txdb *gorm.DB) error {
		// 钱包懒创建按需：先条件 UPDATE，0 行（多半无钱包）补空钱包行重试一次。
		credit := func() (int64, error) {
			res := txdb.Model(&model.CreditWallet{}).
				Where("user_id = ?", userID).
				Update("balance", gorm.Expr("balance + ?", amountLi))
			return res.RowsAffected, res.Error
		}
		rows, err := credit()
		if err != nil {
			return err
		}
		if rows == 0 {
			if err := model.EnsureCreditWallet(txdb, userID); err != nil {
				return err
			}
			if rows, err = credit(); err != nil {
				return err
			}
			if rows == 0 {
				return fmt.Errorf("credit grant(%s): wallet not found for user %d", source, userID)
			}
		}
		after, err := creditBalanceAfter(txdb, userID)
		if err != nil {
			return err
		}

		tx = &model.CreditTransaction{
			UserID:       userID,
			Source:       source,
			BizID:        bizID,
			Type:         "grant",
			Amount:       amountLi,
			BalanceAfter: after,
			Meta:         creditMeta(meta, nil),
		}
		cres := txdb.Clauses(clause.OnConflict{DoNothing: true}).Create(tx)
		if cres.Error != nil {
			return cres.Error
		}
		if cres.RowsAffected == 0 {
			return errIdempotentHit
		}
		return nil
	})
	if errors.Is(err, errIdempotentHit) {
		return s.resolveIdempotentHit(ctx, userID, source, bizID)
	}
	if err != nil {
		return nil, err
	}

	slog.InfoContext(ctx, "credit granted",
		"user_id", userID, "source", source, "biz_id", bizID,
		"amount", amountLi, "balance_after", tx.BalanceAfter)
	return tx, nil
}

// GetBalance 只读查询余额与累计净消耗；钱包未创建返回 (0, 0, nil)。
func (s *CreditService) GetBalance(ctx context.Context, userID uint) (balance, totalSpent int64, err error) {
	var w model.CreditWallet
	err = s.db.WithContext(ctx).Where("user_id = ?", userID).First(&w).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, 0, nil
	}
	if err != nil {
		return 0, 0, err
	}
	return w.Balance, w.TotalSpent, nil
}

// ListTransactions 按时间倒序分页拉取用户流水（task-546 记账明细）。
// 默认页 1、每页 10、上限 200，对齐 SystemService.ListEvents 的分页规约。
func (s *CreditService) ListTransactions(
	ctx context.Context,
	userID uint,
	page, pageSize int,
) ([]model.CreditTransaction, int64, error) {
	pageSize = clamp(pageSize, 1, 200)
	if pageSize == 0 {
		pageSize = 10
	}
	if page < 1 {
		page = 1
	}

	q := s.db.WithContext(ctx).Model(&model.CreditTransaction{}).Where("user_id = ?", userID)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []model.CreditTransaction
	err := q.Order("created_at desc").Order("id desc").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&items).Error
	return items, total, err
}

// -- helpers ---------------------------------------------------------- //

// errIdempotentHit 内部信号：流水唯一索引撞车 → 事务回滚，外层查回首次结果。
var errIdempotentHit = errors.New("credit_idempotent_hit")

// creditBalanceAfter 在同一事务内读回钱包余额做流水快照。
// 前置的条件 UPDATE 已持有该行的行锁（Postgres）/写锁（sqlite），读到的一定是
// 本事务 UPDATE 后的值，与其它并发事务无交错——等价于 UPDATE ... RETURNING，
// 且跨方言可用（sqlite 不支持 RETURNING）。
func creditBalanceAfter(txdb *gorm.DB, userID uint) (int64, error) {
	var balance int64
	err := txdb.Model(&model.CreditWallet{}).
		Where("user_id = ?", userID).
		Select("balance").Row().Scan(&balance)
	return balance, err
}

// findTx 按幂等键 (user_id, source, biz_id) 查本人流水；不存在返回 (nil, nil)。
func (s *CreditService) findTx(ctx context.Context, userID uint, source, bizID string) (*model.CreditTransaction, error) {
	var t model.CreditTransaction
	err := s.db.WithContext(ctx).
		Where("user_id = ? AND source = ? AND biz_id = ?", userID, source, bizID).
		First(&t).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// resolveIdempotentHit 幂等命中收尾（四处同构块收口）：事务内 ON CONFLICT 未写入
// → 查回首次流水。查不到属于唯一索引与数据不一致，视为内部错误。
func (s *CreditService) resolveIdempotentHit(ctx context.Context, userID uint, source, bizID string) (*model.CreditTransaction, error) {
	existing, err := s.findTx(ctx, userID, source, bizID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, fmt.Errorf("credit: idempotent hit but transaction missing: %d/%s/%s", userID, source, bizID)
	}
	slog.InfoContext(ctx, "credit idempotent hit",
		"user_id", userID, "source", source, "biz_id", bizID)
	return existing, nil
}

// creditMeta 把调用方 meta 与 service 注入的上下文合并为流水 Meta JSON；注入键不覆盖调用方键。
func creditMeta(meta map[string]any, extra map[string]any) datatypes.JSON {
	merged := make(map[string]any, len(meta)+len(extra))
	for k, v := range meta {
		merged[k] = v
	}
	for k, v := range extra {
		if _, ok := merged[k]; !ok {
			merged[k] = v
		}
	}
	if len(merged) == 0 {
		return nil
	}
	b, err := json.Marshal(merged)
	if err != nil { // map[string]any 理论上不会失败；防御性兜底为无 meta
		return nil
	}
	return datatypes.JSON(b)
}
