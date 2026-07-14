package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// mockWSService 记录调用情况，供 HandleWS 生命周期断言。
// WSReceiver 实现为真实循环：持续 read 直到客户端断开，从而触发 handler 的清理路径。
type mockWSService struct {
	mu sync.Mutex

	handleFirstCalled int
	removeVisitorArgs []string
	publishCountCalls int
}

func newMock() *mockWSService {
	return &mockWSService{}
}

func (m *mockWSService) ReadMsg(ctx context.Context, conn *websocket.Conn, msg any) error {
	// 注入首条 visitor_id 消息，模拟真实客户端握手。
	*(msg.(*map[string]any)) = map[string]any{
		"type":       "visitor_id",
		"visitor_id": "visitor-123",
	}
	return nil
}

func (m *mockWSService) HandleFirstMessage(ctx context.Context, conn *websocket.Conn, msg map[string]any) (bool, error) {
	m.mu.Lock()
	m.handleFirstCalled++
	m.mu.Unlock()
	// 回写一条 count 帧，确保 SendMsg 路径畅通。
	_ = conn.Write(ctx, websocket.MessageText, []byte(`{"type":"count","count":1}`))
	// 真实 service.HandleFirstMessage 在注册后会调用 PublishCount 广播，此处保持一致。
	_ = m.PublishCount(ctx)
	return true, nil
}

func (m *mockWSService) RedisListener(ctx context.Context, conn *websocket.Conn) error {
	<-ctx.Done()
	return nil
}

// WSReceiver 持续读取直到连接断开（与真实实现一致），断开后返回 error 触发 handler 清理。
func (m *mockWSService) WSReceiver(ctx context.Context, conn *websocket.Conn) error {
	for {
		var msg map[string]any
		if err := wsjson.Read(ctx, conn, &msg); err != nil {
			return err
		}
		if msg["type"] == "ping" {
			_ = conn.Write(ctx, websocket.MessageText, []byte(`{"type":"pong"}`))
		}
	}
}

func (m *mockWSService) RemoveVisitor(ctx context.Context, visitorId string) error {
	m.mu.Lock()
	m.removeVisitorArgs = append(m.removeVisitorArgs, visitorId)
	m.mu.Unlock()
	return nil
}

func (m *mockWSService) PublishCount(ctx context.Context) error {
	m.mu.Lock()
	m.publishCountCalls++
	m.mu.Unlock()
	return nil
}

func (m *mockWSService) removals() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.removeVisitorArgs)
}

func (m *mockWSService) publishCalls() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.publishCountCalls
}

func (m *mockWSService) firstCalls() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.handleFirstCalled
}

// TestHandleWS_Lifecycle 端到端验证完整的连接生命周期：
//  1. HandleFirstMessage 被调用一次;
//  2. 客户端断开后，RemoveVisitor + PublishCount 被调用 —— 原实现缺失此清理，导致访客计数只增不减。
//
// 通过 httptest.Server + coder/websocket 真实客户端驱动，gin 路由挂载 WSHandler。
func TestHandleWS_Lifecycle(t *testing.T) {
	mock := newMock()
	h := NewWSHandler(mock)

	engine := gin.New()
	group := engine.Group("/api/v3")
	h.RegisterRoutes(group)

	srv := httptest.NewServer(engine)
	defer srv.Close()

	wsURL := strings.Replace(srv.URL, "http", "ws", 1) + "/api/v3/public/ws"

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}

	// 读掉首条 count 响应，确认握手完成。
	if _, _, err := conn.Read(ctx); err != nil {
		t.Fatalf("read initial count frame: %v", err)
	}

	if got := mock.firstCalls(); got != 1 {
		t.Errorf("HandleFirstMessage calls = %d, want 1", got)
	}

	// 模拟客户端断开：关闭连接应触发 handler 的 finally 清理。
	if err := conn.Close(websocket.StatusNormalClosure, ""); err != nil {
		t.Fatalf("close client: %v", err)
	}

	// 给 handler 的 cleanup 留出执行时间。
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if mock.removals() == 1 && mock.publishCalls() == 2 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	if got := mock.removals(); got != 1 {
		t.Errorf("RemoveVisitor calls = %d, want 1 (访客应在断开时清理)", got)
	}
	if got := mock.removeVisitorArgs[0]; got != "visitor-123" {
		t.Errorf("RemoveVisitor visitor_id = %q, want visitor-123", got)
	}
	// PublishCount 应在 HandleFirstMessage(注册后) 与 disconnect(清理后) 各调用一次。
	if got := mock.publishCalls(); got != 2 {
		t.Errorf("PublishCount calls = %d, want 2 (注册 + 断开各一次)", got)
	}
}

// TestHandleWS_NoVisitorId 首条消息不含 visitor_id 时，断开后不应清理（无访客可删）。
func TestHandleWS_NoVisitorId(t *testing.T) {
	mock := &mockWSServiceNoVisitor{}
	h := NewWSHandler(mock)

	engine := gin.New()
	group := engine.Group("/api/v3")
	h.RegisterRoutes(group)

	srv := httptest.NewServer(engine)
	defer srv.Close()

	wsURL := strings.Replace(srv.URL, "http", "ws", 1) + "/api/v3/public/ws"

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}

	if _, _, err := conn.Read(ctx); err != nil {
		t.Fatalf("read initial frame: %v", err)
	}

	if err := conn.Close(websocket.StatusNormalClosure, ""); err != nil {
		t.Fatalf("close: %v", err)
	}

	time.Sleep(300 * time.Millisecond)

	if mock.removals() != 0 {
		t.Errorf("RemoveVisitor calls = %d, want 0 (未注册访客不应清理)", mock.removals())
	}
}

// mockWSServiceNoVisitor 注入非 visitor_id 的首条消息（如 ping），
// 且 HandleFirstMessage 返回 registered=false，断开后不应触发清理。
type mockWSServiceNoVisitor struct {
	mockWSService
}

func (m *mockWSServiceNoVisitor) ReadMsg(ctx context.Context, conn *websocket.Conn, msg any) error {
	*(msg.(*map[string]any)) = map[string]any{"type": "ping"}
	return nil
}

func (m *mockWSServiceNoVisitor) HandleFirstMessage(ctx context.Context, conn *websocket.Conn, msg map[string]any) (bool, error) {
	m.mu.Lock()
	m.handleFirstCalled++
	m.mu.Unlock()
	_ = conn.Write(ctx, websocket.MessageText, []byte(`{"type":"count","count":0}`))
	return false, nil
}

var _ = http.StatusOK
