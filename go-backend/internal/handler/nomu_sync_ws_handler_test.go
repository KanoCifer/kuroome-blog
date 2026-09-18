package handler

import (
	"context"
	"encoding/json"
	"io"
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
	"github.com/KanoCifer/kuroome-blog/internal/infra/pubsub"
	"github.com/KanoCifer/kuroome-blog/internal/middleware"
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
	dispatcher := pubsub.NewDispatcher(rdb)
	t.Cleanup(func() { _ = dispatcher.Close(); _ = rdb.Close(); mr.Close() })
	bus := syncbus.NewSyncBus(rdb, dispatcher)
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

	h := NewNomuSyncWSHandlerForTest(bus)
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

	h := NewNomuSyncWSHandlerForTest(bus)
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

// TestSyncWS_CollectionPoolFlow A 写入池 → 两设备收到池变更 → B 认领并清除拿到条目。
func TestSyncWS_CollectionPoolFlow(t *testing.T) {
	withTestSecret(t)
	bus, _ := newSyncTestBus(t)

	h := NewNomuSyncWSHandlerForTest(bus)
	engine := gin.New()
	h.RegisterRoutes(engine.Group("/v3"))
	srv := httptest.NewServer(engine)
	defer srv.Close()

	tokenA, _ := jwt.GenerateToken(7, time.Now().Add(time.Hour))
	connA := dialSyncWS(t, srv.URL, tokenA, "A")
	defer connA.Close(websocket.StatusNormalClosure, "")
	connB := dialSyncWS(t, srv.URL, tokenA, "B")
	defer connB.Close(websocket.StatusNormalClosure, "")
	waitForOnline(t, bus, 7)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// A 写入采集快照。
	if err := wsjson.Write(ctx, connA, map[string]any{
		"type": "collection_put", "id": "s1", "source": "1688",
		"payload": json.RawMessage(`{"title":"x"}`), "requestId": "r1",
	}); err != nil {
		t.Fatalf("write collection_put: %v", err)
	}
	ok := readFrameType(t, ctx, connA, "collection_put_ok")
	if ok["id"] != "s1" || ok["requestId"] != "r1" {
		t.Fatalf("collection_put_ok = %+v", ok)
	}

	// B 收到池变更通知（put）。
	if upd := readCollectionKind(t, ctx, connB, "put"); upd["id"] != "s1" {
		t.Fatalf("B update = %+v, want id=s1 kind=put", upd)
	}

	// B 列全池，应看到 A 写入的 s1。
	if err := wsjson.Write(ctx, connB, map[string]any{"type": "collection_list"}); err != nil {
		t.Fatalf("write collection_list: %v", err)
	}
	list := readFrameType(t, ctx, connB, "collection_list_result")
	snaps, _ := list["snapshots"].([]any)
	if list["ok"] != true || len(snaps) != 1 {
		t.Fatalf("collection_list_result = %+v, want ok with 1 snapshot", list)
	}
	if first, _ := snaps[0].(map[string]any); first["id"] != "s1" {
		t.Fatalf("listed snapshot = %+v, want id=s1", snaps[0])
	}

	// B 认领并清除。
	if err := wsjson.Write(ctx, connB, map[string]any{"type": "collection_claim_clear", "id": "s1"}); err != nil {
		t.Fatalf("write claim_clear: %v", err)
	}
	res := readFrameType(t, ctx, connB, "collection_claim_clear_result")
	if res["ok"] != true {
		t.Fatalf("claim_clear result = %+v, want ok", res)
	}
	snap, _ := res["snapshot"].(map[string]any)
	if snap == nil || snap["id"] != "s1" || snap["name"] != "A" {
		t.Fatalf("claimed snapshot = %+v, want id=s1 name=A (写入方设备名)", snap)
	}
	if at, _ := snap["captured_at"].(float64); at <= 0 {
		t.Fatalf("captured_at = %v, want a positive unix ts", snap["captured_at"])
	}

	// A 收到摘除通知（A 也会先收到自己写的 put，跳过）。
	if upd := readCollectionKind(t, ctx, connA, "claim_clear"); upd["id"] != "s1" {
		t.Fatalf("A update = %+v, want id=s1 kind=claim_clear", upd)
	}
}

// readFrameType 读取连接上的帧直到指定 type（投递与池通知可能交错），超时即失败。
func readFrameType(t *testing.T, ctx context.Context, conn *websocket.Conn, want string) map[string]any {
	t.Helper()
	for {
		var frame map[string]any
		if err := wsjson.Read(ctx, conn, &frame); err != nil {
			t.Fatalf("read frame waiting for %s: %v", want, err)
		}
		if frame["type"] == want {
			return frame
		}
	}
}

// readCollectionKind 读取池变更帧直到 kind 匹配。
func readCollectionKind(t *testing.T, ctx context.Context, conn *websocket.Conn, kind string) map[string]any {
	t.Helper()
	for {
		frame := readFrameType(t, ctx, conn, "collection_update")
		if upd, _ := frame["update"].(map[string]any); upd["kind"] == kind {
			return upd
		}
	}
}

// TestSyncWS_RequiresToken 缺 token / device_id 时握手失败。
func TestSyncWS_RequiresToken(t *testing.T) {
	withTestSecret(t)
	bus, _ := newSyncTestBus(t)
	h := NewNomuSyncWSHandlerForTest(bus)
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

// TestSyncWS_AuthFailRateLimit 模拟 Nomu 旧版 ws bug 场景:同一 IP 拿错误 token
// 反复重连,期望前 5 次返回 401 + code=token_expired,第 6 次起 429 + code=
// too_many_auth_failures + Retry-After 头。
//
// 用 miniredis 作为真实 Redis 替身,让 limiter 走完 INCR+TTL 全流程。bus 与
// limiter 共用一个 miniredis(addr 一致)以模拟生产环境行为。
func TestSyncWS_AuthFailRateLimit(t *testing.T) {
	withTestSecret(t)

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	t.Cleanup(mr.Close)

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	dispatcher := pubsub.NewDispatcher(rdb)
	t.Cleanup(func() { _ = dispatcher.Close() })
	bus := syncbus.NewSyncBus(rdb, dispatcher)
	bus.Register(syncbus.DuplicateSnapshotHandler{})

	limiter := middleware.NewAuthFailLimiter(rdb, "nomu_ws_auth_fail_test")
	h := NewNomuSyncWSHandler(bus, limiter)
	engine := gin.New()
	h.RegisterRoutes(engine.Group("/v3"))
	srv := httptest.NewServer(engine)
	defer srv.Close()

	wsBase := strings.Replace(srv.URL, "http", "ws", 1) + "/v3/nomu/sync/ws?token=invalid&device_id=B"

	for i := 1; i <= 5; i++ {
		got := dialExpectStatus(t, wsBase)
		if got.status != 401 {
			t.Fatalf("attempt %d: status = %d, want 401", i, got.status)
		}
		if got.code != "token_expired" {
			t.Fatalf("attempt %d: code = %q, want token_expired", i, got.code)
		}
	}

	// 第 6 次: 已超阈值,期待 429。
	got := dialExpectStatus(t, wsBase)
	if got.status != 429 {
		t.Fatalf("attempt 6: status = %d, want 429", got.status)
	}
	if got.code != "too_many_auth_failures" {
		t.Fatalf("attempt 6: code = %q, want too_many_auth_failures", got.code)
	}
	if got.retryAfter == "" {
		t.Fatal("attempt 6: missing Retry-After header")
	}
}

// dialExpectStatus dial ws URL,服务端在 upgrade 前返 401/429 等普通 HTTP 响应,
// 读取 status / body.code / Retry-After 便于断言。
type dialResult struct {
	status     int
	code       string
	retryAfter string
}

func dialExpectStatus(t *testing.T, wsURL string) dialResult {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// coder/websocket.Dial 在握手失败时返回 (nil, resp, err),resp 携带 401/429。
	_, resp, err := websocket.Dial(ctx, wsURL, nil)
	if err == nil {
		_ = resp.Body.Close()
		t.Fatal("dial succeeded; expected handshake rejection")
	}
	if resp == nil {
		t.Fatalf("dial err = %v, want non-nil resp", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var parsed struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}
	_ = json.Unmarshal(body, &parsed)

	return dialResult{
		status:     resp.StatusCode,
		code:       parsed.Code,
		retryAfter: resp.Header.Get("Retry-After"),
	}
}
