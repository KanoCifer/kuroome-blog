package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ---------- mock UserService ----------

type mockUserService struct {
	authenticateFn func(username, password string) (*model.User, error)
	createTokensFn func(u *model.User) (*dto.Tokens, error)
	createUserFn   func(username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error)
	getByIDFn      func(userID uint) (*model.User, *model.Profile, error)
	logoutFn       func(userID uint)
	refreshFn      func(refreshToken string) (*dto.Tokens, error)
	userToDictFn   func(u *model.User, p *model.Profile) map[string]any
}

func (m *mockUserService) Authenticate(username, password string) (*model.User, error) {
	return m.authenticateFn(username, password)
}

func (m *mockUserService) CreateTokens(u *model.User) (*dto.Tokens, error) {
	if m.createTokensFn != nil {
		return m.createTokensFn(u)
	}
	return &dto.Tokens{AccessToken: "access", RefreshToken: "refresh"}, nil
}

func (m *mockUserService) CreateUser(username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error) {
	return m.createUserFn(username, password, email, emailCode, avatarURL)
}

func (m *mockUserService) GetByID(userID uint) (*model.User, *model.Profile, error) {
	return m.getByIDFn(userID)
}

func (m *mockUserService) Logout(userID uint) {
	if m.logoutFn != nil {
		m.logoutFn(userID)
	}
}

func (m *mockUserService) RefreshTokens(refreshToken string) (*dto.Tokens, error) {
	return m.refreshFn(refreshToken)
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
		authenticateFn: func(username, password string) (*model.User, error) {
			return &model.User{Model: gormModel(1), Username: "alice"}, nil
		},
	}
	h := NewUserHandler(svc)

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
		authenticateFn: func(username, password string) (*model.User, error) {
			return nil, errs.ErrInvalidCredentials
		},
	}
	h := NewUserHandler(svc)

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
		authenticateFn: func(username, password string) (*model.User, error) {
			return &model.User{}, nil
		},
	}
	h := NewUserHandler(svc)

	w := doRequest(h.Login, http.MethodPost, "/login", []byte("not json"))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestLogin_TokenError(t *testing.T) {
	svc := &mockUserService{
		authenticateFn: func(username, password string) (*model.User, error) {
			return &model.User{Model: gormModel(1)}, nil
		},
		createTokensFn: func(u *model.User) (*dto.Tokens, error) {
			return nil, errors.New("jwt error")
		},
	}
	h := NewUserHandler(svc)

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
		createUserFn: func(username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(5), Username: username}, nil, nil
		},
	}
	h := NewUserHandler(svc)

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

func TestRegister_UserExists(t *testing.T) {
	svc := &mockUserService{
		createUserFn: func(username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error) {
			return nil, nil, errs.ErrUserExists
		},
	}
	h := NewUserHandler(svc)

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
		createUserFn: func(username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error) {
			return nil, nil, errs.ErrEmailExists
		},
	}
	h := NewUserHandler(svc)

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
		createUserFn: func(username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error) {
			return nil, nil, errs.ErrInvalidEmailCode
		},
	}
	h := NewUserHandler(svc)

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
		createUserFn: func(username, password, email, emailCode, avatarURL string) (*model.User, *model.Profile, error) {
			return &model.User{}, nil, nil
		},
	}
	h := NewUserHandler(svc)

	w := doRequest(h.Register, http.MethodPost, "/register", []byte("not json"))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// ---------- Me ----------

func TestMe_Success(t *testing.T) {
	svc := &mockUserService{
		getByIDFn: func(userID uint) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(7), Username: "alice"}, nil, nil
		},
	}
	h := NewUserHandler(svc)

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
		getByIDFn: func(userID uint) (*model.User, *model.Profile, error) {
			return nil, nil, errs.ErrUserNotFound
		},
	}
	h := NewUserHandler(svc)

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
		logoutFn: func(userID uint) { calledWith = userID },
	}
	h := NewUserHandler(svc)

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
		refreshFn: func(refreshToken string) (*dto.Tokens, error) {
			return &dto.Tokens{AccessToken: "new-access", RefreshToken: "new-refresh"}, nil
		},
	}
	h := NewUserHandler(svc)

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
		refreshFn: func(refreshToken string) (*dto.Tokens, error) {
			return nil, errs.ErrInvalidToken
		},
	}
	h := NewUserHandler(svc)

	body, _ := json.Marshal(map[string]string{"refresh_token": "bad"})
	w := doRequest(h.RefreshToken, http.MethodPost, "/refresh-token", body)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestRefreshToken_MissingField(t *testing.T) {
	svc := &mockUserService{
		refreshFn: func(refreshToken string) (*dto.Tokens, error) {
			t.Errorf("refreshFn should not be called when no token present")
			return &dto.Tokens{}, nil
		},
	}
	h := NewUserHandler(svc)

	// 缺少 refresh_token 字段且 cookie 中也没有 → 401（与 Python 行为一致）
	body, _ := json.Marshal(map[string]string{})
	w := doRequest(h.RefreshToken, http.MethodPost, "/refresh-token", body)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestRefreshToken_FromCookie(t *testing.T) {
	svc := &mockUserService{
		refreshFn: func(refreshToken string) (*dto.Tokens, error) {
			if refreshToken != "cookie-refresh" {
				t.Errorf("refreshToken = %q, want cookie-refresh", refreshToken)
			}
			return &dto.Tokens{AccessToken: "new-access", RefreshToken: "new-refresh"}, nil
		},
	}
	h := NewUserHandler(svc)

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

// ---------- 辅助 ----------

func gormModel(id uint) gorm.Model {
	return gorm.Model{ID: id}
}
