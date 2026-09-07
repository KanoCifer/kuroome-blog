package nomu

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// errInsufficient 模拟 service.ErrInsufficientBalance（跨包哨兵等价：nomu 只 errors.Is 透传）。
var errInsufficient = errors.New("insufficient_balance")

// fakeCredit 记录 Preconsume/Refund/Settle 调用，断言计费时序。
// replay=true 模拟幂等命中（Preconsume 返回 created=false，本次未新扣）。
type fakeCredit struct {
	preconsumeErr error
	replay        bool  // 模拟重放：created=false
	unitPrice     int64 // 厘/张，用于回写 consume 流水 Amount
	preconsumes   []creditCall
	refunds       []creditCall
	settles       []creditCall
}

type creditCall struct {
	userID  uint
	source  string
	variant string
	qty     int
	bizID   string
	amount  int64 // 仅 Refund 有意义，0=全额
}

func (f *fakeCredit) Preconsume(ctx context.Context, userID uint, source, variant string, qty int, bizID string, meta map[string]any) (*model.CreditTransaction, bool, error) {
	f.preconsumes = append(f.preconsumes, creditCall{userID, source, variant, qty, bizID, 0})
	if f.preconsumeErr != nil {
		return nil, false, f.preconsumeErr
	}
	created := !f.replay
	unit := f.unitPrice
	if unit == 0 {
		unit = 3000
	}
	return &model.CreditTransaction{
		UserID: userID, Source: source, BizID: bizID, Type: "consume",
		Amount: -unit * int64(qty),
	}, created, nil
}

func (f *fakeCredit) Refund(ctx context.Context, userID uint, source, bizID string, amount int64, meta map[string]any) (*model.CreditTransaction, error) {
	f.refunds = append(f.refunds, creditCall{userID, source, "", 0, bizID, amount})
	return &model.CreditTransaction{UserID: userID, Source: source, BizID: "refund:" + bizID, Type: "refund", Amount: amount}, nil
}

func (f *fakeCredit) Settle(ctx context.Context, userID uint, source, bizID string, actualQty int) (*model.CreditTransaction, error) {
	f.settles = append(f.settles, creditCall{userID, source, "", actualQty, bizID, 0})
	return nil, nil
}

// newCreditTestService 起一个伪方舟 + 注入 fakeCredit。arkHits 记录方舟被调次数。
func newCreditTestService(t *testing.T, credit Creditser, outImages int, arkFail bool) (*DesignService, *int) {
	t.Helper()
	hits := 0
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/images/generations", func(w http.ResponseWriter, r *http.Request) {
		hits++
		if arkFail {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":{"code":"InternalServiceError","message":"boom"}}`))
			return
		}
		data := make([]map[string]any, 0, outImages)
		for i := range outImages {
			data = append(data, map[string]any{"url": "https://ark.example/" + string(rune('a'+i)) + ".jpeg", "size": "1K"})
		}
		json.NewEncoder(w).Encode(map[string]any{
			"model": "doubao-seedream-5-0-260128",
			"data":  data,
		})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	svc := NewDesignService(httpclient.New(), "k", nil, credit, WithBaseURL(srv.URL+"/api/v3/images/generations"))
	return svc, &hits
}

// AC: 余额不足时方舟零调用。
func TestGenerate_InsufficientBalance_NoArkCall(t *testing.T) {
	credit := &fakeCredit{preconsumeErr: errInsufficient}
	svc, hits := newCreditTestService(t, credit, 1, false)

	_, err := svc.Generate(context.Background(), GenerateRequest{UserID: 1, Prompt: "x"})
	if !errors.Is(err, ErrCredit) {
		t.Fatalf("err = %v, want wrapped ErrCredit", err)
	}
	if !errors.Is(err, errInsufficient) {
		t.Errorf("err = %v, want to wrap insufficient sentinel", err)
	}
	if *hits != 0 {
		t.Errorf("ark called %d times, want 0 on insufficient balance", *hits)
	}
	if len(credit.preconsumes) != 1 {
		t.Errorf("preconsumes = %d, want 1", len(credit.preconsumes))
	}
	// 未预扣成功 → 绝不该退款
	if len(credit.refunds) != 0 {
		t.Errorf("refunds = %d, want 0 (nothing was consumed)", len(credit.refunds))
	}
}

// AC: 方舟失败 → 全额退款（amount=0 表示全额）。
func TestGenerate_ArkFailure_FullRefund(t *testing.T) {
	credit := &fakeCredit{unitPrice: 4000}
	svc, _ := newCreditTestService(t, credit, 1, true)

	_, err := svc.Generate(context.Background(), GenerateRequest{
		UserID: 1, Prompt: "x", Model: "Doubao-Seedream-5.0-pro", IdempotencyKey: "idem-1",
	})
	if !errors.Is(err, ErrUpstream) {
		t.Fatalf("err = %v, want ErrUpstream", err)
	}
	if len(credit.preconsumes) != 1 {
		t.Fatalf("preconsumes = %d, want 1", len(credit.preconsumes))
	}
	pc := credit.preconsumes[0]
	if pc.variant != "pro" || pc.qty != 1 || pc.bizID != "idem-1" {
		t.Errorf("preconsume = %+v, want variant=pro qty=1 bizID=idem-1", pc)
	}
	if len(credit.refunds) != 1 {
		t.Fatalf("refunds = %d, want 1", len(credit.refunds))
	}
	rf := credit.refunds[0]
	if rf.amount != 0 || rf.bizID != "idem-1" {
		t.Errorf("refund = %+v, want amount=0 (full) bizID=idem-1", rf)
	}
}

// AC: 调用成功出 1 张（=闸门预扣张数）→ 无退款；Settle 无条件调用（内部对相等 no-op）。
func TestGenerate_Success_NoRefund(t *testing.T) {
	credit := &fakeCredit{unitPrice: 3000}
	svc, _ := newCreditTestService(t, credit, 1, false)

	if _, err := svc.Generate(context.Background(), GenerateRequest{UserID: 1, Prompt: "x"}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(credit.refunds) != 0 {
		t.Errorf("refunds = %d, want 0 on success", len(credit.refunds))
	}
	if len(credit.settles) != 1 || credit.settles[0].qty != 1 {
		t.Errorf("settles = %v, want 1 次 qty=1（无条件结算，相等时 Settle 内部 no-op）", credit.settles)
	}
}

// AC: 重放（Preconsume created=false）本轮失败 → 不得退款，避免退掉首笔已成功交付的扣费。
func TestGenerate_ReplayFailure_NoRefund(t *testing.T) {
	credit := &fakeCredit{unitPrice: 3000, replay: true}
	svc, _ := newCreditTestService(t, credit, 1, true) // 方舟失败

	if _, err := svc.Generate(context.Background(), GenerateRequest{
		UserID: 1, Prompt: "x", IdempotencyKey: "replay-key",
	}); !errors.Is(err, ErrUpstream) {
		t.Fatalf("err = %v, want ErrUpstream", err)
	}
	if len(credit.preconsumes) != 1 {
		t.Fatalf("preconsumes = %d, want 1", len(credit.preconsumes))
	}
	if len(credit.refunds) != 0 {
		t.Errorf("重放失败退款 = %d, want 0（首笔可能已交付，重放免单通道）", len(credit.refunds))
	}
}

// AC: 响应 data[] 多张 → Settle 按实际张数补扣。
func TestGenerate_MultipleImages_Settle(t *testing.T) {
	credit := &fakeCredit{unitPrice: 3000}
	svc, _ := newCreditTestService(t, credit, 8, false) // 方舟返回 8 张

	if _, err := svc.Generate(context.Background(), GenerateRequest{UserID: 1, Prompt: "x"}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(credit.settles) != 1 {
		t.Fatalf("settles = %d, want 1", len(credit.settles))
	}
	if credit.settles[0].qty != 8 {
		t.Errorf("settle qty = %d, want 8", credit.settles[0].qty)
	}
	if len(credit.refunds) != 0 {
		t.Errorf("refunds = %d, want 0", len(credit.refunds))
	}
}

// AC: 同 Idempotency-Key 透传给 Preconsume（真实不双扣由 credit_service 保证）。
func TestGenerate_ForwardsIdempotencyKey(t *testing.T) {
	credit := &fakeCredit{}
	svc, _ := newCreditTestService(t, credit, 1, false)

	if _, err := svc.Generate(context.Background(), GenerateRequest{
		UserID: 7, Prompt: "x", IdempotencyKey: "same-key",
	}); err != nil {
		t.Fatal(err)
	}
	if credit.preconsumes[0].bizID != "same-key" || credit.preconsumes[0].userID != 7 {
		t.Errorf("preconsume = %+v, want bizID=same-key userID=7", credit.preconsumes[0])
	}
}

// credits=nil（未装配）时不计费、不 panic。
func TestGenerate_NilCredits_SkipsBilling(t *testing.T) {
	svc, hits := newCreditTestService(t, nil, 1, false)
	if _, err := svc.Generate(context.Background(), GenerateRequest{UserID: 1, Prompt: "x"}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if *hits != 1 {
		t.Errorf("ark hits = %d, want 1", *hits)
	}
}

// AC: 同 Idempotency-Key 重试不双扣（端到端：真 CreditService + sqlite）。
func TestGenerate_SameIdempotencyKey_NoDoubleDeduct(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(
		"file:nomu_idem?mode=memory&cache=shared&_pragma=busy_timeout(5000)"),
		&gorm.Config{NamingStrategy: model.NewNamer(), Logger: gormlogger.Discard})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&model.CreditWallet{}, &model.CreditTransaction{}, &model.CreditPrice{}); err != nil {
		t.Fatal(err)
	}
	if err := model.SeedCreditPrices(db); err != nil {
		t.Fatal(err)
	}
	credits := service.NewCreditService(db)
	svc, _ := newCreditTestService(t, credits, 1, false)

	ctx := context.Background()
	// 预扣余额（grant 20000 厘 = 200 分；lite 单价 3000 厘/张）
	if _, err := credits.Grant(ctx, 9, 20000, "fund", nil); err != nil {
		t.Fatal(err)
	}

	for i := range 2 {
		if _, err := svc.Generate(ctx, GenerateRequest{
			UserID: 9, Prompt: "x", Model: "Doubao-Seedream-5.0-lite", IdempotencyKey: "same-key",
		}); err != nil {
			t.Fatalf("Generate #%d: %v", i, err)
		}
	}

	balance, _, err := credits.GetBalance(ctx, 9)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 17000 { // 20000 - 3000×1，只扣一次
		t.Errorf("balance = %d, want 17000 (single deduction for repeated key)", balance)
	}
}
