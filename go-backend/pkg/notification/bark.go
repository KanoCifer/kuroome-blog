package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"
)

// barkBaseURL Bark 推送服务地址。
const barkBaseURL = "https://api.day.app"

// barkTimeout Bark 请求超时。
const barkTimeout = 10 * time.Second

// barkPayload Bark 推送消息体。
type barkPayload struct {
	Body  string `json:"body"`
	Level string `json:"level"`
	Sound string `json:"sound"`
}

// BarkChannel Bark iOS 推送传输 adapter。
//
// device_key 仅来自 ctx.BarkDeviceKey（由调用方从 reminder_config 或
// Profile 解析后传入）。缺失时直接返回 false，不上查数据库。
type BarkChannel struct {
	httpClient *http.Client
}

// NewBarkChannel 构建 Bark 渠道，使用独立 http.Client（默认超时）。
func NewBarkChannel() *BarkChannel {
	return &BarkChannel{
		httpClient: &http.Client{Timeout: barkTimeout},
	}
}

func (c *BarkChannel) Name() string { return "bark" }

func (c *BarkChannel) Send(
	ctx context.Context,
	msg Message,
	nc NotificationContext,
) bool {
	if nc.BarkDeviceKey == "" {
		slog.Warn("[bark] bark_device_key not provided")
		return false
	}

	// URL 形态：{base}/{device_key}/{title}（title 经 URL 编码避免破坏路径）。
	url := barkBaseURL + "/" + nc.BarkDeviceKey + "/" + url.PathEscape(msg.Title)
	payload := barkPayload{
		Body:  msg.Body,
		Level: "timeSensitive",
		Sound: "alarm",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		slog.Error("[bark] marshal payload", "err", err)
		return false
	}

	req, err := http.NewRequestWithContext(
		ctx, http.MethodPost, url, bytes.NewReader(body),
	)
	if err != nil {
		slog.Error("[bark] build request", "err", err)
		return false
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		slog.Error("[bark] send", "err", err)
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("[bark] bad status", "status", resp.StatusCode)
		return false
	}

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Error("[bark] read body", "err", err)
		return false
	}
	var result struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		slog.Error("[bark] parse response", "err", err)
		return false
	}
	if result.Code != 200 {
		slog.Error("[bark] api error", "code", result.Code, "msg", result.Msg)
		return false
	}

	slog.Info("[bark] notification sent", "title", msg.Title)
	return true
}
