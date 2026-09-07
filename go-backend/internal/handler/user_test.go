package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/middleware"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

func init() {
	gin.SetMode(gin.TestMode)
	// user_test.go 大量用例直接用全局 config.Cfg，而 SetRefreshCookie
	// 会读 cfg.Security.CookieDomain —— 一旦 cfg 为 nil 整个测试套 panic。
	// 在测试 init 阶段注入最小占位 cfg，仅供 cookies util 不 panic。
	if config.Cfg == nil {
		config.Cfg = &config.Config{}
	}
}

// ---------- mock UserService ----------

type mockUserService struct {
	authenticateFn        func(ctx context.Context, username, password string) (*model.User, error)
	authenticateMagicFn   func(ctx context.Context, token string) (*model.User, *model.Profile, error)
	createTokensFn        func(ctx context.Context, u *model.User) (*dto.TokensResponse, error)
	createUserFn          func(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error)
	getByIDFn             func(ctx context.Context, userID uint) (*model.User, *model.Profile, error)
	getByUsernameFn       func(ctx context.Context, username string) (*model.User, *model.Profile, error)
	logoutFn              func(ctx context.Context, userID uint)
	refreshFn             func(ctx context.Context, refreshToken string) (*dto.TokensResponse, error)
	sendEmailCodeFn       func(ctx context.Context, email, mode string) bool
	sendMagicLoginEmailFn func(ctx context.Context, email, mode, deviceID string) bool
	pollNomuLoginFn       func(ctx context.Context, deviceID string) (*service.NomuLoginState, error)
	userToDictFn          func(u *model.User, p *model.Profile) map[string]any
}

func (m *mockUserService) Authenticate(ctx context.Context, username, password string) (*model.User, error) {
	return m.authenticateFn(ctx, username, password)
}

func (m *mockUserService) CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error) {
	if m.createTokensFn != nil {
		return m.createTokensFn(ctx, u)
	}
	return &dto.TokensResponse{AccessToken: "access", RefreshToken: "refresh"}, nil
}

func (m *mockUserService) CreateUser(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
	return m.createUserFn(ctx, username, password, email, emailCode, avatarURL, mode)
}

func (m *mockUserService) GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error) {
	return m.getByIDFn(ctx, userID)
}

func (m *mockUserService) GetByUsername(ctx context.Context, username string) (*model.User, *model.Profile, error) {
	if m.getByUsernameFn != nil {
		return m.getByUsernameFn(ctx, username)
	}
	return nil, nil, nil
}

func (m *mockUserService) Logout(ctx context.Context, userID uint) {
	if m.logoutFn != nil {
		m.logoutFn(ctx, userID)
	}
}

func (m *mockUserService) RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error) {
	return m.refreshFn(ctx, refreshToken)
}

func (m *mockUserService) SendEmailCode(ctx context.Context, email, mode string) bool {
	if m.sendEmailCodeFn != nil {
		return m.sendEmailCodeFn(ctx, email, mode)
	}
	return true
}

func (m *mockUserService) SendMagicLoginEmail(ctx context.Context, email, mode, deviceID string) bool {
	if m.sendMagicLoginEmailFn != nil {
		return m.sendMagicLoginEmailFn(ctx, email, mode, deviceID)
	}
	return true
}

func (m *mockUserService) PollNomuLogin(ctx context.Context, deviceID string) (*service.NomuLoginState, error) {
	if m.pollNomuLoginFn != nil {
		return m.pollNomuLoginFn(ctx, deviceID)
	}
	return nil, usererrs.ErrInvalidMagicToken
}

func (m *mockUserService) AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error) {
	if m.authenticateMagicFn != nil {
		return m.authenticateMagicFn(ctx, token)
	}
	return nil, nil, usererrs.ErrInvalidMagicToken
}

func (m *mockUserService) UserToDict(u *model.User, p *model.Profile) map[string]any {
	if m.userToDictFn != nil {
		return m.userToDictFn(u, p)
	}
	return map[string]any{
		"id":           u.ID,
		"username":     u.Username,
		"has_passkey":  u.PasskeyCredential != nil,
		"github_bound": u.GithubID != nil,
	}
}

// ---------- helpers ----------

func doRequest(h gin.HandlerFunc, method, path string, body []byte) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(method, path, bytes.NewReader(body))
	if body != nil {
		c.Request.Header.Set("Content-Type", "application/json")
	}
	h(c)
	return w
}

func jsonBody(t *testing.T, v any) []byte {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	return b
}

func parseResp(t *testing.T, body []byte) (data map[string]any, message string) {
	t.Helper()
	var resp struct {
		Data    map[string]any `json:"data"`
		Message string         `json:"message"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	return resp.Data, resp.Message
}

// findCookie 从响应中按名查找 Set-Cookie。
func findCookie(w *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range w.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

// ---------- Login ----------

func TestLogin_Success(t *testing.T) {
	svc := &mockUserService{
		authenticateFn: func(ctx context.Context, username, password string) (*model.User, error) {
			return &model.User{Model: gormModel(1), Username: "alice"}, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Login, http.MethodPost, "/login", jsonBody(t, dto.LoginRequest{
		Username: "alice",
		Password: "secret",
	}))

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	data, _ := parseResp(t, w.Body.Bytes())
	if data["access_token"] == nil {
		t.Error("expected access_token in response")
	}
	if cookie := findCookie(w, "refresh_token"); cookie == nil || cookie.Value != "refresh" {
		t.Error("expected refresh_token cookie to be set on login")
	}
	if _, ok := data["has_passkey"].(bool); !ok {
		t.Error("expected has_passkey field present in user data")
	}
	if _, ok := data["github_bound"].(bool); !ok {
		t.Error("expected github_bound field present in user data")
	}
}

func TestLogin_InvalidCredentials(t *testing.T) {
	svc := &mockUserService{
		authenticateFn: func(ctx context.Context, username, password string) (*model.User, error) {
			return nil, usererrs.ErrInvalidCredentials
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Login, http.MethodPost, "/login", jsonBody(t, dto.LoginRequest{
		Username: "alice",
		Password: "wrong",
	}))

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestLogin_InvalidBody(t *testing.T) {
	svc := &mockUserService{
		authenticateFn: func(ctx context.Context, username, password string) (*model.User, error) {
			return &model.User{}, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Login, http.MethodPost, "/login", []byte("not json"))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestLogin_TokenError(t *testing.T) {
	svc := &mockUserService{
		authenticateFn: func(ctx context.Context, username, password string) (*model.User, error) {
			return &model.User{Model: gormModel(1)}, nil
		},
		createTokensFn: func(ctx context.Context, u *model.User) (*dto.TokensResponse, error) {
			return nil, errors.New("jwt error")
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Login, http.MethodPost, "/login", jsonBody(t, dto.LoginRequest{
		Username: "alice",
		Password: "secret",
	}))

	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

// ---------- Register ----------

func TestRegister_Success(t *testing.T) {
	svc := &mockUserService{
		createUserFn: func(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(5), Username: username}, nil, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Register, http.MethodPost, "/register", jsonBody(t, dto.RegisterRequest{
		Username:  "bob",
		Password:  "secret123",
		Email:     "bob@example.com",
		EmailCode: "123456",
	}))

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	_, msg := parseResp(t, w.Body.Bytes())
	if msg != "注册成功" {
		t.Errorf("message = %q, want %q", msg, "注册成功")
	}
}

// TestRegister_Success_GrantsRegisterBonus 密码注册成功 → creditSvc.GrantRegisterBonus
// 被调用，且写入 (source=register_bonus, biz_id="register:<user_id>") 唯一流水。
// 复用 newCreditHandlerTestDB（同 handler 测试已有 sqlite harness），不另起 DB。
func TestRegister_Success_GrantsRegisterBonus(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	creditSvc := service.NewCreditService(db)

	svc := &mockUserService{
		createUserFn: func(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(42), Username: username}, nil, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, creditSvc)

	w := doRequest(h.Register, http.MethodPost, "/register", jsonBody(t, dto.RegisterRequest{
		Username:  "bob",
		Password:  "secret123",
		Email:     "bob@example.com",
		EmailCode: "123456",
	}))
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}

	bal, _, err := creditSvc.GetBalance(context.Background(), 42)
	if err != nil {
		t.Fatalf("GetBalance: %v", err)
	}
	if bal != 10000 {
		t.Errorf("balance = %d 厘, want 10000 (100 分)", bal)
	}
	var tx model.CreditTransaction
	if err := db.Where("user_id = ? AND source = ?", 42, "register_bonus").First(&tx).Error; err != nil {
		t.Fatalf("register_bonus 流水缺失: %v", err)
	}
	if tx.Amount != 10000 || tx.BizID != "register:42" {
		t.Errorf("流水 = %+v, want amount=10000 biz_id=register:42", tx)
	}
}

// TestRegister_RegisterBonus_NotGrantedOnCreateError CreateUser 失败 → 不发积分。
// 守护"失败不送"的契约：bonus 是 CreateUser 成功路径的副作用，不是注册前置检查。
func TestRegister_RegisterBonus_NotGrantedOnCreateError(t *testing.T) {
	db := newCreditHandlerTestDB(t)
	creditSvc := service.NewCreditService(db)

	svc := &mockUserService{
		createUserFn: func(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
			return nil, nil, usererrs.ErrUserExists
		},
	}
	h := NewUserHandler(svc, config.Cfg, creditSvc)

	w := doRequest(h.Register, http.MethodPost, "/register", jsonBody(t, dto.RegisterRequest{
		Username:  "bob",
		Password:  "secret123",
		Email:     "bob@example.com",
		EmailCode: "123456",
	}))
	if w.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409", w.Code)
	}
	var count int64
	if err := db.Model(&model.CreditTransaction{}).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Errorf("失败注册不该产生流水，got %d 行", count)
	}
}

func TestRegister_UserExists(t *testing.T) {
	svc := &mockUserService{
		createUserFn: func(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
			return nil, nil, usererrs.ErrUserExists
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Register, http.MethodPost, "/register", jsonBody(t, dto.RegisterRequest{
		Username:  "bob",
		Password:  "secret123",
		Email:     "bob@example.com",
		EmailCode: "123456",
	}))

	if w.Code != http.StatusConflict {
		t.Errorf("status = %d, want %d", w.Code, http.StatusConflict)
	}
}

func TestRegister_EmailExists(t *testing.T) {
	svc := &mockUserService{
		createUserFn: func(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
			return nil, nil, usererrs.ErrEmailExists
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Register, http.MethodPost, "/register", jsonBody(t, dto.RegisterRequest{
		Username:  "bob",
		Password:  "secret123",
		Email:     "bob@example.com",
		EmailCode: "123456",
	}))

	if w.Code != http.StatusConflict {
		t.Errorf("status = %d, want %d", w.Code, http.StatusConflict)
	}
}

func TestRegister_InvalidEmailCode(t *testing.T) {
	svc := &mockUserService{
		createUserFn: func(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
			return nil, nil, usererrs.ErrInvalidEmailCode
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Register, http.MethodPost, "/register", jsonBody(t, dto.RegisterRequest{
		Username:  "bob",
		Password:  "secret123",
		Email:     "bob@example.com",
		EmailCode: "wrong",
	}))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestRegister_InvalidBody(t *testing.T) {
	svc := &mockUserService{
		createUserFn: func(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error) {
			return &model.User{}, nil, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Register, http.MethodPost, "/register", []byte("not json"))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// ---------- EmailCode ----------

func TestEmailCode_Success(t *testing.T) {
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.EmailCode, http.MethodPost, "/email/code",
		jsonBody(t, dto.EmailCodeRequest{Email: "alice@example.com"}))

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestEmailCode_InvalidEmail(t *testing.T) {
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.EmailCode, http.MethodPost, "/email/code",
		jsonBody(t, dto.EmailCodeRequest{Email: "not-an-email"}))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestEmailCode_BadMode(t *testing.T) {
	// oneof 拦截非法 mode（h5 不是 blog / nomu）。
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.EmailCode, http.MethodPost, "/email/code",
		jsonBody(t, dto.EmailCodeRequest{Email: "alice@example.com", Mode: "h5"}))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 (invalid mode)", w.Code)
	}
}

func TestEmailCode_PassesModeToService(t *testing.T) {
	// handler 应把 req.Mode 透传给 service（空 → ""，blog / nomu 原样）。
	cases := []struct {
		name     string
		mode     string
		wantMode string
	}{
		{"missing defaults empty", "", ""},
		{"blog", "blog", "blog"},
		{"nomu", "nomu", "nomu"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			done := make(chan string, 1)
			svc := &mockUserService{
				sendEmailCodeFn: func(_ context.Context, _ string, m string) bool {
					done <- m
					return true
				},
			}
			h := NewUserHandler(svc, config.Cfg, nil)

			w := doRequest(h.EmailCode, http.MethodPost, "/email/code",
				jsonBody(t, dto.EmailCodeRequest{Email: "alice@example.com", Mode: c.mode}))

			if w.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", w.Code)
			}
			select {
			case gotMode := <-done:
				if gotMode != c.wantMode {
					t.Errorf("service mode = %q, want %q", gotMode, c.wantMode)
				}
			case <-time.After(2 * time.Second):
				t.Fatal("timed out waiting for service call")
			}
		})
	}
}

// ---------- Register mode passthrough ----------

func TestRegister_PassesModeToService(t *testing.T) {
	// handler 应把 req.Mode 透传给 service.CreateUser，方便 register
	// 时按 mode 验证 email_code。
	cases := []string{"", "blog", "nomu"}
	for _, mode := range cases {
		t.Run(mode, func(t *testing.T) {
			done := make(chan string, 1)
			svc := &mockUserService{
				createUserFn: func(_ context.Context, _ string, _ string, _ string, _ string, _ string, m string) (*model.User, *model.Profile, error) {
					done <- m
					return &model.User{Model: gormModel(1), Username: "alice"}, nil, nil
				},
			}
			h := NewUserHandler(svc, config.Cfg, nil)

			w := doRequest(h.Register, http.MethodPost, "/register",
				jsonBody(t, dto.RegisterRequest{
					Username:  "alice",
					Password:  "secret123",
					Email:     "alice@example.com",
					EmailCode: "123456",
					Mode:      mode,
				}))

			if w.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", w.Code)
			}
			select {
			case gotMode := <-done:
				if gotMode != mode {
					t.Errorf("service mode = %q, want %q", gotMode, mode)
				}
			case <-time.After(2 * time.Second):
				t.Fatal("timed out waiting for service call")
			}
		})
	}
}

func TestRegister_BadMode(t *testing.T) {
	// oneof 拦截非法 mode。
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.Register, http.MethodPost, "/register",
		jsonBody(t, dto.RegisterRequest{
			Username:  "alice",
			Password:  "secret123",
			Email:     "alice@example.com",
			EmailCode: "123456",
			Mode:      "h5",
		}))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 (invalid mode)", w.Code)
	}
}

// ---------- Me ----------

func TestMe_Success(t *testing.T) {
	svc := &mockUserService{
		getByIDFn: func(ctx context.Context, userID uint) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(7), Username: "alice"}, nil, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/me", nil)
	c.Set("user_id", 7)
	h.Me(c)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
}

func TestMe_UserNotFound(t *testing.T) {
	svc := &mockUserService{
		getByIDFn: func(ctx context.Context, userID uint) (*model.User, *model.Profile, error) {
			return nil, nil, usererrs.ErrUserNotFound
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/me", nil)
	c.Set("user_id", 99)
	h.Me(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNotFound)
	}
}

// ---------- Logout ----------

func TestLogout_CallsService(t *testing.T) {
	var calledWith uint
	svc := &mockUserService{
		logoutFn: func(ctx context.Context, userID uint) { calledWith = userID },
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodPost, "/logout", nil)
	c.Set("user_id", 42)
	h.Logout(c)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if calledWith != 42 {
		t.Errorf("Logout called with %d, want 42", calledWith)
	}
}

// ---------- RefreshToken ----------

func TestRefreshToken_Success(t *testing.T) {
	svc := &mockUserService{
		refreshFn: func(ctx context.Context, refreshToken string) (*dto.TokensResponse, error) {
			return &dto.TokensResponse{AccessToken: "new-access", RefreshToken: "new-refresh"}, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	body, _ := json.Marshal(map[string]string{"refresh_token": "old-refresh"})
	w := doRequest(h.RefreshToken, http.MethodPost, "/refresh-token", body)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	data, _ := parseResp(t, w.Body.Bytes())
	if data["access_token"] != "new-access" {
		t.Errorf("access_token = %v, want new-access", data["access_token"])
	}
}

func TestRefreshToken_InvalidToken(t *testing.T) {
	svc := &mockUserService{
		refreshFn: func(ctx context.Context, refreshToken string) (*dto.TokensResponse, error) {
			return nil, usererrs.ErrInvalidToken
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	body, _ := json.Marshal(map[string]string{"refresh_token": "bad"})
	w := doRequest(h.RefreshToken, http.MethodPost, "/refresh-token", body)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestRefreshToken_MissingField(t *testing.T) {
	svc := &mockUserService{
		refreshFn: func(ctx context.Context, refreshToken string) (*dto.TokensResponse, error) {
			t.Errorf("refreshFn should not be called when no token present")
			return &dto.TokensResponse{}, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	// 缺少 refresh_token 字段且 cookie 中也没有 → 401（与 Python 行为一致）
	body, _ := json.Marshal(map[string]string{})
	w := doRequest(h.RefreshToken, http.MethodPost, "/refresh-token", body)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestRefreshToken_FromCookie(t *testing.T) {
	svc := &mockUserService{
		refreshFn: func(ctx context.Context, refreshToken string) (*dto.TokensResponse, error) {
			if refreshToken != "cookie-refresh" {
				t.Errorf("refreshToken = %q, want cookie-refresh", refreshToken)
			}
			return &dto.TokensResponse{AccessToken: "new-access", RefreshToken: "new-refresh"}, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	req, _ := http.NewRequest(http.MethodPost, "/refresh-token", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: "cookie-refresh"})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	h.RefreshToken(c)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	data, _ := parseResp(t, w.Body.Bytes())
	if data["access_token"] != "new-access" {
		t.Errorf("access_token = %v, want new-access", data["access_token"])
	}
}

// ---------- MagicLoginEmail ----------

func TestMagicLoginEmail_InvalidEmail(t *testing.T) {
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginEmail, http.MethodPost, "/email/magic-login",
		jsonBody(t, dto.MagicLoginEmailRequest{Email: "not-an-email", Mode: "blog"}))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestMagicLoginEmail_MissingMode(t *testing.T) {
	// mode 字段为 DTO binding required，缺省直接 400。
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginEmail, http.MethodPost, "/email/magic-login",
		jsonBody(t, map[string]string{"email": "alice@example.com"}))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 (missing mode)", w.Code)
	}
}

func TestMagicLoginEmail_BadMode(t *testing.T) {
	// oneof 拦截非法 mode。
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginEmail, http.MethodPost, "/email/magic-login",
		jsonBody(t, dto.MagicLoginEmailRequest{Email: "alice@example.com", Mode: "h5"}))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 (invalid mode)", w.Code)
	}
}

func TestMagicLoginEmail_AlwaysReturns200(t *testing.T) {
	// 邮箱不存在时 service 静默 true，handler 仍 200，避免枚举。
	svc := &mockUserService{
		sendMagicLoginEmailFn: func(_ context.Context, _ string, _ string, _ string) bool { return true },
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginEmail, http.MethodPost, "/email/magic-login",
		jsonBody(t, dto.MagicLoginEmailRequest{Email: "nobody@example.com", Mode: "blog"}))

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestMagicLoginEmail_PassesModeToService(t *testing.T) {
	// handler 应把 req.Mode 透传给 service（blog / nomu）。
	// handler 用 go 调 service，所以通过 channel 等异步落点。
	cases := []string{"blog", "nomu"}
	for _, mode := range cases {
		t.Run(mode, func(t *testing.T) {
			done := make(chan string, 1)
			svc := &mockUserService{
				sendMagicLoginEmailFn: func(_ context.Context, _ string, m string, _ string) bool {
					done <- m
					return true
				},
			}
			h := NewUserHandler(svc, config.Cfg, nil)

			w := doRequest(h.MagicLoginEmail, http.MethodPost, "/email/magic-login",
				jsonBody(t, dto.MagicLoginEmailRequest{Email: "alice@example.com", Mode: mode}))

			if w.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", w.Code)
			}
			select {
			case gotMode := <-done:
				if gotMode != mode {
					t.Errorf("service mode = %q, want %q", gotMode, mode)
				}
			case <-time.After(2 * time.Second):
				t.Fatal("timed out waiting for service call")
			}
		})
	}
}

// ---------- MagicLoginConsume ----------

// TestMagicLoginConsume_BlogSuccess  blog 模式回调页 → 200 + access/refresh/user + cookie。
func TestMagicLoginConsume_BlogSuccess(t *testing.T) {
	svc := &mockUserService{
		authenticateMagicFn: func(_ context.Context, token string) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(8), Username: "alice"}, nil, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginConsume, http.MethodPost, "/magic-login/consume",
		jsonBody(t, dto.MagicLoginConsumeRequest{Token: "abc-token:blog", Mode: "blog"}))

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	data, _ := parseResp(t, w.Body.Bytes())
	if data["access_token"] == nil {
		t.Error("expected access_token in response (blog mode)")
	}
	if cookie := findCookie(w, "refresh_token"); cookie == nil {
		t.Error("expected refresh_token cookie set on blog magic login")
	}
}

// TestMagicLoginConsume_NomuSuccess  nomu 模式回调页 → 200 + "登录已确认"，不返 token、不写 cookie。
func TestMagicLoginConsume_NomuSuccess(t *testing.T) {
	svc := &mockUserService{
		authenticateMagicFn: func(_ context.Context, token string) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(8), Username: "alice"}, nil, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginConsume, http.MethodPost, "/nomu/magic-login",
		jsonBody(t, dto.MagicLoginConsumeRequest{Token: "abc-token:nomu", Mode: "nomu"}))

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	data, msg := parseResp(t, w.Body.Bytes())
	if msg != "登录已确认" {
		t.Errorf("message = %q, want 登录已确认", msg)
	}
	if data != nil {
		if _, ok := data["access_token"]; ok {
			t.Error("nomu mode should NOT expose access_token in response")
		}
	}
	if cookie := findCookie(w, "refresh_token"); cookie != nil {
		t.Error("nomu mode should NOT set refresh_token cookie")
	}
}

// TestMagicLoginConsume_MissingToken 空 token 直接 400（binding required）。
func TestMagicLoginConsume_MissingToken(t *testing.T) {
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginConsume, http.MethodPost, "/magic-login/consume",
		jsonBody(t, dto.MagicLoginConsumeRequest{Token: ""}))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

// TestMagicLoginConsume_InvalidToken  无效 token → 401。
func TestMagicLoginConsume_InvalidToken(t *testing.T) {
	svc := &mockUserService{
		authenticateMagicFn: func(_ context.Context, _ string) (*model.User, *model.Profile, error) {
			return nil, nil, usererrs.ErrInvalidMagicToken
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginConsume, http.MethodPost, "/magic-login/consume",
		jsonBody(t, dto.MagicLoginConsumeRequest{Token: "bad", Mode: "blog"}))

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

// TestMagicLoginConsume_UserNotFound  用户不存在 → 404。
func TestMagicLoginConsume_UserNotFound(t *testing.T) {
	svc := &mockUserService{
		authenticateMagicFn: func(_ context.Context, _ string) (*model.User, *model.Profile, error) {
			return nil, nil, usererrs.ErrUserNotFound
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginConsume, http.MethodPost, "/magic-login/consume",
		jsonBody(t, dto.MagicLoginConsumeRequest{Token: "expired", Mode: "blog"}))

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}

// TestMagicLoginConsume_DefaultMode  缺省 mode → 走 blog 分支（cookie + token）。
func TestMagicLoginConsume_DefaultMode(t *testing.T) {
	svc := &mockUserService{
		authenticateMagicFn: func(_ context.Context, _ string) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(1), Username: "alice"}, nil, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := doRequest(h.MagicLoginConsume, http.MethodPost, "/magic-login/consume",
		jsonBody(t, dto.MagicLoginConsumeRequest{Token: "abc-token"}))

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	if cookie := findCookie(w, "refresh_token"); cookie == nil {
		t.Error("default mode should fall back to blog → cookie expected")
	}
}

// ---------- PollNomuLogin ----------

// TestPollNomuLogin_Done 轮询到 done 槽位 → 200 + 状态 + token。
func TestPollNomuLogin_Done(t *testing.T) {
	svc := &mockUserService{
		pollNomuLoginFn: func(_ context.Context, deviceID string) (*service.NomuLoginState, error) {
			return &service.NomuLoginState{Status: "done", AccessToken: "acc", RefreshToken: "ref"}, nil
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/nomu/login/dev-1", nil)
	c.Params = []gin.Param{{Key: "device_id", Value: "dev-1"}}
	h.PollNomuLogin(c)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	data, _ := parseResp(t, w.Body.Bytes())
	if data["status"] != "done" {
		t.Errorf("data = %v, want status done", data)
	}
}

// TestPollNomuLogin_MissingDeviceID 缺 device_id → 400。
func TestPollNomuLogin_MissingDeviceID(t *testing.T) {
	svc := &mockUserService{}
	h := NewUserHandler(svc, config.Cfg, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/nomu/login/", nil)
	h.PollNomuLogin(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

// ---------- 辅助 ----------

func gormModel(id uint) gorm.Model {
	return gorm.Model{ID: id}
}

// ---------- 模板：日志 trace_id 断言 ----------
//
// TestLogin_LogPropagatesTraceID 演示如何在 handler 测试里捕获 slog 输
// 出并断言 trace_id 已注入。其它 handler 想加同类测试时复制本用例即可。
//
// 关键三步：
//  1. 用 logger.NewTestHandler 把全局 slog default 替换成 buffer +
//     trace_id 提取的 handler（与生产 routerHandler 等价，但不写文件）。
//  2. 用真 router + Trace() 中间件（不是 doRequest helper）跑请求，
//     让 X-Trace-Id 头经过 Trace() 写进 ctx。
//  3. 解析 buffer 末行 JSON，断言 trace_id == 期望值。
func TestLogin_LogPropagatesTraceID(t *testing.T) {
	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(logger.NewTestHandler(&buf, slog.LevelDebug))
	t.Cleanup(func() { slog.SetDefault(prev) })

	svc := &mockUserService{
		authenticateFn: func(_ context.Context, _, _ string) (*model.User, error) {
			return nil, usererrs.ErrInvalidCredentials
		},
	}
	h := NewUserHandler(svc, config.Cfg, nil)

	r := gin.New()
	r.Use(middleware.Trace())
	r.POST("/login", h.Login)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/login",
		bytes.NewReader(jsonBody(t, dto.LoginRequest{Username: "alice", Password: "wrong"})))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Trace-Id", "abc-trace")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", w.Code)
	}

	lines := bytes.Split(bytes.TrimSpace(buf.Bytes()), []byte("\n"))
	if len(lines) == 0 || len(bytes.TrimSpace(lines[len(lines)-1])) == 0 {
		t.Fatalf("no log record captured; buf = %q", buf.String())
	}
	rec := map[string]any{}
	if err := json.Unmarshal(bytes.TrimSpace(lines[len(lines)-1]), &rec); err != nil {
		t.Fatalf("unmarshal last record: %v\nraw: %s", err, buf.String())
	}
	if rec["trace_id"] != "abc-trace" {
		t.Errorf("trace_id = %v, want abc-trace; record: %v", rec["trace_id"], rec)
	}
	if rec["level"] != "WARN" {
		t.Errorf("level = %v, want WARN", rec["level"])
	}
	if rec["reason"] != "invalid_credentials" {
		t.Errorf("reason = %v, want invalid_credentials", rec["reason"])
	}
}
