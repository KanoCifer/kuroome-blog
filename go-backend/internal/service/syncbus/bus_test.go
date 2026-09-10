package syncbus

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestBus(t *testing.T) (*Bus, *miniredis.Miniredis) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close(); mr.Close() })

	bus := New(rdb)
	bus.Register(DuplicateSnapshotHandler{})
	return bus, mr
}

func samplePayload(t *testing.T) json.RawMessage {
	t.Helper()
	raw, err := json.Marshal(DuplicateSnapshotPayload{
		SourceSku:        "S1",
		CapturedAt:       time.Now().Unix(),
		ExpiresAt:        time.Now().Add(time.Hour).Unix(),
		ProductDraft:     json.RawMessage(`{"partnerSku":"T1"}`),
		PublicationInput: json.RawMessage(`{"price":10}`),
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return raw
}

// TestPublishAckRemoves 端到端：离线投递积压 → 回放收到 → ack 后队列清空。
func TestPublishAckRemoves(t *testing.T) {
	bus, mr := newTestBus(t)
	ctx := context.Background()

	env := Envelope{Service: DuplicateSnapshotService, ID: "e1", From: "A", To: "B", Payload: samplePayload(t)}
	if err := bus.Publish(ctx, 7, env); err != nil {
		t.Fatalf("Publish: %v", err)
	}

	qk := queueKey(DuplicateSnapshotService, 7, "B")
	if !mr.Exists(qk) {
		t.Fatal("queue entry should exist before ack")
	}

	var got []Envelope
	if err := bus.Replay(ctx, 7, "B", func(e Envelope) error {
		got = append(got, e)
		return nil
	}); err != nil {
		t.Fatalf("Replay: %v", err)
	}
	if len(got) != 1 || got[0].ID != "e1" || got[0].Type != "delivery" {
		t.Fatalf("replay got %+v, want one delivery e1", got)
	}

	if err := bus.Ack(ctx, 7, "B", DuplicateSnapshotService, "e1"); err != nil {
		t.Fatalf("Ack: %v", err)
	}
	if mr.Exists(qk) {
		t.Fatal("queue should be empty after ack (弹出)")
	}
}

// TestAck_IsPerDevice 只有目标设备队列被 ack 影响。
func TestAck_IsPerDevice(t *testing.T) {
	bus, mr := newTestBus(t)
	ctx := context.Background()

	mk := func(to string) Envelope {
		return Envelope{Service: DuplicateSnapshotService, ID: "e-" + to, From: "A", To: to, Payload: samplePayload(t)}
	}
	if err := bus.Publish(ctx, 7, mk("B")); err != nil {
		t.Fatalf("Publish B: %v", err)
	}
	if err := bus.Publish(ctx, 7, mk("C")); err != nil {
		t.Fatalf("Publish C: %v", err)
	}

	if err := bus.Ack(ctx, 7, "B", DuplicateSnapshotService, "e-B"); err != nil {
		t.Fatalf("Ack: %v", err)
	}
	if mr.Exists(queueKey(DuplicateSnapshotService, 7, "B")) {
		t.Fatal("B queue should be empty")
	}
	if !mr.Exists(queueKey(DuplicateSnapshotService, 7, "C")) {
		t.Fatal("C queue should be untouched")
	}
}

// TestPublish_UnknownService 未注册服务拒绝推送。
func TestPublish_UnknownService(t *testing.T) {
	bus, _ := newTestBus(t)
	err := bus.Publish(context.Background(), 7, Envelope{Service: "nope", ID: "x", To: "B", Payload: json.RawMessage(`{}`)})
	if !errors.Is(err, ErrServiceUnknown) {
		t.Fatalf("err = %v, want ErrServiceUnknown", err)
	}
}

// TestReplay_DropsExpired 过期 payload 回放时被丢弃并从队列清除。
func TestReplay_DropsExpired(t *testing.T) {
	bus, mr := newTestBus(t)
	ctx := context.Background()

	raw, _ := json.Marshal(DuplicateSnapshotPayload{
		SourceSku:        "S1",
		ExpiresAt:        time.Now().Add(-time.Minute).Unix(),
		ProductDraft:     json.RawMessage(`{}`),
		PublicationInput: json.RawMessage(`{}`),
	})
	env := Envelope{Service: DuplicateSnapshotService, ID: "old", From: "A", To: "B", Payload: raw}
	if err := bus.Publish(ctx, 7, env); err != nil {
		// Publish 时校验即过期 → 直接拒绝，队列不应有残留。
		if !errors.Is(err, ErrExpired) {
			t.Fatalf("Publish expired err = %v, want ErrExpired", err)
		}
	}
	if mr.Exists(queueKey(DuplicateSnapshotService, 7, "B")) {
		t.Fatal("expired entry should not be queued")
	}

	// 直接写入一条过期条目，模拟「入队后过期」，回放应清除。
	raw, _ = json.Marshal(env)
	_ = bus.redis.RPush(ctx, queueKey(DuplicateSnapshotService, 7, "B"), raw).Err()
	called := false
	if err := bus.Replay(ctx, 7, "B", func(Envelope) error { called = true; return nil }); err != nil {
		t.Fatalf("Replay: %v", err)
	}
	if called {
		t.Fatal("expired entry should not be delivered")
	}
	if mr.Exists(queueKey(DuplicateSnapshotService, 7, "B")) {
		t.Fatal("expired entry should be removed on replay")
	}
}

// TestQueueCap Trim 到上限后只保留最新 queueCap 条。
func TestQueueCap(t *testing.T) {
	bus, mr := newTestBus(t)
	ctx := context.Background()
	for i := 0; i < queueCap+10; i++ {
		env := Envelope{Service: DuplicateSnapshotService, ID: "e", From: "A", To: "B", Payload: samplePayload(t)}
		if err := bus.Publish(ctx, 7, env); err != nil {
			t.Fatalf("Publish %d: %v", i, err)
		}
	}
	n, _ := mr.List(queueKey(DuplicateSnapshotService, 7, "B"))
	if len(n) != queueCap {
		t.Fatalf("queue len = %d, want %d", len(n), queueCap)
	}
}

// TestDevices_Presence 记录在线并返回名称/在线状态。
func TestDevices_Presence(t *testing.T) {
	bus, _ := newTestBus(t)
	ctx := context.Background()
	if err := bus.TouchPresence(ctx, 7, "A", "MacBook"); err != nil {
		t.Fatalf("TouchPresence: %v", err)
	}
	devices, err := bus.Devices(ctx, 7)
	if err != nil {
		t.Fatalf("Devices: %v", err)
	}
	if len(devices) != 1 || devices[0].DeviceID != "A" || devices[0].Name != "MacBook" || !devices[0].Online {
		t.Fatalf("devices = %+v", devices)
	}
}

// TestTouchPresence_EmptyNameKeepsPrevious 空名心跳不覆盖已存名字。
func TestTouchPresence_EmptyNameKeepsPrevious(t *testing.T) {
	bus, _ := newTestBus(t)
	ctx := context.Background()
	if err := bus.TouchPresence(ctx, 7, "A", "520747"); err != nil {
		t.Fatalf("TouchPresence: %v", err)
	}
	if err := bus.TouchPresence(ctx, 7, "A", ""); err != nil {
		t.Fatalf("TouchPresence empty: %v", err)
	}
	devices, err := bus.Devices(ctx, 7)
	if err != nil {
		t.Fatalf("Devices: %v", err)
	}
	if len(devices) != 1 || devices[0].Name != "520747" {
		t.Fatalf("devices = %+v, want name preserved", devices)
	}
}
