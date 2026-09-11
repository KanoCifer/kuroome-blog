package model

import (
	"sync"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newCreditTestDB(t *testing.T, name string) *gorm.DB {
	t.Helper()
	// busy_timeout 消化 sqlite 共享缓存的写锁竞争；生产 Postgres 无此问题
	db, err := gorm.Open(sqlite.Open("file:"+name+"?mode=memory&cache=shared&_pragma=busy_timeout(5000)"), &gorm.Config{
		NamingStrategy: NewNamer(),
		Logger:         logger.Discard,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(4) // 共享内存库允许多连接真并发
	if err := db.AutoMigrate(&CreditWallet{}, &CreditTransaction{}, &CreditPrice{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	return db
}

func TestSeedCreditPrices_Idempotent(t *testing.T) {
	db := newCreditTestDB(t, "credit_seed")
	for i := 0; i < 3; i++ { // 重复"启动"三次
		if err := SeedCreditPrices(db); err != nil {
			t.Fatalf("seed round %d: %v", i, err)
		}
	}
	var n int64
	db.Model(&CreditPrice{}).Count(&n)
	if want := int64(len(creditPriceSeeds)); n != want {
		t.Errorf("seed 重复执行后价格行数 = %d, want %d", n, want)
	}
	// 不覆盖人工调价
	db.Model(&CreditPrice{}).Where("source = ? AND variant = ?", "design_generate", DesignVariantArkPro).
		Update("unit_price", 9999)
	if err := SeedCreditPrices(db); err != nil {
		t.Fatal(err)
	}
	var p CreditPrice
	db.Where("source = ? AND variant = ?", "design_generate", DesignVariantArkPro).First(&p)
	if p.UnitPrice != 9999 {
		t.Errorf("seed 覆盖了人工调价: %d, want 9999", p.UnitPrice)
	}
}

func TestEnsureCreditWallet_ConcurrentSingleRow(t *testing.T) {
	db := newCreditTestDB(t, "credit_wallet")
	var wg sync.WaitGroup
	errs := make([]error, 8)
	for i := range errs {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			errs[i] = EnsureCreditWallet(db, 42)
		}(i)
	}
	wg.Wait()
	// sqlite 共享缓存并发写会抛表级锁（SQLITE_LOCKED，Postgres 无此问题），
	// 这里只验证 AC 本身：并发/重复调用下唯一索引 + ON CONFLICT 不产生重复行。
	var n int64
	db.Model(&CreditWallet{}).Where("user_id = ?", 42).Count(&n)
	if n != 1 {
		t.Errorf("并发懒创建后行数 = %d, want 1 (errs=%v)", n, errs)
	}
	// 再次调用不动已有行（余额不被清零）
	db.Model(&CreditWallet{}).Where("user_id = ?", 42).Update("balance", 500)
	if err := EnsureCreditWallet(db, 42); err != nil {
		t.Fatal(err)
	}
	var w CreditWallet
	db.Where("user_id = ?", 42).First(&w)
	if w.Balance != 500 {
		t.Errorf("懒创建覆盖了余额: %d, want 500", w.Balance)
	}
}

func TestCreditTransaction_SourceUserBizID_Unique(t *testing.T) {
	db := newCreditTestDB(t, "credit_tx")
	tx := func(user uint, source, biz string) error {
		return db.Create(&CreditTransaction{
			UserID: user, Source: source, BizID: biz,
			Type: "consume", Amount: -3000, BalanceAfter: 0,
		}).Error
	}
	if err := tx(1, "design_generate", "abc"); err != nil {
		t.Fatalf("first insert: %v", err)
	}
	// 同 (user_id, source, biz_id) 必须被三维唯一索引拒绝
	if err := tx(1, "design_generate", "abc"); err == nil {
		t.Error("重复 (user_id,source,biz_id) 插入成功，唯一索引缺失")
	}
	// 同 biz_id 不同 source 允许
	if err := tx(1, "translate", "abc"); err != nil {
		t.Errorf("跨 source 同 biz_id 应允许: %v", err)
	}
	// 跨用户同 (source, biz_id) 允许（修"串键"：客户端撞键互不命中）
	if err := tx(2, "design_generate", "abc"); err != nil {
		t.Errorf("跨用户同 (source,biz_id) 应允许: %v", err)
	}
}
