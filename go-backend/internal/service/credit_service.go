package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"maps"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"gorm.io/datatypes"

	crediterrs "github.com/KanoCifer/kuroome-blog/internal/domain/credit/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// CreditService 积分核心服务：预扣、退款、发放、余额、流水。
//
// 只做编排（参数校验、幂等键派生、unit 反推、日志、错误包装）；持久化全部在
// postgres.CreditRepository，跨表原子性由 repo 的单个 Transaction 保证。
//
// 数值全部厘制整型（单位 0.01 分）；Amount 正=入账、负=出账。
// (UserID, Source, BizID) 联合唯一索引即幂等键：user 入键使跨用户同键互不命中，
// Refund/Settle 按 (user_id, source, biz_id) 精确命中本人流水。
//
// ponytail: 崩溃窗口丢退款（预扣成功、业务失败前进程挂掉，consume 流水无终态），
// 第一期接受；升级路径=对账 job（扫 consume 无终态超时退款）。
type CreditService struct {
	repo CreditRepository
}

// CreditRepository 是 CreditService 依赖的持久化能力（由 postgres.CreditRepository 满足）。
type CreditRepository interface {
	FindTransaction(ctx context.Context, userID uint, source, bizID string) (*model.CreditTransaction, error)
	UnitPrice(ctx context.Context, source, variant string) (int64, bool, error)
	ListTransactions(ctx context.Context, userID uint, page, pageSize int) ([]model.CreditTransaction, int64, error)
	GetOrCreateWallet(ctx context.Context, userID uint) (*model.CreditWallet, error)
	Debit(ctx context.Context, userID uint, amount int64, tx *model.CreditTransaction) error
	Credit(ctx context.Context, userID uint, amount int64, tx *model.CreditTransaction) error
	SettleDelta(ctx context.Context, userID uint, delta int64, tx *model.CreditTransaction) error
	Grant(ctx context.Context, userID uint, amount int64, tx *model.CreditTransaction) error
}

// Creditser 定义 credit handler依赖的能力集合。
type Creditser interface {

	Preconsume(ctx context.Context, userID uint, source, variant string, qty int, bizID string, meta map[string]any) (*model.CreditTransaction, bool, error)
	Refund(ctx context.Context, userID uint, source, bizID string, amount int64, meta map[string]any) (*model.CreditTransaction, error)
	Settle(ctx context.Context, userID uint, source, bizID string, actualQty int) (*model.CreditTransaction, error)
	Grant(ctx context.Context, userID uint, amountLi int64, bizID string, meta map[string]any) (*model.CreditTransaction, error)

	GrantRegisterBonus(ctx context.Context, userID uint, meta map[string]any) (*model.CreditTransaction, error)
	GetBalance(ctx context.Context, userID uint) (int64, int64, error)
	ListTransactions(ctx context.Context, userID uint, page, pageSize int) ([]model.CreditTransaction, int64, error)
}

var _ Creditser = (*CreditService)(nil)

func NewCreditService(repo CreditRepository) *CreditService {
	return &CreditService{repo: repo}
}

// 哨兵错误定义在 internal/domain/credit/errs，全仓统一 import 该包引用。

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
			crediterrs.ErrInvalidBizID, MaxBizIDLen, creditRefundPrefix, creditSettlePrefix)
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
		return nil, false, fmt.Errorf("%w: qty must be positive", crediterrs.ErrInvalidAmount)
	}
	if bizID == "" {
		bizID = uuid.NewString()
	} else if err := validateBizID(bizID); err != nil {
		return nil, false, err
	}

	// 快路径：重复请求不碰钱包。漏网的并发重复由流水唯一索引兜底（见下 OnConflict）。
	if existing, err := s.repo.FindTransaction(ctx, userID, source, bizID); err != nil {
		return nil, false, err
	} else if existing != nil {
		return existing, false, nil
	}

	unit, found, err := s.repo.UnitPrice(ctx, source, variant)
	if err != nil {
		return nil, false, err
	}
	if !found {
		return nil, false, fmt.Errorf("%w: %s/%s", crediterrs.ErrPriceNotFound, source, variant)
	}
	cost := unit * int64(qty)

	tx := &model.CreditTransaction{
		UserID: userID,
		Source: source,
		BizID:  bizID,
		Type:   "consume",
		Amount: -cost,
		Meta:   creditMeta(meta, map[string]any{"variant": variant, "qty": qty}),
	}
	err = s.repo.Debit(ctx, userID, cost, tx)
	if errors.Is(err, crediterrs.ErrIdempotentHit) {
		existing, herr := s.resolveIdempotentHit(ctx, userID, source, bizID)
		return existing, false, herr
	}
	if err != nil {
		// 余额不足是预期业务结果，不按异常记 ERROR（与重构前一致）。
		if !errors.Is(err, crediterrs.ErrInsufficientBalance) {
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
	consume, err := s.repo.FindTransaction(ctx, userID, source, bizID)
	if err != nil {
		return nil, err
	}
	if consume == nil || consume.Type != "consume" {
		return nil, fmt.Errorf("%w: consume %s/%s", crediterrs.ErrTransactionNotFound, source, bizID)
	}
	cost := -consume.Amount
	if amount <= 0 {
		amount = cost
	}
	if amount > cost {
		return nil, fmt.Errorf("%w: refund %d exceeds consume %d", crediterrs.ErrInvalidAmount, amount, cost)
	}

	refundBizID := creditRefundPrefix + bizID
	if existing, err := s.repo.FindTransaction(ctx, userID, source, refundBizID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}

	tx := &model.CreditTransaction{
		UserID: userID,
		Source: source,
		BizID:  refundBizID,
		Type:   "refund",
		Amount: amount,
		Meta:   creditMeta(meta, map[string]any{"refund_of": bizID}),
	}
	err = s.repo.Credit(ctx, userID, amount, tx)
	if errors.Is(err, crediterrs.ErrIdempotentHit) {
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
	consume, err := s.repo.FindTransaction(ctx, userID, source, bizID)
	if err != nil {
		return nil, err
	}
	if consume == nil || consume.Type != "consume" {
		return nil, fmt.Errorf("%w: consume %s/%s", crediterrs.ErrTransactionNotFound, source, bizID)
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
	if existing, err := s.repo.FindTransaction(ctx, userID, source, settleBizID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}

	tx := &model.CreditTransaction{
		UserID: userID,
		Source: source,
		BizID:  settleBizID,
		Type:   "consume",
		Amount: -delta,
		Meta:   creditMeta(nil, map[string]any{"settle_of": bizID, "qty": actualQty - preQty}),
	}
	err = s.repo.SettleDelta(ctx, userID, delta, tx)
	if errors.Is(err, crediterrs.ErrIdempotentHit) {
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
		return nil, fmt.Errorf("%w: grant amount must be positive", crediterrs.ErrInvalidAmount)
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
	if existing, err := s.repo.FindTransaction(ctx, userID, source, bizID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}

	tx := &model.CreditTransaction{
		UserID: userID,
		Source: source,
		BizID:  bizID,
		Type:   "grant",
		Amount: amountLi,
		Meta:   creditMeta(meta, nil),
	}
	err := s.repo.Grant(ctx, userID, amountLi, tx)
	if errors.Is(err, crediterrs.ErrIdempotentHit) {
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

// GetBalance 查询余额与累计净消耗；钱包未创建时懒创建空钱包并返回 0。
func (s *CreditService) GetBalance(ctx context.Context, userID uint) (balance, totalSpent int64, err error) {
	w, err := s.repo.GetOrCreateWallet(ctx, userID)
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
	return s.repo.ListTransactions(ctx, userID, page, pageSize)
}

// -- helpers ---------------------------------------------------------- //

// resolveIdempotentHit 幂等命中收尾（四处同构块收口）：事务内 ON CONFLICT 未写入
// → 查回首次流水。查不到属于唯一索引与数据不一致，视为内部错误。
func (s *CreditService) resolveIdempotentHit(ctx context.Context, userID uint, source, bizID string) (*model.CreditTransaction, error) {
	existing, err := s.repo.FindTransaction(ctx, userID, source, bizID)
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
	maps.Copy(merged, meta)
	maps.Copy(merged, extra)
	if len(merged) == 0 {
		return nil
	}
	b, err := json.Marshal(merged)
	if err != nil { // map[string]any 理论上不会失败；防御性兜底为无 meta
		return nil
	}
	return datatypes.JSON(b)
}
