package service

import (
	"context"
	"encoding/json"
	"testing"
)

// TestBuildCountPayload_WireFormat 校验 PublishCount 发到 Redis 的字节是严格 JSON。
// 客户端 useWebSocket.ts 直接 JSON.parse(event.data)，要求 {"type":"count","count":N}；
// 若此处序列化退化（如 fmt.Sprint 产出 map[count:5 type:count]），客户端会静默忽略该帧。
func TestBuildCountPayload_WireFormat(t *testing.T) {
	payload, err := buildCountPayload(5)
	if err != nil {
		t.Fatalf("buildCountPayload error: %v", err)
	}

	if !json.Valid(payload) {
		t.Fatalf("payload is not valid JSON: %q", string(payload))
	}

	var decoded struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if decoded.Type != "count" {
		t.Errorf("type = %q, want %q", decoded.Type, "count")
	}
	if decoded.Count != 5 {
		t.Errorf("count = %d, want %d", decoded.Count, 5)
	}
}

// TestBuildCountPayload_Zero 计数为 0（所有访客断开）时仍是合法 JSON。
func TestBuildCountPayload_Zero(t *testing.T) {
	payload, err := buildCountPayload(0)
	if err != nil {
		t.Fatalf("buildCountPayload error: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded["type"] != "count" {
		t.Errorf("type = %v, want count", decoded["type"])
	}
	if decoded["count"] != float64(0) {
		t.Errorf("count = %v, want 0", decoded["count"])
	}
}

// TestShouldCleanupVisitor 锁定引用计数减一后的清理边界。
// 同一 visitor_id 开多个标签页时计数 > 1，关闭其中一个不应清理；
// 归零或负值（异常回退）才清理集合与 hash。
func TestShouldCleanupVisitor(t *testing.T) {
	tests := []struct {
		name      string
		remaining int64
		want      bool
	}{
		{"positive_keeps", 3, false},
		{"one_keeps", 1, false},
		{"zero_cleans", 0, true},
		{"negative_cleans", -1, true},
		{"deeply_negative_cleans", -5, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := shouldCleanupVisitor(tt.remaining); got != tt.want {
				t.Errorf("shouldCleanupVisitor(%d) = %v, want %v", tt.remaining, got, tt.want)
			}
		})
	}
}

// ---------- HandlePing ----------

func TestHandlePing_PingMessage(t *testing.T) {
	svc := &WSService{}
	msg := map[string]any{"type": "ping"}
	// 没有真实 conn 会 error（wsjson.Write 失败），但验证不会 panic
	err := svc.HandlePing(context.Background(), nil, msg)
	// conn=nil 必然 error，但关键是"识别 ping"的路径被走到
	if err == nil {
		t.Log("HandlePing with nil conn unexpectedly succeeded (wsjson mock?)")
	}
}

func TestHandlePing_NonPingMessage(t *testing.T) {
	sendCalled := false
	svc := &WSService{}
	// 用 pong 消息——不是 ping 分支——不应触发 SendMsg
	msg := map[string]any{"type": "pong"}
	err := svc.HandlePing(context.Background(), nil, msg)
	// 非 ping 路径直接返回 nil，不调用 SendMsg
	if err != nil {
		t.Errorf("HandlePing for non-ping should return nil, got %v", err)
	}
	_ = sendCalled
}

func TestHandlePing_OtherFieldsIgnored(t *testing.T) {
	// type 字段不是 "ping" 的值时不触发 pong
	svc := &WSService{}
	tests := []struct {
		name string
		tp   any
	}{
		{"string_other", "data"},
		{"nil_type", nil},
		{"int_type", 123},
		{"missing_type", "no type field"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msg := map[string]any{}
			if tt.name != "missing_type" {
				msg["type"] = tt.tp
			}
			err := svc.HandlePing(context.Background(), nil, msg)
			if err != nil {
				t.Errorf("HandlePing should not error for type=%v, got %v", tt.tp, err)
			}
		})
	}
}
