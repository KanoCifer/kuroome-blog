package handler

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/service/syncbus"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

func newSyncTestBus(t *testing.T) (*syncbus.Bus, *miniredis.Miniredis) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close(); mr.Close() })
	bus := syncbus.New(rdb)
	bus.Register(syncbus.DuplicateSnapshotHandler{})
	return bus, mr
}

func withTestSecret(t *testing.T) {
	t.Helper()
	old := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "syncbus-test-secret"}}
	t.Cleanup(func() { config.Cfg = old })
}

func syncPayload(t *testing.T) json.RawMessage {
	t.Helper()
	raw, _ := json.Marshal(syncbus.DuplicateSnapshotPayload{
		SourceSku:        "S1",
		CapturedAt:       time.Now().Unix(),
		ExpiresAt:        time.Now().Add(time.Hour).Unix(),
		ProductDraft:     json.RawMessage(`{"partnerSku":"T1"}`),
		PublicationInput: json.RawMessage(`{"price":10}`),
	})
	return raw
}

// waitForOnline 等待设备握手完成并确保订阅就绪（presence 在连接时写入，
// 订阅在其后建立，留一小段窗口避免 push 早于 Subscribe 丢帧）。
func waitForOnline(t *testing.T, bus *syncbus.Bus, userID uint) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		devices, err := bus.Devices(context.Background(), userID)
		if err == nil && len(devices) >= 2 {
			time.Sleep(100 * time.Millisecond)
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("devices did not come online in time")
}

func dialSyncWS(t *testing.T, srvURL, token, deviceID string) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	t.Cleanup(cancel)
	wsURL := strings.Replace(srvURL, "http", "ws", 1) +
		"/v3/nomu/sync/ws?token=" + token + "&device_id=" + deviceID + "&name=" + deviceID
	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial sync ws: %v", err)
	}
	return conn
}

// TestSyncWS_ReplayAckClears 预置积压 → 连接回放投递 → 客户端 ack → 队列弹出。
func TestSyncWS_ReplayAckClears(t *testing.T) {
	withTestSecret(t)
	bus, mr := newSyncTestBus(t)
	ctx := context.Background()

	if err := bus.Publish(ctx, 7, syncbus.Envelope{
		Service: syncbus.DuplicateSnapshotService, ID: "e1", From: "A", To: "B", Payload: syncPayload(t),
	}); err != nil {
		t.Fatalf("Publish: %v", err)
	}

	h := NewNomuSyncWSHandler(bus)
	engine := gin.New()
	h.RegisterRoutes(engine.Group("/v3"))

	srv := httptest.NewServer(engine)
	defer srv.Close()

	token, err := jwt.GenerateToken(7, time.Now().Add(time.Hour))
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}

	conn := dialSyncWS(t, srv.URL, token, "B")
	defer conn.Close(websocket.StatusNormalClosure, "")

	rctx, rcancel := context.WithTimeout(ctx, 5*time.Second)
	defer rcancel()

	var env syncbus.Envelope
	if err := wsjson.Read(rctx, conn, &env); err != nil {
		t.Fatalf("read delivery: %v", err)
	}
	if env.ID != "e1" || env.Type != "delivery" {
		t.Fatalf("delivery = %+v, want id=e1 type=delivery", env)
	}

	if err := wsjson.Write(rctx, conn, map[string]any{
		"type": "ack", "service": syncbus.DuplicateSnapshotService, "id": "e1",
	}); err != nil {
		t.Fatalf("write ack: %v", err)
	}

	// ack 后服务端 LREM 异步落地，轮询队列清空。
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if !mr.Exists("nomu:sync:q:" + syncbus.DuplicateSnapshotService + ":7:B") {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if mr.Exists("nomu:sync:q:" + syncbus.DuplicateSnapshotService + ":7:B") {
		t.Fatal("queue should be cleared after ack")
	}
}

// TestSyncWS_PushDeliversOnline 在线设备通过 push 消息实时收到投递。
func TestSyncWS_PushDeliversOnline(t *testing.T) {
	withTestSecret(t)
	bus, _ := newSyncTestBus(t)

	h := NewNomuSyncWSHandler(bus)
	engine := gin.New()
	h.RegisterRoutes(engine.Group("/v3"))
	srv := httptest.NewServer(engine)
	defer srv.Close()

	// 发送端 A 与接收端 B 各自连接。
	tokenA, _ := jwt.GenerateToken(7, time.Now().Add(time.Hour))
	tokenB, _ := jwt.GenerateToken(7, time.Now().Add(time.Hour))
	connA := dialSyncWS(t, srv.URL, tokenA, "A")
	defer connA.Close(websocket.StatusNormalClosure, "")
	connB := dialSyncWS(t, srv.URL, tokenB, "B")
	defer connB.Close(websocket.StatusNormalClosure, "")

	waitForOnline(t, bus, 7)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	payload := syncPayload(t)
	if err := wsjson.Write(ctx, connA, map[string]any{
		"type": "push", "id": "e2", "to": "B",
		"service": syncbus.DuplicateSnapshotService, "payload": payload,
	}); err != nil {
		t.Fatalf("push: %v", err)
	}

	// A 收到 push_ok，B 收到 delivery。
	var ack map[string]any
	if err := wsjson.Read(ctx, connA, &ack); err != nil {
		t.Fatalf("read push_ok: %v", err)
	}
	if ack["type"] != "push_ok" {
		t.Fatalf("A frame = %+v, want push_ok", ack)
	}

	var env syncbus.Envelope
	if err := wsjson.Read(ctx, connB, &env); err != nil {
		t.Fatalf("read delivery on B: %v", err)
	}
	if env.ID != "e2" || env.To != "B" {
		t.Fatalf("delivery = %+v, want id=e2 to=B", env)
	}
}

// TestSyncWS_RequiresToken 缺 token / device_id 时握手失败。
func TestSyncWS_RequiresToken(t *testing.T) {
	withTestSecret(t)
	bus, _ := newSyncTestBus(t)
	h := NewNomuSyncWSHandler(bus)
	engine := gin.New()
	h.RegisterRoutes(engine.Group("/v3"))
	srv := httptest.NewServer(engine)
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	wsURL := strings.Replace(srv.URL, "http", "ws", 1) + "/v3/nomu/sync/ws?device_id=B"
	if _, _, err := websocket.Dial(ctx, wsURL, nil); err == nil {
		t.Fatal("dial without token should fail")
	}
}
