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

	"app/internal/dto"
	"app/internal/model"
	"app/internal/service"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ---------- mock UserService ----------

type mockUserService struct {
	authenticateFn func(username, password string) (*model.User, error)
	createTokensFn func(u *model.User) (*service.Tokens, error)
	createUserFn   func(username, password, email, emailCode string) (*model.User, *model.Profile, error)
	getByIDFn      func(userID uint) (*model.User, *model.Profile, error)
	logoutFn       func(userID uint)
	refreshFn      func(refreshToken string) (*service.Tokens, error)
	userToDictFn   func(u *model.User, p *model.Profile) map[string]any
}

func (m *mockUserService) Authenticate(username, password string) (*model.User, error) {
	return m.authenticateFn(username, password)
}

func (m *mockUserService) CreateTokens(u *model.User) (*service.Tokens, error) {
	if m.createTokensFn != nil {
		return m.createTokensFn(u)
	}
	return &service.Tokens{AccessToken: "access", RefreshToken: "refresh"}, nil
}

func (m *mockUserService) CreateUser(username, password, email, emailCode string) (*model.User, *model.Profile, error) {
	return m.createUserFn(username, password, email, emailCode)
}

func (m *mockUserService) GetByID(userID uint) (*model.User, *model.Profile, error) {
	return m.getByIDFn(userID)
}

func (m *mockUserService) Logout(userID uint) {
	if m.logoutFn != nil {
		m.logoutFn(userID)
	}
}

func (m *mockUserService) RefreshTokens(refreshToken string) (*service.Tokens, error) {
	return m.refreshFn(refreshToken)
}

func (m *mockUserService) UserToDict(u *model.User, p *model.Profile) map[string]any {
	if m.userToDictFn != nil {
		return m.userToDictFn(u, p)
	}
	return map[string]any{"id": u.ID, "username": u.Username}
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
}

func TestLogin_InvalidCredentials(t *testing.T) {
	svc := &mockUserService{
		authenticateFn: func(username, password string) (*model.User, error) {
			return nil, service.ErrInvalidCredentials
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
		createTokensFn: func(u *model.User) (*service.Tokens, error) {
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
		createUserFn: func(username, password, email, emailCode string) (*model.User, *model.Profile, error) {
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
		createUserFn: func(username, password, email, emailCode string) (*model.User, *model.Profile, error) {
			return nil, nil, service.ErrUserExists
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
		createUserFn: func(username, password, email, emailCode string) (*model.User, *model.Profile, error) {
			return nil, nil, service.ErrEmailExists
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
		createUserFn: func(username, password, email, emailCode string) (*model.User, *model.Profile, error) {
			return nil, nil, service.ErrInvalidEmailCode
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
		createUserFn: func(username, password, email, emailCode string) (*model.User, *model.Profile, error) {
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
	c.Set("user_id", uint(7))
	h.Me(c)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
}

func TestMe_UserNotFound(t *testing.T) {
	svc := &mockUserService{
		getByIDFn: func(userID uint) (*model.User, *model.Profile, error) {
			return nil, nil, service.ErrUserNotFound
		},
	}
	h := NewUserHandler(svc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/me", nil)
	c.Set("user_id", uint(99))
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
	c.Set("user_id", uint(42))
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
		refreshFn: func(refreshToken string) (*service.Tokens, error) {
			return &service.Tokens{AccessToken: "new-access", RefreshToken: "new-refresh"}, nil
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
		refreshFn: func(refreshToken string) (*service.Tokens, error) {
			return nil, service.ErrInvalidToken
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
		refreshFn: func(refreshToken string) (*service.Tokens, error) {
			return &service.Tokens{}, nil
		},
	}
	h := NewUserHandler(svc)

	// 缺少 refresh_token 字段
	body, _ := json.Marshal(map[string]string{})
	w := doRequest(h.RefreshToken, http.MethodPost, "/refresh-token", body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// ---------- 辅助 ----------

func gormModel(id uint) gorm.Model {
	return gorm.Model{ID: id}
}
