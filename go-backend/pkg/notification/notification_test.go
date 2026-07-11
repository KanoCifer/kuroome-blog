package notification

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

// ---------------------------------------------------------------------------
// 测试 server helper
// ---------------------------------------------------------------------------

// newFeishuTestServer 返回一个模拟飞书 webhook 的 httptest.Server。
// 通过回调让断言层检验请求体。
func newFeishuTestServer(t *testing.T, wantStatus int, respBody string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if ct := r.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("Content-Type = %q, want application/json", ct)
		}
		raw, _ := io.ReadAll(r.Body)
		if !strings.HasPrefix(string(raw), "{") {
			t.Errorf("body not JSON: %s", raw)
		}
		w.WriteHeader(wantStatus)
		_, _ = w.Write([]byte(respBody))
	}))
}

// ---------------------------------------------------------------------------
// BarkChannel
// ---------------------------------------------------------------------------

func TestBarkSend_NameAndMissingKey(t *testing.T) {
	ch := NewBarkChannel()
	if ch.Name() != "bark" {
		t.Errorf("Name() = %q, want bark", ch.Name())
	}
	// 缺 device key 时直接 false，不发请求。
	ok := ch.Send(context.Background(),
		Message{Title: "t", Body: "b"},
		NotificationContext{})
	if ok {
		t.Error("expected false when BarkDeviceKey is empty")
	}
}

// ---------------------------------------------------------------------------
// FeishuChannel (card 2.0)
// ---------------------------------------------------------------------------

func TestFeishuSend_MissingWebhook(t *testing.T) {
	config.Cfg = &config.Config{Feishu: config.FeishuConfig{WebhookURL: ""}}
	ch := NewFeishuChannel()
	ok := ch.Send(context.Background(),
		Message{Title: "t", Body: "b"},
		NotificationContext{})
	if ok {
		t.Error("expected false when no webhook URL")
	}
}

func TestFeishuSend_Success(t *testing.T) {
	srv := newFeishuTestServer(t, http.StatusOK,
		`{"code":0,"msg":"ok"}`)
	defer srv.Close()

	ch := NewFeishuChannel()
	ok := ch.Send(context.Background(),
		Message{Title: "部署通知", Body: "**v1.2.3** 已上线", Color: "blue"},
		NotificationContext{FeishuWebhookURL: srv.URL})
	if !ok {
		t.Error("expected true on success")
	}
}

func TestFeishuSend_DefaultColor(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"StatusCode":0}`))
	}))
	defer srv.Close()

	ch := NewFeishuChannel()
	ok := ch.Send(context.Background(),
		Message{Title: "hello", Body: "world"},
		NotificationContext{FeishuWebhookURL: srv.URL})
	if !ok {
		t.Fatal("expected success")
	}

	// 飞书 webhook 要求外层包 {"msg_type":"interactive","card":{...}}。
	var parsed map[string]any
	if err := json.Unmarshal(capturedBody, &parsed); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if mt, _ := parsed["msg_type"].(string); mt != "interactive" {
		t.Errorf("msg_type = %q, want interactive", mt)
	}
	cardMap, ok := parsed["card"].(map[string]any)
	if !ok {
		t.Fatalf("card key missing or not object: %v", parsed)
	}
	headerMap, _ := cardMap["header"].(map[string]any)
	if tmpl, _ := headerMap["template"].(string); tmpl != "green" {
		t.Errorf("default template = %q, want green", tmpl)
	}
	if schema, _ := cardMap["schema"].(string); schema != "2.0" {
		t.Errorf("schema = %q, want 2.0", schema)
	}
}

func TestFeishuSend_CustomColor(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"code":0}`))
	}))
	defer srv.Close()

	ch := NewFeishuChannel()
	ok := ch.Send(context.Background(),
		Message{Title: "alert", Body: "down", Color: "red"},
		NotificationContext{FeishuWebhookURL: srv.URL})
	if !ok {
		t.Fatal("expected success")
	}

	var parsed map[string]any
	if err := json.Unmarshal(capturedBody, &parsed); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	cardMap, ok := parsed["card"].(map[string]any)
	if !ok {
		t.Fatalf("card key missing or not object: %v", parsed)
	}
	headerMap, _ := cardMap["header"].(map[string]any)
	if tmpl, _ := headerMap["template"].(string); tmpl != "red" {
		t.Errorf("template = %q, want red", tmpl)
	}
}

// 明确验证请求体结构：顶层含 msg_type + card，旧格式（直接裸露 card）
// 会触发飞书 19002 "params error, msg_type need"。
func TestFeishuSend_EnvelopeStructure(t *testing.T) {
	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"code":0}`))
	}))
	defer srv.Close()

	ch := NewFeishuChannel()
	_ = ch.Send(context.Background(),
		Message{Title: "t", Body: "b"},
		NotificationContext{FeishuWebhookURL: srv.URL})

	var parsed map[string]any
	if err := json.Unmarshal(capturedBody, &parsed); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	// 顶层恰好两个 key：msg_type + card（不能再多、不能缺）。
	if len(parsed) != 2 {
		t.Fatalf("top-level keys = %d, want 2: %v", len(parsed), parsed)
	}
	if _, ok := parsed["msg_type"]; !ok {
		t.Errorf("missing top-level msg_type key: %v", parsed)
	}
	cardRaw, ok := parsed["card"]
	if !ok {
		t.Fatalf("missing top-level card key: %v", parsed)
	}
	// card 必须是嵌套 JSON 对象（字符串化后再 marshal）。
	cardMap, ok := cardRaw.(map[string]any)
	if !ok {
		t.Fatalf("card = %T, want object", cardRaw)
	}
	if _, ok := cardMap["schema"]; !ok {
		t.Errorf("card missing schema: %v", cardMap)
	}
}

func TestFeishuSend_BadStatus(t *testing.T) {
	srv := newFeishuTestServer(t, http.StatusBadRequest, `{"code":9499}`)
	defer srv.Close()

	ch := NewFeishuChannel()
	ok := ch.Send(context.Background(),
		Message{Title: "t", Body: "b"},
		NotificationContext{FeishuWebhookURL: srv.URL})
	if ok {
		t.Error("expected false on 400 status")
	}
}

func TestFeishuName(t *testing.T) {
	if NewFeishuChannel().Name() != "feishu" {
		t.Errorf("Name() = %q, want feishu", NewFeishuChannel().Name())
	}
}

// ---------------------------------------------------------------------------
// Plugin (registry / Notify 分发)
// ---------------------------------------------------------------------------

func TestPlugin_UnknownChannel(t *testing.T) {
	p := NewPlugin()
	results := p.Notify(context.Background(),
		[]string{"ghost"},
		Message{Title: "t"},
		NotificationContext{})
	if results["ghost"] {
		t.Error("expected false for unknown channel")
	}
}

func TestPlugin_MultiChannel(t *testing.T) {
	srv := newFeishuTestServer(t, http.StatusOK, `{"code":0}`)
	defer srv.Close()

	p := NewPlugin()
	p.Register(&fakeChannel{name: "fake1", result: true})
	p.Register(&fakeChannel{name: "fake2", result: false})

	results := p.Notify(context.Background(),
		[]string{"fake1", "fake2", "nonexist"},
		Message{Title: "t"},
		NotificationContext{FeishuWebhookURL: srv.URL})

	if !results["fake1"] {
		t.Error("fake1 should be true")
	}
	if results["fake2"] {
		t.Error("fake2 should be false")
	}
	if results["nonexist"] {
		t.Error("nonexist should be false")
	}
}

func TestModuleNotify_Convenience(t *testing.T) {
	// Notify 便捷入口：未知渠道应返回 false。
	results := Notify(context.Background(),
		[]string{"no-such"},
		Message{Title: "t"},
		NotificationContext{})
	if results["no-such"] {
		t.Error("convenience Notify should return false for unknown channel")
	}
}

// ---------------------------------------------------------------------------
// buildFeishuCard 纯函数
// ---------------------------------------------------------------------------

func TestBuildFeishuCard_Structure(t *testing.T) {
	card := buildFeishuCard("Hello", "**world**", "blue")

	if card.Schema != "2.0" {
		t.Errorf("schema = %q, want 2.0", card.Schema)
	}
	if !card.Config.UpdateMulti {
		t.Error("update_multi should be true")
	}
	if card.Header.Template != "blue" {
		t.Errorf("template = %q, want blue", card.Header.Template)
	}
	if card.Header.Title.Tag != "plain_text" || card.Header.Title.Content != "Hello" {
		t.Errorf("header.title = %+v, want Hello/plain_text", card.Header.Title)
	}
	if card.Body.Direction != "vertical" {
		t.Errorf("body.direction = %q, want vertical", card.Body.Direction)
	}
	if len(card.Body.Elements) != 1 {
		t.Fatalf("body.elements len = %d, want 1", len(card.Body.Elements))
	}
	el := card.Body.Elements[0]
	if el.Tag != "markdown" || el.Content != "**world**" {
		t.Errorf("element = %+v, want markdown/**world**", el)
	}

	// 序列化后检查 JSON key。
	raw, err := json.Marshal(card)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var m map[string]any
	_ = json.Unmarshal(raw, &m)
	if _, ok := m["schema"]; !ok {
		t.Error("JSON missing 'schema' key")
	}
	if _, ok := m["header"]; !ok {
		t.Error("JSON missing 'header' key")
	}
}

// ---------------------------------------------------------------------------
// fakes
// ---------------------------------------------------------------------------

// fakeChannel 用于 Plugin 测试，按预设返回发送结果。
type fakeChannel struct {
	name   string
	result bool
}

func (f *fakeChannel) Name() string { return f.name }

func (f *fakeChannel) Send(_ context.Context, _ Message, _ NotificationContext) bool {
	return f.result
}
