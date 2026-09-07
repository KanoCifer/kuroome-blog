package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/middleware"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

// newCreditHandlerTestDB 独立内存 sqlite（每个测试一个库，名字随机避免串数据）。
func newCreditHandlerTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(
		"file:credithandler_"+t.Name()+"?mode=memory&cache=shared&_pragma=busy_timeout(5000)"),
		&gorm.Config{NamingStrategy: model.NewNamer(), Logger: logger.Discard})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.CreditWallet{}, &model.CreditTransaction{}, &model.CreditPrice{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	if err := model.SeedCreditPrices(db); err != nil {
		t.Fatalf("seed prices: %v", err)
	}
	t.Cleanup(func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	})
	return db
}

// newCreditTestRouter 挂真实 AuthMiddleware + AdminMiddleware（admin=[1,2]），
// 与 router.go 的装配一致；签发真实 HS256 JWT。
func newCreditTestRouter(t *testing.T, svc service.Creditser) *gin.Engine {
	t.Helper()
	old := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "credit-test-secret"}}
	t.Cleanup(func() { config.Cfg = old })

	r := gin.New()
	v3 := r.Group("/v3")
	NewCreditHandler(svc).RegisterRoutes(v3,
		middleware.AuthMiddleware(), middleware.AdminMiddleware([]int{1, 2}))
	return r
}

func authHeader(t *testing.T, userID uint) string {
	t.Helper()
	tok, err := jwt.GenerateToken(userID, time.Now().Add(time.Hour))
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	return "Bearer " + tok
}

func doCreditRequest(t *testing.T, r *gin.Engine, method, path, body, auth string) *httptest.ResponseRecorder {
	t.Helper()
	var rd *bytes.Reader
	if body != "" {
		rd = bytes.NewReader([]byte(body))
	} else {
		rd = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, rd)
	req.Header.Set("Content-Type", "application/json")
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ── GET /v3/credits/balance ──────────────────────────────────────────

func TestCreditHandler_Balance_NoWallet_ReturnsZero(t *testing.T) {
	svc := service.NewCreditService(newCreditHandlerTestDB(t))
	r := newCreditTestRouter(t, svc)

	w := doCreditRequest(t, r, http.MethodGet, "/v3/credits/balance", "", authHeader(t, 42))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	var resp response.Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	data, ok := resp.Data.(map[string]any)
	if !ok {
		t.Fatalf("data = %T, want object", resp.Data)
	}
	if data["balance"] != float64(0) || data["total_spent"] != float64(0) {
		t.Errorf("data = %v, want zero balance/total_spent", data)
	}
}

func TestCreditHandler_Balance_Unauthenticated_401(t *testing.T) {
	svc := service.NewCreditService(newCreditHandlerTestDB(t))
	r := newCreditTestRouter(t, svc)

	w := doCreditRequest(t, r, http.MethodGet, "/v3/credits/balance", "", "")
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

// ── POST /v3/admin/credits/grant ─────────────────────────────────────

func TestCreditHandler_Grant_IncreasesBalanceAndLogsTx(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc)

	// 100.55 分 → 10055 厘（两位小数不截断）
	w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"user_id":42,"amount":100.55,"biz_id":"g-1"}`, authHeader(t, 1))
	if w.Code != http.StatusOK {
		t.Fatalf("grant: status = %d, body=%s", w.Code, w.Body.String())
	}

	balance, spent, err := svc.GetBalance(context.Background(), 42)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 10055 || spent != 0 {
		t.Errorf("balance=%d spent=%d, want 10055/0", balance, spent)
	}

	var tx model.CreditTransaction
	if err := db.Where("source = ? AND biz_id = ?", "admin_grant", "g-1").First(&tx).Error; err != nil {
		t.Fatalf("grant transaction missing: %v", err)
	}
	if tx.Type != "grant" || tx.Amount != 10055 || tx.BalanceAfter != 10055 {
		t.Errorf("tx = %+v, want grant/10055/10055", &tx)
	}

	// 幂等：重复 biz_id 不双发
	doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"user_id":42,"amount":100.55,"biz_id":"g-1"}`, authHeader(t, 1))
	balance, _, _ = svc.GetBalance(context.Background(), 42)
	if balance != 10055 {
		t.Errorf("balance after duplicate grant = %d, want 10055 (no double grant)", balance)
	}
}

func TestCreditHandler_Grant_NonAdmin_403(t *testing.T) {
	svc := service.NewCreditService(newCreditHandlerTestDB(t))
	r := newCreditTestRouter(t, svc)

	w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"user_id":42,"amount":10}`, authHeader(t, 999)) // 已登录但不在 [1,2]
	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403; body=%s", w.Code, w.Body.String())
	}

	// 未登录 → 401（auth.md 契约）
	w = doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"user_id":42,"amount":10}`, "")
	if w.Code != http.StatusUnauthorized {
		t.Errorf("anon status = %d, want 401", w.Code)
	}
}

func TestCreditHandler_Grant_InvalidAmount_400(t *testing.T) {
	svc := service.NewCreditService(newCreditHandlerTestDB(t))
	r := newCreditTestRouter(t, svc)

	for _, body := range []string{
		`{"user_id":42}`,             // amount 缺失/为 0
		`{"user_id":42,"amount":-5}`, // binding required 放行负数，handler 兜底
		`{"amount":10}`,              // user_id 缺失
		`{"user_id":42,"amount":1e16}`, // 超 1e15 分上限（float→int64 溢出回绕守卫）
	} {
		w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant", body, authHeader(t, 1))
		if w.Code != http.StatusBadRequest {
			t.Errorf("body=%s status = %d, want 400", body, w.Code)
		}
	}
	// 边界内的金额仍成功
	w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"user_id":42,"amount":1e15}`, authHeader(t, 1))
	if w.Code != http.StatusOK {
		t.Errorf("amount=1e15 status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
}

// biz_id 透传：保留前缀/超长键 → service ErrInvalidBizID → 400，零发放。
func TestCreditHandler_Grant_InvalidBizID_400(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc)

	for _, biz := range []string{"refund:x", "settle:x", strings.Repeat("k", 58)} {
		w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
			`{"user_id":42,"amount":10,"biz_id":"`+biz+`"}`, authHeader(t, 1))
		if w.Code != http.StatusBadRequest {
			t.Errorf("biz_id=%q status = %d, want 400", biz, w.Code)
		}
	}
	if balance, _, _ := svc.GetBalance(context.Background(), 42); balance != 0 {
		t.Errorf("非法 biz_id 仍发放: balance = %d, want 0", balance)
	}
}

// ── GET /v3/credits/transactions ─────────────────────────────────────

func TestCreditHandler_Transactions_PagedDescending(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	ctx := context.Background()
	// 5 笔不同 biz_id 的 grant，created_at 相同也靠 id desc 兜底倒序
	for i := range 5 {
		if _, err := svc.Grant(ctx, 42, int64(100*(i+1)), "seed-"+string(rune('a'+i)), nil); err != nil {
			t.Fatal(err)
		}
	}

	r := newCreditTestRouter(t, svc)
	w := doCreditRequest(t, r, http.MethodGet, "/v3/credits/transactions?page=1&per_page=2", "", authHeader(t, 42))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body=%s", w.Code, w.Body.String())
	}
	var resp struct {
		Data struct {
			Items      []map[string]any `json:"items"`
			Pagination struct {
				Page    int  `json:"page"`
				PerPage int  `json:"per_page"`
				Total   int  `json:"total"`
				HasNext bool `json:"has_next"`
			} `json:"pagination"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	p := resp.Data.Pagination
	if p.Page != 1 || p.PerPage != 2 || p.Total != 5 || !p.HasNext {
		t.Errorf("pagination = %+v, want page1/per2/total5/hasNext", p)
	}
	if len(resp.Data.Items) != 2 {
		t.Fatalf("items = %d, want 2", len(resp.Data.Items))
	}
	// 倒序：id 递减
	if resp.Data.Items[0]["id"].(float64) <= resp.Data.Items[1]["id"].(float64) {
		t.Errorf("items not descending by id: %v %v", resp.Data.Items[0]["id"], resp.Data.Items[1]["id"])
	}
	// 金额已转"分"（厘/100）
	if _, ok := resp.Data.Items[0]["amount"].(float64); !ok {
		t.Errorf("amount not numeric cents: %T", resp.Data.Items[0]["amount"])
	}
}

func TestCreditHandler_Transactions_InvalidPaging_400(t *testing.T) {
	svc := service.NewCreditService(newCreditHandlerTestDB(t))
	r := newCreditTestRouter(t, svc)

	w := doCreditRequest(t, r, http.MethodGet, "/v3/credits/transactions?page=0", "", authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Errorf("page=0: status = %d, want 400", w.Code)
	}
	w = doCreditRequest(t, r, http.MethodGet, "/v3/credits/transactions?per_page=999", "", authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Errorf("per_page=999: status = %d, want 400", w.Code)
	}
}
