package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

// feishuTimeout 飞书 webhook 请求超时。
const feishuTimeout = 10 * time.Second

// feishuPayload 飞书 text 消息体。
type feishuPayload struct {
	MsgType string `json:"msg_type"`
	Content struct {
		Text string `json:"text"`
	} `json:"content"`
}

// FeishuChannel 飞书 Webhook 传输 adapter。
//
// webhook_url 来源（保持重构前兼容优先级）：
//  1. ctx.FeishuWebhookURL（订阅级 reminder_config）；
//  2. 全局 config.FEISHU_WEBHOOK_URL。
type FeishuChannel struct {
	httpClient *http.Client
}

// NewFeishuChannel 构建飞书渠道，使用独立 http.Client（默认超时）。
func NewFeishuChannel() *FeishuChannel {
	return &FeishuChannel{
		httpClient: &http.Client{Timeout: feishuTimeout},
	}
}

func (c *FeishuChannel) Name() string { return "feishu" }

func (c *FeishuChannel) Send(
	ctx context.Context,
	msg Message,
	nc NotificationContext,
) bool {
	cfg := config.Cfg
	webhookURL := nc.FeishuWebhookURL
	if webhookURL == "" && cfg != nil {
		webhookURL = cfg.Feishu.WebhookURL
	}
	if webhookURL == "" {
		slog.Warn("[feishu] FEISHU_WEBHOOK_URL not configured")
		return false
	}

	payload := feishuPayload{MsgType: "text"}
	payload.Content.Text = fmt.Sprintf("%s\n\n%s", msg.Title, msg.Body)

	body, err := json.Marshal(payload)
	if err != nil {
		slog.Error("[feishu] marshal payload", "err", err)
		return false
	}

	req, err := http.NewRequestWithContext(
		ctx, http.MethodPost, webhookURL, bytes.NewReader(body),
	)
	if err != nil {
		slog.Error("[feishu] build request", "err", err)
		return false
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		slog.Error("[feishu] send", "err", err)
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("[feishu] bad status", "status", resp.StatusCode)
		return false
	}

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Error("[feishu] read body", "err", err)
		return false
	}
	var result struct {
		Code       any    `json:"code"`
		StatusCode any    `json:"StatusCode"`
		Msg        string `json:"msg"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		slog.Error("[feishu] parse response", "err", err)
		return false
	}
	code := result.Code
	if code == nil {
		code = result.StatusCode
	}
	if code != float64(0) && code != "0" {
		slog.Error("[feishu] api error",
			"code", code, "msg", result.Msg)
		return false
	}

	slog.Info("[feishu] notification sent", "title", msg.Title)
	return true
}
