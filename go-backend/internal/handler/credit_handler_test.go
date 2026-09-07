package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
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
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
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
	if err := db.AutoMigrate(
		&model.User{}, &model.Profile{}, &model.PasskeyCredential{},
		&model.CreditWallet{}, &model.CreditTransaction{}, &model.CreditPrice{},
	); err != nil {
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
// 与 router.go 的装配一致；签发真实 HS256 JWT。db 与 svc 共用同一份 sqlite，
// 这样测试可以预 seed 用户/流水，再通过 HTTP 触发 handler。
func newCreditTestRouter(t *testing.T, svc service.Creditser, db *gorm.DB) *gin.Engine {
	t.Helper()
	old := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "credit-test-secret"}}
	t.Cleanup(func() { config.Cfg = old })

	r := gin.New()
	v3 := r.Group("/v3")
	NewCreditHandler(svc, postgres.NewUserRepo(db)).RegisterRoutes(v3,
		middleware.AuthMiddleware(), middleware.AdminMiddleware([]int{1, 2}))
	return r
}

// seedUserAndProfile 在测试库内创建一个用户 + profile（email），返回 user.ID。
// 用于 grant-by-email 用例的前置装配。
func seedUserAndProfile(t *testing.T, db *gorm.DB, email string) uint {
	t.Helper()
	u := &model.User{Name: "u", Username: email}
	if err := db.Create(u).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	e := email
	p := &model.Profile{UserID: u.ID, Email: &e}
	if err := db.Create(p).Error; err != nil {
		t.Fatalf("create profile: %v", err)
	}
	return u.ID
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
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

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
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodGet, "/v3/credits/balance", "", "")
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

// ── POST /v3/admin/credits/grant ─────────────────────────────────────

func TestCreditHandler_Grant_IncreasesBalanceAndLogsTx(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

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
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

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
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

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
	r := newCreditTestRouter(t, svc, db)

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

	r := newCreditTestRouter(t, svc, db)
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
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodGet, "/v3/credits/transactions?page=0", "", authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Errorf("page=0: status = %d, want 400", w.Code)
	}
	w = doCreditRequest(t, r, http.MethodGet, "/v3/credits/transactions?per_page=999", "", authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Errorf("per_page=999: status = %d, want 400", w.Code)
	}
}

// ── POST /v3/admin/credits/grant — email target (task-557) ────────────

// 通过 email 命中 → 解析到 user.ID 后正常发放到该账户。
func TestCreditHandler_Grant_ByEmail_Success(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	uid := seedUserAndProfile(t, db, "alice@example.com")
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"email":"alice@example.com","amount":42.50,"biz_id":"email-1"}`, authHeader(t, 1))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}

	balance, _, err := svc.GetBalance(context.Background(), uid)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 4250 {
		t.Errorf("balance = %d, want 4250", balance)
	}

	var tx model.CreditTransaction
	if err := db.Where("source = ? AND biz_id = ?", "admin_grant", "email-1").First(&tx).Error; err != nil {
		t.Fatalf("grant transaction missing: %v", err)
	}
	if tx.Type != "grant" || tx.Amount != 4250 {
		t.Errorf("tx = %+v, want grant/4250", tx)
	}
}

// 同时给 user_id 与 email → user_id 优先（email 不必命中）。
func TestCreditHandler_Grant_UserIDPriorityOverEmail(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	uid := seedUserAndProfile(t, db, "bob@example.com")
	_ = uid
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"user_id":42,"email":"nobody@example.com","amount":5}`, authHeader(t, 1))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	if balance, _, _ := svc.GetBalance(context.Background(), 42); balance != 500 {
		t.Errorf("user_id=42 balance = %d, want 500", balance)
	}
}

// user_id 与 email 都没给 → 400，且响应消息明确指出缺失字段。
func TestCreditHandler_Grant_NeitherUserIDNorEmail_400(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"amount":10}`, authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "user_id or email is required") {
		t.Errorf("body = %s, want 'user_id or email is required'", w.Body.String())
	}
	if balance, _, _ := svc.GetBalance(context.Background(), 1); balance != 0 {
		t.Errorf("未指定目标仍发放: balance = %d, want 0", balance)
	}
}

// email 未命中 → 400 email not found，不误发陌生人。
func TestCreditHandler_Grant_EmailNotFound_400(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodPost, "/v3/admin/credits/grant",
		`{"email":"ghost@example.com","amount":10}`, authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "email not found") {
		t.Errorf("body = %s, want 'email not found'", w.Body.String())
	}
	if balance, _, _ := svc.GetBalance(context.Background(), 1); balance != 0 {
		t.Errorf("email 未命中仍发放: balance = %d, want 0", balance)
	}
}

// ── GET /v3/admin/credits/balance + /transactions (task-558) ──────────

// balance：email 命中 → 200，返回该用户余额。
func TestCreditHandler_AdminBalance_ByEmail_Success(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	uid := seedUserAndProfile(t, db, "carol@example.com")
	if _, err := svc.Grant(context.Background(), uid, 7777, "seed-admin-balance", nil); err != nil {
		t.Fatal(err)
	}
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodGet, "/v3/admin/credits/balance?email=carol@example.com", "", authHeader(t, 1))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	var resp struct {
		Data struct {
			Balance    float64 `json:"balance"`
			TotalSpent float64 `json:"total_spent"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Data.Balance != 77.77 || resp.Data.TotalSpent != 0 {
		t.Errorf("data = %+v, want balance=77.77 total_spent=0", resp.Data)
	}
}

// balance：user_id 命中 → 200。
func TestCreditHandler_AdminBalance_ByUserID_Success(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	uid := seedUserAndProfile(t, db, "dave@example.com")
	if _, err := svc.Grant(context.Background(), uid, 500, "seed-admin-balance-uid", nil); err != nil {
		t.Fatal(err)
	}
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodGet,
		"/v3/admin/credits/balance?user_id="+strconv.Itoa(int(uid)), "", authHeader(t, 1))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"balance":5`) {
		t.Errorf("body = %s, want balance=5", w.Body.String())
	}
}

// balance：email 未命中 → 404。
func TestCreditHandler_AdminBalance_EmailNotFound_404(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodGet, "/v3/admin/credits/balance?email=ghost@example.com", "", authHeader(t, 1))
	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404; body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "email not found") {
		t.Errorf("body = %s, want 'email not found'", w.Body.String())
	}
}

// balance：定位符都没给 → 400。
func TestCreditHandler_AdminBalance_NeitherTarget_400(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodGet, "/v3/admin/credits/balance", "", authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400; body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "user_id or email is required") {
		t.Errorf("body = %s, want 'user_id or email is required'", w.Body.String())
	}
}

// transactions：email 命中 → 200，流水属于该用户；非管理员 → 403。
func TestCreditHandler_AdminTransactions_ByEmail_And_403(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	uid := seedUserAndProfile(t, db, "erin@example.com")
	ctx := context.Background()
	for i := range 3 {
		if _, err := svc.Grant(ctx, uid, int64(100*(i+1)), "seed-admintx-"+string(rune('a'+i)), nil); err != nil {
			t.Fatal(err)
		}
	}
	r := newCreditTestRouter(t, svc, db)

	// 非管理员 → 403
	w := doCreditRequest(t, r, http.MethodGet, "/v3/admin/credits/transactions?email=erin@example.com", "", authHeader(t, 42))
	if w.Code != http.StatusForbidden {
		t.Errorf("non-admin status = %d, want 403", w.Code)
	}

	// 管理员 email 查询 → 200 且流水齐全
	w = doCreditRequest(t, r, http.MethodGet,
		"/v3/admin/credits/transactions?email=erin@example.com&page=1&per_page=2", "", authHeader(t, 1))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	var resp struct {
		Data struct {
			Items []map[string]any `json:"items"`
			Pagination struct {
				Total   int  `json:"total"`
				HasNext bool `json:"has_next"`
			} `json:"pagination"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Data.Pagination.Total != 3 || !resp.Data.Pagination.HasNext || len(resp.Data.Items) != 2 {
		t.Errorf("data = %+v, want total3/hasNext/items2", resp.Data)
	}
}

// transactions：非法分页 → 400（与 /v3/credits/transactions 同规则）。
func TestCreditHandler_AdminTransactions_InvalidPaging_400(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	svc := service.NewCreditService(db)
	uid := seedUserAndProfile(t, db, "frank@example.com")
	_ = uid
	r := newCreditTestRouter(t, svc, db)

	w := doCreditRequest(t, r, http.MethodGet,
		"/v3/admin/credits/transactions?user_id="+strconv.Itoa(int(uid))+"&page=0", "", authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Errorf("page=0 status = %d, want 400", w.Code)
	}
	w = doCreditRequest(t, r, http.MethodGet,
		"/v3/admin/credits/transactions?email=frank@example.com&per_page=999", "", authHeader(t, 1))
	if w.Code != http.StatusBadRequest {
		t.Errorf("per_page=999 status = %d, want 400", w.Code)
	}
}
