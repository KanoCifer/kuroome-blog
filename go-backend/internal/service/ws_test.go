package service

import (
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
