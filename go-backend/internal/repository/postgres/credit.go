package postgres

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	crediterrs "github.com/KanoCifer/kuroome-blog/internal/domain/credit/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// ErrIdempotentHit 事务回滚信号的别名，定义在 internal/domain/credit/errs。
//
// Deprecated: 直接引用 crediterrs.ErrIdempotentHit。
var ErrIdempotentHit = crediterrs.ErrIdempotentHit

// CreditRepository 积分域持久化层：钱包 / 流水 / 价格三表的全部 SQL 与事务。
//
// 跨表原子性由本层的单个 Transaction 保证；service 只编排，不持有 *gorm.DB。
type CreditRepository struct {
	db *gorm.DB
}

func NewCreditRepository(db *gorm.DB) *CreditRepository {
	return &CreditRepository{db: db}
}

// -- 单表读 ------------------------------------------------------------ //

// FindTransaction 按幂等键 (user_id, source, biz_id) 查本人流水；不存在返回 (nil, nil)。
func (r *CreditRepository) FindTransaction(ctx context.Context, userID uint, source, bizID string) (*model.CreditTransaction, error) {
	var t model.CreditTransaction
	err := r.db.WithContext(ctx).
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

// UnitPrice 查 (source, variant) 定价；无定价返回 (0, false, nil)，由 service 映射
// ErrPriceNotFound。
func (r *CreditRepository) UnitPrice(ctx context.Context, source, variant string) (int64, bool, error) {
	var p model.CreditPrice
	err := r.db.WithContext(ctx).
		Where("source = ? AND variant = ?", source, variant).
		First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return p.UnitPrice, true, nil
}

// ListTransactions 按时间倒序分页拉取用户流水。page/pageSize 由调用方 clamp。
func (r *CreditRepository) ListTransactions(
	ctx context.Context,
	userID uint,
	page, pageSize int,
) ([]model.CreditTransaction, int64, error) {
	q := r.db.WithContext(ctx).Model(&model.CreditTransaction{}).Where("user_id = ?", userID)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var items []model.CreditTransaction
	err := q.Order("created_at desc").Order("id desc").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&items).Error
	return items, total, err
}

// -- 钱包 -------------------------------------------------------------- //

// GetOrCreateWallet 读钱包；不存在则懒创建空钱包后重读，返回 0 余额。
//
// 并发安全：EnsureCreditWallet 走 ON CONFLICT DO NOTHING，两个并发首查同时未命中
// 时只落一行；随后统一重读拿真实余额（不可用手工赋零值快照，那会把余额写回 0）。
func (r *CreditRepository) GetOrCreateWallet(ctx context.Context, userID uint) (*model.CreditWallet, error) {
	var w model.CreditWallet
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&w).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if cerr := model.EnsureCreditWallet(r.db.WithContext(ctx), userID); cerr != nil {
			return nil, cerr
		}
		if err = r.db.WithContext(ctx).Where("user_id = ?", userID).First(&w).Error; err != nil {
			return nil, err
		}
	}
	if err != nil {
		return nil, err
	}
	return &w, nil
}

// -- 事务动作 ---------------------------------------------------------- //

// Debit 条件扣减：`balance >= cost` 写进 UPDATE 的 WHERE，判断与扣减是同一条语句
// （无先查后改、无应用层锁）。
//
// 0 行 = 无钱包或余额不足。钱包懒创建由本函数负责：0 行时补空钱包重试一次，
// 仍 0 行则返回 crediterrs.ErrInsufficientBalance 让事务回滚 —— 空钱包是本次事务
// 里补的，余额不足就不该留下这行脏数据。同事务写 consume 流水；流水撞唯一索引 →
// ErrIdempotentHit 触发回滚，由调用方查回首笔。
//
// 不返回「是否扣成功」的 bool：余额不足是错误路径（哨兵），返回 nil 即表示已扣。
func (r *CreditRepository) Debit(
	ctx context.Context,
	userID uint,
	amount int64,
	tx *model.CreditTransaction,
) error {
	err := r.db.WithContext(ctx).Transaction(func(txdb *gorm.DB) error {
		debitOnce := func() (int64, error) {
			res := txdb.Model(&model.CreditWallet{}).
				Where("user_id = ? AND balance >= ?", userID, amount).
				Updates(map[string]any{
					"balance":     gorm.Expr("balance - ?", amount),
					"total_spent": gorm.Expr("total_spent + ?", amount),
				})
			return res.RowsAffected, res.Error
		}

		rows, err := debitOnce()
		if err != nil {
			return err
		}
		if rows == 0 {
			if err := model.EnsureCreditWallet(txdb, userID); err != nil {
				return err
			}
			if rows, err = debitOnce(); err != nil {
				return err
			}
			if rows == 0 {
				// 无钱包=余额 0。返回哨兵让事务回滚：本次只在事务里补的空钱包
				// 一并不落库（脏行不留），零扣费、零流水。
				return crediterrs.ErrInsufficientBalance
			}
		}

		after, err := balanceAfter(txdb, userID)
		if err != nil {
			return err
		}
		tx.BalanceAfter = after
		if err := r.appendLedger(txdb, tx); err != nil {
			return err
		}
		return nil
	})
	return err
}

// Credit 反向回补：balance += amount、total_spent -= amount 同事务原子完成。
// total_spent 守卫防累计净消耗被退成负数（0 行 = 无钱包或 total_spent < amount）。
func (r *CreditRepository) Credit(
	ctx context.Context,
	userID uint,
	amount int64,
	tx *model.CreditTransaction,
) error {
	return r.db.WithContext(ctx).Transaction(func(txdb *gorm.DB) error {
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

		after, err := balanceAfter(txdb, userID)
		if err != nil {
			return err
		}
		tx.BalanceAfter = after
		return r.appendLedger(txdb, tx)
	})
}

// SettleDelta 补扣差额。**故意不设 balance 守卫、允许扣成负数**：图已生成、上游成本
// 已实际发生，不补扣即坏账；负余额在下次 Debit 被余额守卫挡出 402，先欠后还。
func (r *CreditRepository) SettleDelta(
	ctx context.Context,
	userID uint,
	delta int64,
	tx *model.CreditTransaction,
) error {
	return r.db.WithContext(ctx).Transaction(func(txdb *gorm.DB) error {
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

		after, err := balanceAfter(txdb, userID)
		if err != nil {
			return err
		}
		tx.BalanceAfter = after
		return r.appendLedger(txdb, tx)
	})
}

// Grant 入账：balance += amount 同事务原子完成。钱包懒创建同 Debit
// （0 行补空钱包重试一次，仍 0 行报错）。流水撞唯一索引 → ErrIdempotentHit。
func (r *CreditRepository) Grant(
	ctx context.Context,
	userID uint,
	amount int64,
	tx *model.CreditTransaction,
) error {
	return r.db.WithContext(ctx).Transaction(func(txdb *gorm.DB) error {
		creditOnce := func() (int64, error) {
			res := txdb.Model(&model.CreditWallet{}).
				Where("user_id = ?", userID).
				Update("balance", gorm.Expr("balance + ?", amount))
			return res.RowsAffected, res.Error
		}

		rows, err := creditOnce()
		if err != nil {
			return err
		}
		if rows == 0 {
			if err := model.EnsureCreditWallet(txdb, userID); err != nil {
				return err
			}
			if rows, err = creditOnce(); err != nil {
				return err
			}
			if rows == 0 {
				return fmt.Errorf("credit grant(%s): wallet not found for user %d", tx.Source, userID)
			}
		}

		after, err := balanceAfter(txdb, userID)
		if err != nil {
			return err
		}
		tx.BalanceAfter = after
		return r.appendLedger(txdb, tx)
	})
}

// -- 内部 -------------------------------------------------------------- //

// appendLedger 在事务内写流水。声明式幂等：ON CONFLICT DO NOTHING + RowsAffected==0
// → 并发重复请求已有一份流水（sqlite/PG 双驱动一致），返回 ErrIdempotentHit 让事务回滚。
func (r *CreditRepository) appendLedger(txdb *gorm.DB, tx *model.CreditTransaction) error {
	res := txdb.Clauses(clause.OnConflict{DoNothing: true}).Create(tx)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrIdempotentHit
	}
	return nil
}

// balanceAfter 在同一事务内读回钱包余额做流水快照。
// 前置的条件 UPDATE 已持有该行的行锁（Postgres）/写锁（sqlite），读到的一定是
// 本事务 UPDATE 后的值，与其它并发事务无交错——等价于 UPDATE ... RETURNING，
// 且跨方言可用（sqlite 不支持 RETURNING）。
func balanceAfter(txdb *gorm.DB, userID uint) (int64, error) {
	var balance int64
	err := txdb.Model(&model.CreditWallet{}).
		Where("user_id = ?", userID).
		Select("balance").Row().Scan(&balance)
	return balance, err
}
