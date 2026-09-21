// Package qweather 是和风天气（QWeather）的接入层：EdDSA(Ed25519) JWT 签名器
// （signer.go）与「鉴权 + 缓存 + HTTP」三合一的客户端（本文件）。
//
// 两者都对齐 Python 端 backend/app/utils/qweather_jwt.py / _QWeatherClient
// 的行为；均无状态、可并发共享，由 appstate 构造并注入。
//
// 放置于 infra 而非 service：本包不持有业务状态，只做外部依赖的协议适配。
package qweather

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

var (
	// ErrInvalidLocation 请求未提供 location 或 location_id。
	ErrInvalidLocation = errors.New("weather: must provide location or location_id")
	// ErrUpstream QWeather 上游返回非 2xx 状态码（封装 status）。
	ErrUpstream = errors.New("weather: upstream QWeather returned error")
	// ErrUnavailable 网络错误、超时或读取 body 失败（封装底层原因）。
	ErrUnavailable = errors.New("weather: QWeather unavailable")
)

// upstreamBodyLogLimit 非 2xx 时打进日志的响应体上限（QWeather 错误码在 body 里）。
const upstreamBodyLogLimit = 512

// Client 封装"鉴权 + 缓存 + HTTP"三合一，对外只暴露 Get / ResolveLocation。
//
// 复用 internal/infra/httpclient.Client 的 trace_id 注入与出站日志，
// 不另起 *http.Client。
//
// 日志直接走 slog.InfoContext 等顶层函数（logger.Init 已 SetDefault，
// trace_id 由 routerHandler 从 ctx 提取并注入记录）。
type Client struct {
	http   *httpclient.Client
	redis  *redis.Client
	base   string
	signer *Signer
	now    func() time.Time // 注入时钟，便于测试 JWT iat/exp
}

// Option 配置 Client。
type Option func(*Client)

// WithClock 注入时钟，便于测试断言 JWT iat/exp。
func WithClock(now func() time.Time) Option {
	return func(c *Client) { c.now = now }
}

// NewClient 构造 Client。signer 为 nil 时所有请求返回 ErrUnavailable
// （JWT 私钥未配置的部署形态，不 panic）。
func NewClient(
	http *httpclient.Client,
	redis *redis.Client,
	base string,
	signer *Signer,
	opts ...Option,
) *Client {
	// 去掉尾部斜杠，避免与 path 首斜杠拼接出 "//geo/..." 导致上游 404。
	c := &Client{
		http:   http,
		redis:  redis,
		base:   strings.TrimRight(base, "/"),
		signer: signer,
		now:    time.Now,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// Redis 暴露底层 redis 客户端，供上层旁路读取缓存（如潮汐端点需返回
// from_cache 标记）。redis 未配置时为 nil，调用方须自查。
func (c *Client) Redis() *redis.Client { return c.redis }

// Get 发起鉴权 + 缓存的 GET 请求，行为对齐 Python 端
// _QWeatherClient.get(...)：
//  1. Redis GET cacheKey；命中直接返回；
//  2. 未命中则签名/取 JWT，构造请求头 Authorization: Bearer <token>；
//  3. 通过 httpclient.Client.Do 发出请求（自动注入 X-Trace-Id）；
//  4. 非 2xx → ErrUpstream；网络/读取错误 → ErrUnavailable；
//  5. 成功后 SET cacheKey 写回 redis。
//
// 返回的 json.RawMessage 是上游原始 payload，handler 可直接转发或继续解析。
func (c *Client) Get(
	ctx context.Context,
	path string,
	params map[string]string,
	cacheKey string,
	ttl time.Duration,
) (json.RawMessage, error) {
	// 1. cache hit
	if c.redis != nil {
		cached, err := c.redis.Get(ctx, cacheKey).Bytes()
		if err == nil && len(cached) > 0 {
			slog.DebugContext(ctx, "qweather cache hit", "cache_key", cacheKey)
			return cached, nil
		}
	}

	// 2. signer 未配置（JWT 私钥为空）时返回 ErrUnavailable，避免 nil 解引用 panic。
	if c.signer == nil {
		return nil, fmt.Errorf("%w: QWeather signer not configured", ErrUnavailable)
	}

	// 3. JWT（优先 redis 缓存）
	token, err := c.signer.Cached(ctx, c.redis, 24*time.Hour, c.now())
	if err != nil {
		return nil, fmt.Errorf("qweather: get jwt: %w", err)
	}

	// 4. construct request
	url := c.base + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("qweather: build request: %w", err)
	}
	q := req.URL.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	req.URL.RawQuery = q.Encode()
	req.Header.Set("Authorization", "Bearer "+token)

	// 5. send
	resp, err := httpclient.DoWithRetry(ctx, c.http, req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// 上游非 2xx 是 ErrUpstream（handler → 502）的唯一来源，但 httpclient 的
		// 出站日志只记状态码、不带响应体，线上分不清是配额 429 / 鉴权 403 还是
		// 服务端 5xx。这里补一条带状态码与 body 片段的 ERROR：QWeather 的失败
		// 原因（code/message）在 body 里。
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, upstreamBodyLogLimit))
		slog.ErrorContext(ctx, "qweather upstream non-2xx",
			"status", resp.StatusCode,
			"url", req.URL.Redacted(),
			"body", strings.TrimSpace(string(snippet)),
		)
		return nil, fmt.Errorf("%w: status=%d", ErrUpstream, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("%w: read body: %v", ErrUnavailable, err)
	}

	// 6. cache write
	if c.redis != nil {
		go func() {
			// 与请求 ctx 解绑：调用方超时断开、或同批并发中某个 endpoint 失败让
			// handler 提前 return，都会取消请求 ctx；沿用它会令已经成功拿到的响应
			// 写不进缓存，上游压力就卸不掉。WithoutCancel 保留 trace_id 等值。
			cacheCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
			defer cancel()
			err := c.redis.Set(cacheCtx, cacheKey, body, ttl).Err()
			if err != nil {
				slog.WarnContext(cacheCtx, "qweather cache write failed", "cache_key", cacheKey, "error", err)
			}
		}()
	}
	return body, nil
}

// ResolveLocation 校验位置输入并返回 (effective value, params)：
//   - locID 非空优先；
//   - 其次 loc；
//   - 两者都为空 → ErrInvalidLocation（handler 映射 400）。
func (c *Client) ResolveLocation(loc, locID *string) (string, map[string]string, error) {
	if locID != nil && *locID != "" {
		return *locID, map[string]string{"location": *locID}, nil
	}
	if loc != nil && *loc != "" {
		return *loc, map[string]string{"location": *loc}, nil
	}
	return "", nil, ErrInvalidLocation
}
