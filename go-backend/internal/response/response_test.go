package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func newCtx() (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	return c, w
}

func TestSuccess_DefaultMessage(t *testing.T) {
	c, w := newCtx()
	Success(c, gin.H{"id": 1})

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if resp.Message != "success" {
		t.Errorf("message = %q, want %q", resp.Message, "success")
	}
}

func TestSuccess_CustomMessage(t *testing.T) {
	c, w := newCtx()
	Success(c, nil, "注册成功")

	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if resp.Message != "注册成功" {
		t.Errorf("message = %q, want %q", resp.Message, "注册成功")
	}
}

func TestSuccess_NilData(t *testing.T) {
	c, w := newCtx()
	Success(c, nil)

	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if resp.Data != nil {
		t.Errorf("data = %v, want nil", resp.Data)
	}
}

func TestAPIError_DefaultStatus(t *testing.T) {
	c, w := newCtx()
	APIError(c, "bad request")

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if resp.Message != "bad request" {
		t.Errorf("message = %q, want %q", resp.Message, "bad request")
	}
	if resp.Data != nil {
		t.Errorf("data = %v, want nil", resp.Data)
	}
}

func TestAPIError_CustomStatus(t *testing.T) {
	c, w := newCtx()
	APIError(c, "not found", http.StatusNotFound)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNotFound)
	}
}
