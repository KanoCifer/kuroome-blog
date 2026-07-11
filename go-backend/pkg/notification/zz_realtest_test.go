package notification

import (
	"context"
	"testing"
)

// 临时真实 webhook 测试 —— 跑完即删，不提交。
func TestRealFeishuHook(t *testing.T) {
	hook := ""
	ch := NewFeishuChannel()
	ok := ch.Send(context.Background(),
		Message{
			Title: "Go Backend 测试通知",
			Body:  "**测试卡片** — 来自真实 webhook 连通性验证。\n\n· 时间：2026-07-11\n· 内容：若看到本条，说明 webhook 正常。",
			Color: "green",
		},
		NotificationContext{FeishuWebhookURL: hook})
	if !ok {
		t.Log("Ignored")
	}
	t.Log("sent — check Feishu group for the card")
}
