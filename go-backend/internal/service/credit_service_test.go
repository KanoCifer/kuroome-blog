package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// newCreditSvcTestDB 对齐 internal/model/credit_test.go 的 newCreditTestDB：
// 共享缓存内存 sqlite + busy_timeout，多连接真并发。
func newCreditSvcTestDB(t *testing.T, name string) *gorm.DB {
	t.Helper()
	// 共享缓存内存库在整个进程内可见，名字加随机后缀避免跨用例/跨轮次串数据
	uid := uuid.NewString()[:8]
	db, err := gorm.Open(sqlite.Open(
		"file:"+name+"_"+uid+"?mode=memory&cache=shared&_pragma=busy_timeout(5000)"), &gorm.Config{
		NamingStrategy: model.NewNamer(),
		Logger:         logger.Discard,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(4)
	if err := db.AutoMigrate(&model.CreditWallet{}, &model.CreditTransaction{}, &model.CreditPrice{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	if err := model.SeedCreditPrices(db); err != nil {
		t.Fatalf("seed prices: %v", err)
	}
	return db
}

func newCreditSvc(t *testing.T, name string) *CreditService {
	t.Helper()
	return NewCreditService(newCreditSvcTestDB(t, name))
}

// isTransientLock sqlite 共享缓存的表级锁竞争（SQLITE_LOCKED/busy）是瞬时错误，
// Postgres 行锁下不会出现；并发测试对其重试。
func isTransientLock(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "locked") || strings.Contains(msg, "busy") ||
		strings.Contains(msg, "SQLITE_LOCKED")
}

func creditTxCount(t *testing.T, db *gorm.DB, userID uint, txType string) int64 {
	t.Helper()
	var n int64
	if err := db.Model(&model.CreditTransaction{}).
		Where("user_id = ? AND type = ?", userID, txType).Count(&n).Error; err != nil {
		t.Fatal(err)
	}
	return n
}

// -- AC: 并发扣减不超卖 ------------------------------------------------ //

func TestCreditPreconsume_ConcurrentNoOversell(t *testing.T) {
	svc := newCreditSvc(t, "svc_conc")
	ctx := context.Background()
	// 余额 1000 厘，translate 单价 10 厘 → 成功上限 floor(1000/10)=100
	if _, err := svc.Grant(ctx, 7, 1000, "seed-7", nil); err != nil {
		t.Fatal(err)
	}
	checkConcurrentNoOversell(t, svc, 7, 140, 100, 1000)
}

// checkConcurrentNoOversell 并发发起 n 次 Preconsume（各自唯一 bizID），
// 断言成功次数恰为 wantSuccess、余额不被扣成负数、流水数与成功数一致。
// 单价固定 translate=10 厘。
func checkConcurrentNoOversell(t *testing.T, svc *CreditService, userID uint, n, wantSuccess int, initial int64) {
	t.Helper()
	ctx := context.Background()
	var wg sync.WaitGroup
	results := make([]error, n)
	for i := range results {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			biz := fmt.Sprintf("conc-%d", i)
			for attempt := 0; ; attempt++ {
				_, _, err := svc.Preconsume(ctx, userID, "translate", "", 1, biz, nil)
				if err == nil || !isTransientLock(err) {
					results[i] = err
					return
				}
				if attempt >= 300 { // 兜底：持续锁竞争视为失败而不是死循环
					results[i] = err
					return
				}
				time.Sleep(time.Millisecond)
			}
		}(i)
	}
	wg.Wait()

	var ok, insufficient int
	for _, err := range results {
		switch {
		case err == nil:
			ok++
		case errors.Is(err, ErrInsufficientBalance):
			insufficient++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if ok != wantSuccess {
		t.Errorf("成功次数 = %d, want %d", ok, wantSuccess)
	}
	if ok+insufficient != n {
		t.Errorf("成功 %d + 不足 %d != 总数 %d（有请求丢失）", ok, insufficient, n)
	}
	balance, totalSpent, err := svc.GetBalance(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}
	if balance < 0 {
		t.Errorf("超卖：balance = %d", balance)
	}
	if want := initial - int64(wantSuccess)*10; balance != want {
		t.Errorf("balance = %d, want %d", balance, want)
	}
	if totalSpent != int64(wantSuccess)*10 {
		t.Errorf("total_spent = %d, want %d", totalSpent, wantSuccess*10)
	}
	if got := creditTxCount(t, svc.db, userID, "consume"); got != int64(wantSuccess) {
		t.Errorf("consume 流水数 = %d, want %d", got, wantSuccess)
	}
}

// -- AC: 同 biz_id 重复 Preconsume 不双扣、返回首次结果 ------------------ //

func TestCreditPreconsume_IdempotentSameBizID(t *testing.T) {
	svc := newCreditSvc(t, "svc_idem")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 1, 10000, "seed-1", nil); err != nil {
		t.Fatal(err)
	}
	first, created, err := svc.Preconsume(ctx, 1, "design_generate", "pro", 1, "img-1", nil)
	if err != nil {
		t.Fatal(err)
	}
	if !created {
		t.Error("首笔 Preconsume created = false, want true")
	}
	again, created, err := svc.Preconsume(ctx, 1, "design_generate", "pro", 1, "img-1", nil)
	if err != nil {
		t.Fatalf("重复 Preconsume 应幂等成功: %v", err)
	}
	if created {
		t.Error("幂等命中 created = true, want false（重放不得被当作新扣费退款）")
	}
	if again.ID != first.ID || again.BalanceAfter != first.BalanceAfter || again.Amount != first.Amount {
		t.Errorf("未返回首次流水: first=%+v again=%+v", first, again)
	}
	balance, _, err := svc.GetBalance(ctx, 1)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 6000 { // 只扣一次 4000
		t.Errorf("双扣：balance = %d, want 6000", balance)
	}
	if got := creditTxCount(t, svc.db, 1, "consume"); got != 1 {
		t.Errorf("consume 流水数 = %d, want 1", got)
	}
}

func TestCreditPreconsume_EmptyBizIDGeneratesUUID(t *testing.T) {
	svc := newCreditSvc(t, "svc_uuid")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 2, 100, "", nil); err != nil {
		t.Fatal(err)
	}
	tx, _, err := svc.Preconsume(ctx, 2, "translate", "", 1, "", nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := uuid.Parse(tx.BizID); err != nil {
		t.Errorf("空 bizID 未生成 UUID: %q", tx.BizID)
	}
}

func TestCreditPreconsume_MetaRecordsVariantQty(t *testing.T) {
	svc := newCreditSvc(t, "svc_meta")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 3, 100000, "seed-3", nil); err != nil {
		t.Fatal(err)
	}
	tx, _, err := svc.Preconsume(ctx, 3, "design_generate", "lite", 2, "m1", map[string]any{"prompt_id": "p9"})
	if err != nil {
		t.Fatal(err)
	}
	if tx.Amount != -6000 { // 3000 × 2
		t.Errorf("Amount = %d, want -6000", tx.Amount)
	}
	var meta map[string]any
	if err := json.Unmarshal(tx.Meta, &meta); err != nil {
		t.Fatalf("meta 非法 JSON: %v", err)
	}
	if meta["variant"] != "lite" || meta["qty"] != float64(2) || meta["prompt_id"] != "p9" {
		t.Errorf("meta = %v, want variant/qty/prompt_id", meta)
	}
}

// -- AC: 余额不足返回 ErrInsufficientBalance 且无扣费流水 ---------------- //

func TestCreditPreconsume_InsufficientNoCharge(t *testing.T) {
	svc := newCreditSvc(t, "svc_lack")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 4, 5, "seed-4", nil); err != nil { // 5 厘 < translate 10 厘
		t.Fatal(err)
	}
	if _, _, err := svc.Preconsume(ctx, 4, "translate", "", 1, "x1", nil); !errors.Is(err, ErrInsufficientBalance) {
		t.Errorf("err = %v, want ErrInsufficientBalance", err)
	}
	if got := creditTxCount(t, svc.db, 4, "consume"); got != 0 {
		t.Errorf("余额不足仍写入流水: %d 条", got)
	}
	balance, totalSpent, err := svc.GetBalance(ctx, 4)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 5 || totalSpent != 0 {
		t.Errorf("扣费未回滚: balance=%d total_spent=%d", balance, totalSpent)
	}
}

func TestCreditPreconsume_PriceNotFound(t *testing.T) {
	svc := newCreditSvc(t, "svc_price")
	if _, _, err := svc.Preconsume(context.Background(), 1, "nope", "", 1, "b1", nil); !errors.Is(err, ErrPriceNotFound) {
		t.Errorf("err = %v, want ErrPriceNotFound", err)
	}
	if _, _, err := svc.Preconsume(context.Background(), 1, "translate", "", 0, "b2", nil); !errors.Is(err, ErrInvalidAmount) {
		t.Errorf("err = %v, want ErrInvalidAmount", err)
	}
}

// -- F-S1/S2/S3: 幂等键三维化 + 入口校验 --------------------------------- //

// 跨用户同 (source, biz_id) 互不命中：各自扣各自的，退款也不退他人 consume。
func TestCreditPreconsume_CrossUserSameKey_NoClobber(t *testing.T) {
	svc := newCreditSvc(t, "svc_crossuser")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 31, 100, "f31", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Grant(ctx, 32, 100, "f32", nil); err != nil {
		t.Fatal(err)
	}
	// 两个用户使用同一幂等键 "shared"，均须真扣（created=true）
	for _, u := range []uint{31, 32} {
		tx, created, err := svc.Preconsume(ctx, u, "translate", "", 1, "shared", nil)
		if err != nil || !created {
			t.Fatalf("user %d: err=%v created=%v, want 真扣", u, err, created)
		}
		if tx.UserID != u {
			t.Errorf("流水归属 user %d, want %d", tx.UserID, u)
		}
	}
	// 各自只扣一次
	for _, u := range []uint{31, 32} {
		if bal, _, _ := svc.GetBalance(ctx, u); bal != 90 {
			t.Errorf("user %d balance = %d, want 90", u, bal)
		}
	}
	// u31 的退款只冲正 u31 的 consume，不吞掉 u32 的
	if _, err := svc.Refund(ctx, 31, "translate", "shared", 0, nil); err != nil {
		t.Fatal(err)
	}
	if bal, _, _ := svc.GetBalance(ctx, 31); bal != 100 {
		t.Errorf("退款后 u31 balance = %d, want 100", bal)
	}
	if bal, _, _ := svc.GetBalance(ctx, 32); bal != 90 {
		t.Errorf("u31 退款串到 u32：balance = %d, want 90", bal)
	}
}

// 他人 consume 不可退：u34 用相同 biz_id 无法退掉 u33 的扣费。
func TestCreditRefund_OtherUserConsume_NotFound(t *testing.T) {
	svc := newCreditSvc(t, "svc_refund_other")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 33, 100, "f33", nil); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.Preconsume(ctx, 33, "translate", "", 1, "vict", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Refund(ctx, 34, "translate", "vict", 0, nil); !errors.Is(err, ErrTransactionNotFound) {
		t.Errorf("err = %v, want ErrTransactionNotFound（不得退他人 consume）", err)
	}
}

// 保留前缀 / 超长 biz_id → ErrInvalidBizID，零扣费；Grant 同样校验。
func TestCreditBizID_Validation(t *testing.T) {
	svc := newCreditSvc(t, "svc_bizid")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 35, 100000, "fund-35", nil); err != nil {
		t.Fatal(err)
	}
	tooLong := strings.Repeat("a", MaxBizIDLen+1)
	for _, biz := range []string{"refund:evil", "settle:evil", tooLong} {
		if _, _, err := svc.Preconsume(ctx, 35, "translate", "", 1, biz, nil); !errors.Is(err, ErrInvalidBizID) {
			t.Errorf("Preconsume(%q) err = %v, want ErrInvalidBizID", biz, err)
		}
		if _, err := svc.Grant(ctx, 35, 10, biz, nil); !errors.Is(err, ErrInvalidBizID) {
			t.Errorf("Grant(%q) err = %v, want ErrInvalidBizID", biz, err)
		}
	}
	// 零扣费：只有 seed grant 一行流水
	if got := creditTxCount(t, svc.db, 35, "consume"); got != 0 {
		t.Errorf("非法键仍产生 consume: %d 条", got)
	}
	if got := creditTxCount(t, svc.db, 35, "grant"); got != 1 {
		t.Errorf("非法键仍产生 grant: %d 条, want 1 (仅 seed)", got)
	}
	// 边界：恰好 MaxBizIDLen 合法
	if _, _, err := svc.Preconsume(ctx, 35, "translate", "", 1, strings.Repeat("b", MaxBizIDLen), nil); err != nil {
		t.Errorf("MaxBizIDLen 边界键被拒: %v", err)
	}
}

// OnConflict 声明式幂等回归：并发重复键最终只留一条流水、只扣一次。
func TestCreditPreconsume_ConcurrentSameKey(t *testing.T) {
	svc := newCreditSvc(t, "svc_conc_key")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 36, 1000, "f36", nil); err != nil {
		t.Fatal(err)
	}
	const n = 8
	var wg sync.WaitGroup
	oks := make([]bool, n)
	creations := make([]bool, n)
	for i := range n {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			for attempt := 0; ; attempt++ {
				_, created, err := svc.Preconsume(ctx, 36, "translate", "", 1, "same", nil)
				if err == nil {
					oks[i], creations[i] = true, created
					return
				}
				if !isTransientLock(err) || attempt >= 300 {
					return
				}
				time.Sleep(time.Millisecond)
			}
		}(i)
	}
	wg.Wait()
	var ok, created int
	for i := range n {
		if oks[i] {
			ok++
		}
		if creations[i] {
			created++
		}
	}
	if ok != n {
		t.Errorf("成功数 = %d, want %d（全部幂等收敛）", ok, n)
	}
	if created != 1 {
		t.Errorf("created=true 次数 = %d, want 1（OnConflict 回滚不双扣）", created)
	}
	if got := creditTxCount(t, svc.db, 36, "consume"); got != 1 {
		t.Errorf("consume 流水数 = %d, want 1", got)
	}
	if bal, spent, _ := svc.GetBalance(ctx, 36); bal != 990 || spent != 10 {
		t.Errorf("balance=%d spent=%d, want 990/10", bal, spent)
	}
}

// -- AC: 退款后 balance / total_spent 复原，流水 balance_after 链连续 ---- //

func TestCreditRefund_RestoresBalanceAndChain(t *testing.T) {
	svc := newCreditSvc(t, "svc_refund")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 5, 10000, "seed-5", nil); err != nil {
		t.Fatal(err)
	}
	consume, _, err := svc.Preconsume(ctx, 5, "design_generate", "pro", 1, "img-5", nil)
	if err != nil {
		t.Fatal(err)
	}
	refund, err := svc.Refund(ctx, 5, "design_generate", "img-5", 0, nil) // 0 = 全额
	if err != nil {
		t.Fatal(err)
	}
	if refund.Type != "refund" || refund.Amount != 4000 || refund.BizID != "refund:img-5" {
		t.Errorf("refund 流水异常: %+v", refund)
	}
	// balance_after 链：grant → consume → refund
	if consume.BalanceAfter != 6000 || refund.BalanceAfter != 10000 {
		t.Errorf("balance_after 链断裂: consume=%d refund=%d", consume.BalanceAfter, refund.BalanceAfter)
	}
	var txs []model.CreditTransaction
	svc.db.Where("user_id = ?", 5).Order("id").Find(&txs)
	// balance_after 链：每条流水的快照 = 前序所有 Amount 累加
	var running int64
	for _, tx := range txs {
		running += tx.Amount
		if tx.BalanceAfter != running {
			t.Errorf("流水 %d balance_after=%d，链上应为 %d", tx.ID, tx.BalanceAfter, running)
		}
	}
	balance, totalSpent, err := svc.GetBalance(ctx, 5)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 10000 || totalSpent != 0 {
		t.Errorf("退款后未复原: balance=%d total_spent=%d, want 10000/0", balance, totalSpent)
	}
}

func TestCreditRefund_IdempotentOnce(t *testing.T) {
	svc := newCreditSvc(t, "svc_refund_once")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 6, 10000, "seed-6", nil); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.Preconsume(ctx, 6, "design_generate", "pro", 1, "img-6", nil); err != nil {
		t.Fatal(err)
	}
	first, err := svc.Refund(ctx, 6, "design_generate", "img-6", 4000, nil)
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Refund(ctx, 6, "design_generate", "img-6", 4000, nil)
	if err != nil {
		t.Fatalf("重复退款应幂等成功: %v", err)
	}
	if second.ID != first.ID {
		t.Errorf("重复退款返回了不同流水: %d vs %d", first.ID, second.ID)
	}
	balance, _, err := svc.GetBalance(ctx, 6)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 10000 { // 只回补一次
		t.Errorf("重复退款双补: balance = %d", balance)
	}
	if got := creditTxCount(t, svc.db, 6, "refund"); got != 1 {
		t.Errorf("refund 流水数 = %d, want 1", got)
	}
}

func TestCreditRefund_PartialAndGuards(t *testing.T) {
	svc := newCreditSvc(t, "svc_refund_part")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 8, 10000, "seed-8", nil); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.Preconsume(ctx, 8, "design_generate", "pro", 1, "img-8", nil); err != nil {
		t.Fatal(err)
	}
	part, err := svc.Refund(ctx, 8, "design_generate", "img-8", 1000, nil)
	if err != nil {
		t.Fatal(err)
	}
	if part.Amount != 1000 {
		t.Errorf("部分退款 Amount = %d, want 1000", part.Amount)
	}
	balance, totalSpent, err := svc.GetBalance(ctx, 8)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 7000 || totalSpent != 3000 {
		t.Errorf("balance=%d total_spent=%d, want 7000/3000", balance, totalSpent)
	}
	// 超出原 consume 成本的退款被拒绝
	if _, err := svc.Refund(ctx, 8, "design_generate", "img-8", 99999, nil); !errors.Is(err, ErrInvalidAmount) {
		t.Errorf("err = %v, want ErrInvalidAmount", err)
	}
	// consume 不存在
	if _, err := svc.Refund(ctx, 8, "design_generate", "no-such", 1, nil); !errors.Is(err, ErrTransactionNotFound) {
		t.Errorf("err = %v, want ErrTransactionNotFound", err)
	}
	// 对 grant 流水退款 → 拒绝
	if _, err := svc.Refund(ctx, 8, "admin_grant", "seed-8", 1, nil); !errors.Is(err, ErrTransactionNotFound) {
		t.Errorf("err = %v, want ErrTransactionNotFound（不得退 grant）", err)
	}
}

// -- AC: Grant 正常 ----------------------------------------------------- //

// Settle：actual > 预扣 → 补扣差额（允许扣负）；幂等键 "settle:"+bizID。
func TestCreditSettle_MoreImages_ChargesDelta(t *testing.T) {
	svc := newCreditSvc(t, "svc_settle_more")
	ctx := context.Background()
	// 余额 15 厘 < translate 3 张成本 30 厘 → 结算后扣负
	if _, err := svc.Grant(ctx, 21, 15, "fund-21", nil); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.Preconsume(ctx, 21, "translate", "", 1, "s1", nil); err != nil { // cost=10
		t.Fatal(err)
	}
	tx, err := svc.Settle(ctx, 21, "translate", "s1", 3) // 实际 3 张 → 补扣 20
	if err != nil {
		t.Fatal(err)
	}
	if tx.Type != "consume" || tx.Amount != -20 || tx.BizID != "settle:s1" {
		t.Errorf("settle 流水异常: %+v", tx)
	}
	balance, totalSpent, _ := svc.GetBalance(ctx, 21)
	if balance != -15 || totalSpent != 30 {
		t.Errorf("balance=%d total_spent=%d, want -15/30（扣负先欠后还）", balance, totalSpent)
	}
	// 幂等：重复 Settle 不双补
	again, err := svc.Settle(ctx, 21, "translate", "s1", 3)
	if err != nil || again.ID != tx.ID {
		t.Errorf("重复 Settle: err=%v id=%d want %d", err, again.ID, tx.ID)
	}

	// 负余额挡住下一次预扣 → 402 语义（先欠后还）
	if _, _, err := svc.Preconsume(ctx, 21, "translate", "", 1, "s2", nil); !errors.Is(err, ErrInsufficientBalance) {
		t.Errorf("err = %v, want ErrInsufficientBalance", err)
	}
}

// Settle：actual < 预扣 → 差额退款；相等 → no-op 返回原流水。
func TestCreditSettle_FewerAndEqual(t *testing.T) {
	svc := newCreditSvc(t, "svc_settle_less")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 22, 1000, "fund-22", nil); err != nil {
		t.Fatal(err)
	}
	// 预扣 2 张 nomu（40 厘），结算只出 1 张 → 退 20
	if _, _, err := svc.Preconsume(ctx, 22, "nomu_prompt_optimize", "", 2, "s3", nil); err != nil {
		t.Fatal(err)
	}
	tx, err := svc.Settle(ctx, 22, "nomu_prompt_optimize", "s3", 1)
	if err != nil {
		t.Fatal(err)
	}
	if tx.Type != "refund" || tx.Amount != 20 || tx.BizID != "refund:s3" {
		t.Errorf("settle 差额退款异常: %+v", tx)
	}
	balance, totalSpent, _ := svc.GetBalance(ctx, 22)
	if balance != 980 || totalSpent != 20 {
		t.Errorf("balance=%d total_spent=%d, want 980/20", balance, totalSpent)
	}
	// 相等 → no-op 返回原 consume 流水
	consume, _, _ := svc.Preconsume(ctx, 22, "translate", "", 1, "s4", nil)
	got, err := svc.Settle(ctx, 22, "translate", "s4", 1)
	if err != nil || got.ID != consume.ID {
		t.Errorf("相等结算应 no-op: err=%v got=%+v", err, got)
	}
	// 原流水不存在 → ErrTransactionNotFound
	if _, err := svc.Settle(ctx, 22, "translate", "nope", 2); !errors.Is(err, ErrTransactionNotFound) {
		t.Errorf("err = %v, want ErrTransactionNotFound", err)
	}
}

func TestCreditGrant_Basic(t *testing.T) {
	svc := newCreditSvc(t, "svc_grant")
	ctx := context.Background()
	tx, err := svc.Grant(ctx, 9, 5000, "manual-1", map[string]any{"reason": "补偿"})
	if err != nil {
		t.Fatal(err)
	}
	if tx.Type != "grant" || tx.Amount != 5000 || tx.Source != "admin_grant" || tx.BalanceAfter != 5000 {
		t.Errorf("grant 流水异常: %+v", tx)
	}
	balance, totalSpent, err := svc.GetBalance(ctx, 9)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 5000 || totalSpent != 0 {
		t.Errorf("balance=%d total_spent=%d, want 5000/0", balance, totalSpent)
	}
	// 幂等：重复 bizID 不双发
	again, err := svc.Grant(ctx, 9, 5000, "manual-1", nil)
	if err != nil || again.ID != tx.ID {
		t.Errorf("重复 Grant: err=%v id=%d want %d", err, again.ID, tx.ID)
	}
	balance, _, _ = svc.GetBalance(ctx, 9)
	if balance != 5000 {
		t.Errorf("重复 Grant 双发: balance = %d", balance)
	}
	if _, err := svc.Grant(ctx, 9, 0, "manual-2", nil); !errors.Is(err, ErrInvalidAmount) {
		t.Errorf("err = %v, want ErrInvalidAmount", err)
	}
}

func TestCreditGetBalance_NoWallet(t *testing.T) {
	svc := newCreditSvc(t, "svc_nobal")
	balance, totalSpent, err := svc.GetBalance(context.Background(), 404)
	if err != nil || balance != 0 || totalSpent != 0 {
		t.Errorf("getBalance=%d,%d,err=%v, want 0,0,nil", balance, totalSpent, err)
	}
}

// -- ListTransactions（task-546 依赖，顺手覆盖） ------------------------- //

func TestCreditListTransactions_PagingOrder(t *testing.T) {
	svc := newCreditSvc(t, "svc_list")
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 10, 100000, "seed-10", nil); err != nil {
		t.Fatal(err)
	}
	for _, biz := range []string{"a", "b", "c"} {
		if _, _, err := svc.Preconsume(ctx, 10, "translate", "", 1, biz, nil); err != nil {
			t.Fatal(err)
		}
	}
	items, total, err := svc.ListTransactions(ctx, 10, 1, 2)
	if err != nil {
		t.Fatal(err)
	}
	if total != 4 || len(items) != 2 {
		t.Fatalf("total=%d len=%d, want 4/2", total, len(items))
	}
	// 时间倒序：最新是 c（第 4 条流水）
	if items[0].BizID != "c" {
		t.Errorf("首页首条 = %s, want c", items[0].BizID)
	}
	if items[0].ID < items[1].ID {
		t.Error("未按倒序排列")
	}
	page2, _, err := svc.ListTransactions(ctx, 10, 2, 2)
	if err != nil || len(page2) != 2 || page2[0].Type != "consume" {
		t.Errorf("第 2 页异常: len=%d err=%v", len(page2), err)
	}
	if _, _, err := svc.ListTransactions(ctx, 999, 1, 10); err != nil {
		t.Errorf("空用户应成功: %v", err)
	}
}

// -- Postgres 专项：真实行锁并发 + RETURNING 语义等价的 balance_after 链 -- //
// 共享缓存 sqlite 的并发被表级锁退化（靠重试兜底）；此处在本地 PG 上验证
// 真正的行级并发。连不上则 skip。
func TestCreditPreconsume_ConcurrentNoOversell_Postgres(t *testing.T) {
	db := openCreditPostgresTestDB(t)
	svc := NewCreditService(db)
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 77, 1000, "seed-77", nil); err != nil {
		t.Fatal(err)
	}
	checkConcurrentNoOversell(t, svc, 77, 100, 100, 1000)
	// 每次成功扣减的 balance_after 快照互不重复（无丢失更新）
	var after []int64
	db.Model(&model.CreditTransaction{}).
		Where("user_id = ? AND type = 'consume'", 77).Pluck("balance_after", &after)
	seen := map[int64]bool{}
	for _, v := range after {
		if seen[v] {
			t.Errorf("balance_after 快照重复: %d（并发写丢失）", v)
		}
		seen[v] = true
	}
}

// PG 专项：三维唯一索引 + OnConflict(DoNothing) 幂等在真实驱动下与 sqlite 行为一致
// （RowsAffected==0 命中回查、跨用户同键互不命中）。连不上则 skip。
func TestCreditIdempotency_Postgres(t *testing.T) {
	svc := NewCreditService(openCreditPostgresTestDB(t))
	ctx := context.Background()
	if _, err := svc.Grant(ctx, 81, 100, "f81", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Grant(ctx, 82, 100, "f82", nil); err != nil {
		t.Fatal(err)
	}
	// 跨用户同 (source, biz_id)：都真扣
	for _, u := range []uint{81, 82} {
		if _, created, err := svc.Preconsume(ctx, u, "translate", "", 1, "shared", nil); err != nil || !created {
			t.Fatalf("user %d preconsume: err=%v created=%v", u, err, created)
		}
	}
	// 同用户重复键：幂等回查 (created=false)
	tx, created, err := svc.Preconsume(ctx, 81, "translate", "", 1, "shared", nil)
	if err != nil || created || tx.UserID != 81 {
		t.Errorf("replay: err=%v created=%v user=%d, want nil/false/81", err, created, tx.UserID)
	}
	if got := creditTxCount(t, svc.db, 81, "consume"); got != 1 {
		t.Errorf("u81 consume 流水数 = %d, want 1", got)
	}
}

// openCreditPostgresTestDB 在本地 PG 的独立 schema 中重建三表，避免污染开发库；
// schema 随 t.Cleanup 级联删除。
func openCreditPostgresTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	const adminDSN = "postgres://liudetao:root@localhost/postgres?sslmode=disable&connect_timeout=2"
	admin, err := gorm.Open(postgres.Open(adminDSN), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Skipf("local postgres unavailable: %v", err)
	}
	schema := fmt.Sprintf("credit_svc_test_%d", time.Now().UnixNano())
	if err := admin.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Skipf("create schema failed: %v", err)
	}
	t.Cleanup(func() {
		admin.Exec("DROP SCHEMA IF EXISTS " + schema + " CASCADE")
		sqlDB, _ := admin.DB()
		sqlDB.Close()
	})
	dsn := adminDSN + "&search_path=" + schema
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		NamingStrategy: model.NewNamer(),
		Logger:         logger.Discard,
	})
	if err != nil {
		t.Fatalf("open pg test db: %v", err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(16)
	if err := db.AutoMigrate(&model.CreditWallet{}, &model.CreditTransaction{}, &model.CreditPrice{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	if err := model.SeedCreditPrices(db); err != nil {
		t.Fatal(err)
	}
	return db
}

// TestCreditGrantRegisterBonus_Idempotent 同 user 重复 GrantRegisterBonus 命中
// (user_id, source=register_bonus, biz_id="register:<id>") 唯一索引，返回首次流水。
// 保护注册失败重试场景不双发。
func TestCreditGrantRegisterBonus_Idempotent(t *testing.T) {
	svc := NewCreditService(newCreditSvcTestDB(t, "register_bonus_idempotent"))

	tx1, err := svc.GrantRegisterBonus(context.Background(), 7, nil)
	if err != nil {
		t.Fatalf("GrantRegisterBonus #1: %v", err)
	}
	tx2, err := svc.GrantRegisterBonus(context.Background(), 7, nil)
	if err != nil {
		t.Fatalf("GrantRegisterBonus #2: %v", err)
	}
	if tx1.ID != tx2.ID {
		t.Errorf("幂等失败: #1 ID=%d, #2 ID=%d", tx1.ID, tx2.ID)
	}
	bal, _, err := svc.GetBalance(context.Background(), 7)
	if err != nil {
		t.Fatal(err)
	}
	if bal != 10000 {
		t.Errorf("重复 Grant 后 balance = %d, want 10000", bal)
	}
}

// TestCreditGrantRegisterBonus_ChannelIsolatedFromAdminGrant register_bonus 与
// admin_grant 是两个独立 source：同一 user 各发一次都该各自落账，余额相加。
func TestCreditGrantRegisterBonus_ChannelIsolatedFromAdminGrant(t *testing.T) {
	svc := NewCreditService(newCreditSvcTestDB(t, "register_bonus_isolation"))

	if _, err := svc.GrantRegisterBonus(context.Background(), 8, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Grant(context.Background(), 8, 5000, "admin-1", nil); err != nil {
		t.Fatal(err)
	}
	bal, _, err := svc.GetBalance(context.Background(), 8)
	if err != nil {
		t.Fatal(err)
	}
	if bal != 15000 {
		t.Errorf("balance = %d, want 15000 (10000 register_bonus + 5000 admin_grant)", bal)
	}
	var count int64
	if err := svc.db.Model(&model.CreditTransaction{}).
		Where("user_id = ? AND source IN ?", 8, []string{"register_bonus", "admin_grant"}).
		Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 2 {
		t.Errorf("流水数 = %d, want 2（两个 source 各一行）", count)
	}
}
