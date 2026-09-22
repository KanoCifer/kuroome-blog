package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"gorm.io/datatypes"

	nomuerrs "github.com/KanoCifer/kuroome-blog/internal/domain/nomu/errs"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
	"github.com/KanoCifer/kuroome-blog/internal/security"
)

// 哨兵错误定义在 internal/domain/nomu/errs，此处转出以保持既有引用不变。
var (
	// ErrSyncConflict 云端与本地 version 不一致，需用户决定以哪端为准。
	ErrSyncConflict = nomuerrs.ErrSyncConflict
	// ErrSyncTooMany 单次同步携带的配置条数超过上限。
	ErrSyncTooMany = nomuerrs.ErrSyncTooMany
)

const syncMaxBatch = 200
const UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"

// NomuRepository 定义 NomuService 依赖的数据能力（供 mock 测试）。
type NomuRepository interface {
	FindByUserId(ctx context.Context, userId uint) ([]model.NomuConfig, error)
	Create(ctx context.Context, cfg *model.NomuConfig) error
	Update(ctx context.Context, userId uint, scope model.NomuConfigScope, configId string, updates *model.NomuConfig) error
	Delete(ctx context.Context, userId uint, scope model.NomuConfigScope, configId string) error
}

// NomuService 是 handler 依赖的接口。

// NomuSyncItem 是单条配置在同步协议中的表示（对齐 Dexie configs 表一行）。
type NomuSyncItem struct {
	ConfigScope model.NomuConfigScope `json:"configScope"`
	ConfigID    string                `json:"configId"`
	ConfigData  datatypes.JSON        `json:"configData"`
	Deleted     bool                  `json:"deleted"`
	Version     int64                 `json:"version"`
	DeviceID    *string               `json:"deviceId,omitempty"`
	UpdatedAt   time.Time             `json:"updatedAt"`
}

type NomuServiceStruct struct {
	repo NomuRepository
}

func NewNomuService(repo *postgres.NomuRepository) *NomuServiceStruct {
	return &NomuServiceStruct{repo: repo}
}

func (s *NomuServiceStruct) SyncNomuConfig(ctx context.Context, userId uint, local []NomuSyncItem, lastSyncAt *time.Time) ([]NomuSyncItem, error) {
	if len(local) > syncMaxBatch {
		return nil, nomuerrs.ErrSyncTooMany
	}

	now := time.Now().UTC()

	// 以本地为基准 upsert：逐条按 (user_id, config_scope, config_id) 命中。
	// 本地 deleted=true 走软删；其余走 Create（首次）/ Update（已存在）。
	// version 冲突（Update 命中 0 行）留给云端返回值体现：前端拿回全量后可比对。
	for _, item := range local {
		updates := &model.NomuConfig{
			ConfigData: item.ConfigData,
			Version:    item.Version,
			DeviceID:   item.DeviceID,
			UpdatedAt:  item.UpdatedAt,
		}
		err := s.repo.Update(ctx, userId, item.ConfigScope, item.ConfigID, updates)
		if err != nil {
			if !errors.Is(err, postgres.ErrNotFound) {
				return nil, err
			}
			// 云端不存在 → 新建。软删行也可新建（前端删除后重新创建同 id 场景）。
			cfg := &model.NomuConfig{
				UserID:      userId,
				ConfigScope: item.ConfigScope,
				ConfigID:    item.ConfigID,
				ConfigData:  item.ConfigData,
				Deleted:     item.Deleted,
				Version:     item.Version,
				DeviceID:    item.DeviceID,
				UpdatedAt:   item.UpdatedAt,
				CreatedAt:   now,
			}
			if cerr := s.repo.Create(ctx, cfg); cerr != nil {
				// 并发创建已被其它请求抢建 → 再试一次 Update。
				if errors.Is(cerr, postgres.ErrConfigExists) {
					if uerr := s.repo.Update(ctx, userId, item.ConfigScope, item.ConfigID, updates); uerr != nil {
						return nil, uerr
					}
					continue
				}
				return nil, cerr
			}
		}
	}

	cloud, err := s.repo.FindByUserId(ctx, userId)
	if err != nil {
		return nil, err
	}

	// 组装响应：仅返回 lastSyncAt 之后有变化的行（增量）；lastSyncAt 为 nil 全量返回。
	out := make([]NomuSyncItem, 0, len(cloud))
	for _, c := range cloud {
		if lastSyncAt != nil && !c.UpdatedAt.After(*lastSyncAt) {
			continue
		}
		out = append(out, NomuSyncItem{
			ConfigScope: c.ConfigScope,
			ConfigID:    c.ConfigID,
			ConfigData:  c.ConfigData,
			Deleted:     c.Deleted,
			Version:     c.Version,
			DeviceID:    c.DeviceID,
			UpdatedAt:   c.UpdatedAt,
		})
	}

	slog.InfoContext(ctx, "nomu config synced",
		"user_id", userId, "local_items", len(local), "cloud_items", len(cloud), "returned", len(out))
	return out, nil
}

// proxyClient 独立的 SSRF-safe HTTP 客户端；不走 s.client 是因为它
// 共享的 *http.Client 没有 DialContext / CheckRedirect 钩子。
//
// ponytail: 进程内单例足够；ProxyBlob 并发量受前端图片加载驱动，
// http.DefaultTransport 的连接池自然承载。
var proxyClient = security.SafeClient()

func (s *NomuServiceStruct) ProxyBlob(ctx context.Context, url *url.URL) (contentLength int64, contentType string, body io.ReadCloser, extraHeaders map[string]string, err error) {
	if err := security.ValidateURL(ctx, url); err != nil {
		return 0, "", nil, nil, err
	}
	rawURL := url.String()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return 0, "", nil, nil, err
	}

	req.Header.Set("Referer", url.Scheme+"://"+url.Host+"/")
	req.Header.Set("User-Agent", UserAgent)
	// proxyClient 绕过了 s.client.Do,手动注入 trace_id 以保持链路可观测。
	if id, ok := logger.TraceIDFromContext(ctx); ok && id != "" {
		req.Header.Set("X-Trace-Id", id)
	}

	resp, err := proxyClient.Do(req)
	if err != nil {
		return 0, "", nil, nil, err
	}
	// 非 200 的响应体由本函数就地关闭；200 时 body 交给调用方读完再关。
	// 这里不能 defer Close：函数返回即触发，下游一个字都读不到。
	if resp.StatusCode != http.StatusOK {
		_ = resp.Body.Close()
		return 0, "", nil, nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	contentLength = resp.ContentLength
	contentType = resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	extraHeaders = map[string]string{
		"Content-Disposition": "inline",
		"Cache-Control":       "public, max-age=86400",
	}

	body = resp.Body
	return contentLength, contentType, body, extraHeaders, nil
}
