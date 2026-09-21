package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
)

const ExchangeApi = "https://api.exchangerate.fun/latest"

const cacheKeyPrefix = "currency"

// CurrencyService 汇率查询：取上游原始 JSON → 缓存 → 反序列化为 DTO。
//
// 上游客户端不单独成文件：整条链路只有 GetExchange 一个动作，拆成
// CurrencyClient + CurrencyService 两个类型只是转发一层。
type CurrencyService struct {
	http    *httpclient.Client
	redis   *redis.Client
	baseURL string
}

type Currencyer interface {
	GetExchange(ctx context.Context, baseCurrency string) (*dto.ExchangeResponse, error)
}

// ClientOption 覆盖默认上游配置（测试注入用）。
type ClientOption func(*CurrencyService)

// WithBaseURL 覆盖默认上游地址（测试注入用）。
func WithBaseURL(url string) ClientOption {
	return func(c *CurrencyService) {
		c.baseURL = url
	}
}

func NewCurrencyService(http *httpclient.Client, redis *redis.Client, opts ...ClientOption) *CurrencyService {
	c := &CurrencyService{
		http:    http,
		redis:   redis,
		baseURL: ExchangeApi,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// GetExchange 按「基准币种 + 当天日期」缓存 4 小时的汇率原始响应。
func (c *CurrencyService) GetExchange(ctx context.Context, baseCurrency string) (*dto.ExchangeResponse, error) {
	now := time.Now().Format("2006/01/02")
	cacheKey := fmt.Sprintf("%s:%s:%s", cacheKeyPrefix, baseCurrency, now)

	raw, err := c.getExchangeRaw(ctx, baseCurrency, cacheKey, 4*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("CurrencyService failed: %w", err)
	}
	res, err := dto.ToExchangeResponse(raw)
	if err != nil {
		return nil, fmt.Errorf("CurrencyService json unmarshal failed: %w", err)
	}

	return res, nil
}

func (c *CurrencyService) getExchangeRaw(ctx context.Context, baseCurrency string, cacheKey string, ttl time.Duration) (raw json.RawMessage, err error) {

	if c.redis != nil {
		cached, err := c.redis.Get(ctx, cacheKey).Bytes()
		if err == nil && len(cached) > 0 {
			slog.DebugContext(ctx, "currency exchange cache hit", "cache_key", cacheKey)
			return cached, nil
		}
	}

	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("[Currency] build req failed %w", err)
	}

	q := req.URL.Query()
	q.Set("base", baseCurrency)
	req.URL.RawQuery = q.Encode()

	resp, err := httpclient.DoWithRetry(ctx, c.http, req)
	if err != nil {
		return nil, fmt.Errorf("Get Exchange failed %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("currency upstream failed: status=%d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body err %w", err)
	}

	if c.redis != nil {
		go func() {
			cacheCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()

			err := c.redis.Set(cacheCtx, cacheKey, body, ttl).Err()
			if err != nil {
				slog.ErrorContext(cacheCtx, "currency write cache fail", "cache_key", cacheKey, "error", err)
			}
		}()
	}

	return body, nil
}
