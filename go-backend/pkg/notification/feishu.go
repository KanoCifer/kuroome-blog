package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

// feishuTimeout 飞书 webhook 请求超时。
const feishuTimeout = 10 * time.Second

// feishuDefaultCardColor 飞书卡片 header 默认模板色。
const feishuDefaultCardColor = "green"

// FeishuChannel 飞书 Webhook 传输 adapter —— 以 interactive card 2.0
// 卡片格式发送通知，header 显示 Title，body 显示 Body（markdown）。
//
// webhook_url 来源（保持重构前兼容优先级）：
//  1. ctx.FeishuWebhookURL（订阅级 reminder_config）；
//  2. 全局 config.Feishu.WebhookURL。
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

	color := msg.Color
	if color == "" {
		color = feishuDefaultCardColor
	}

	card := buildFeishuCard(msg.Title, msg.Body, color)
	cardJSON, err := json.Marshal(card)
	if err != nil {
		slog.Error("[feishu] marshal card", "err", err)
		return false
	}
	// 飞书 webhook 要求外层包 {"msg_type":"interactive","card":{...}}。
	body, err := json.Marshal(struct {
		MsgType string          `json:"msg_type"`
		Card    json.RawMessage `json:"card"`
	}{
		MsgType: "interactive",
		Card:    cardJSON,
	})
	if err != nil {
		slog.Error("[feishu] marshal envelope", "err", err)
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

	slog.Info("[feishu] card sent", "title", msg.Title, "color", color)
	return true
}

// feishuCard 飞书 interactive card 2.0 顶层结构。
type feishuCard struct {
	Schema string         `json:"schema"`
	Config feishuConfig   `json:"config"`
	Header feishuHeader   `json:"header"`
	Body   feishuCardBody `json:"body"`
}

type feishuConfig struct {
	UpdateMulti bool `json:"update_multi"`
}

type feishuHeader struct {
	Title    feishuText `json:"title"`
	Template string     `json:"template"`
}

type feishuCardBody struct {
	Direction string          `json:"direction"`
	Padding   string          `json:"padding"`
	Elements  []feishuElement `json:"elements"`
}

type feishuElement struct {
	Tag     string `json:"tag"`
	Content string `json:"content"`
}

type feishuText struct {
	Tag     string `json:"tag"`
	Content string `json:"content"`
}

// buildFeishuCard 构造一个最小化的飞书卡片 JSON：header 显示 title，
// body 用 markdown 显示正文内容。
func buildFeishuCard(title, bodyText, color string) feishuCard {
	return feishuCard{
		Schema: "2.0",
		Config: feishuConfig{UpdateMulti: true},
		Header: feishuHeader{
			Title:    feishuText{Tag: "plain_text", Content: title},
			Template: color,
		},
		Body: feishuCardBody{
			Direction: "vertical",
			Padding:   "12px",
			Elements: []feishuElement{
				{Tag: "markdown", Content: bodyText},
			},
		},
	}
}
