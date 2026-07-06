package middleware

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	gt "github.com/golang-jwt/jwt/v5"

	"app/internal/config"
	apijwt "app/pkg/jwt"
)

func init() {
	gin.SetMode(gin.TestMode)
	config.Cfg = &config.Config{SECRET_KEY: "test-secret"}
}

// newEngine 创建一个挂载被测中间件的 gin 引擎,*httptest.NewRecorder() 发请求。
func newEngine(mw gin.HandlerFunc, next gin.HandlerFunc) (*gin.Engine, *httptest.ResponseRecorder, *http.Request) {
	r := gin.New()
	r.Use(mw)
	r.GET("/", next)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	return r, w, req
}

func setAuthToken(req *http.Request, userID int, expireIn time.Duration) {
	tok, _ := apijwt.GenerateToken(uint(userID), time.Now().Add(expireIn))
	req.Header.Set("Authorization", "Bearer "+tok)
}

// signWithKey 用指定密钥签发 HS256 令牌（不走 config），用于负面测试。
func signWithKey(key []byte, userID uint) string {
	tok := gt.NewWithClaims(gt.SigningMethodHS256, gt.RegisteredClaims{
		Subject:   strconv.FormatUint(uint64(userID), 10),
		ExpiresAt: gt.NewNumericDate(time.Now().Add(time.Hour)),
	})
	s, _ := tok.SignedString(key)
	return s
}

// ---------- AuthMiddleware ----------

func TestAuthMiddleware_NoHeader(t *testing.T) {
	var handlerCalled bool
	e, w, req := newEngine(AuthMiddleware(), func(c *gin.Context) { handlerCalled = true })
	e.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
	if handlerCalled {
		t.Error("next handler should not be called")
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	e, w, req := newEngine(AuthMiddleware(), func(c *gin.Context) {})
	req.Header.Set("Authorization", "Bearer invalid.token.value")
	e.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	var gotUserID any
	e, w, req := newEngine(AuthMiddleware(), func(c *gin.Context) {
		gotUserID, _ = c.Get("user_id")
	})
	// user_id 在 handler 里是 int 类型（strconv.Atoi）
	setAuthToken(req, 7, time.Hour)
	e.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if gotUserID != 7 {
		t.Errorf("user_id = %v (type %T), want 7", gotUserID, gotUserID)
	}
}

func TestAuthMiddleware_ExpiredToken(t *testing.T) {
	e, w, req := newEngine(AuthMiddleware(), func(c *gin.Context) {})
	setAuthToken(req, 1, -time.Hour)
	e.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

func TestAuthMiddleware_WrongKeySignature(t *testing.T) {
	// 用不同密钥签发 → 签名校验失败
	tok := signWithKey([]byte("wrong-key"), 1)
	e, w, req := newEngine(AuthMiddleware(), func(c *gin.Context) {})
	req.Header.Set("Authorization", "Bearer "+tok)
	e.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
}

// ---------- AdminMiddleware ----------

func TestAdminMiddleware_AdminUser1(t *testing.T) {
	var called bool
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("user_id", 1); c.Next() })
	r.Use(AdminMiddleware())
	r.GET("/", func(c *gin.Context) { called = true })

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	r.ServeHTTP(w, req)

	if !called {
		t.Error("admin user_id=1 should pass")
	}
}

func TestAdminMiddleware_AdminUser2(t *testing.T) {
	var called bool
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("user_id", 2); c.Next() })
	r.Use(AdminMiddleware())
	r.GET("/", func(c *gin.Context) { called = true })

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	r.ServeHTTP(w, req)

	if !called {
		t.Error("admin user_id=2 should pass")
	}
}

func TestAdminMiddleware_NonAdmin(t *testing.T) {
	r := gin.New()
	r.Use(func(c *gin.Context) { c.Set("user_id", 99); c.Next() })
	r.Use(AdminMiddleware())
	r.GET("/", func(c *gin.Context) {})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", w.Code, http.StatusForbidden)
	}
}
