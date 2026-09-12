// Package syncbus 实现 Nomu 多设备同步总线：
// 每设备一个 Redis LIST 队列（离线积压，连上 LRANGE 回放）+ 每设备一个 pubsub 频道
// （在线实时投递），接收端 ack 后 LREM 弹出。payload 由注册的 service handler 校验，
package syncbus

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/infra/pubsub"
)

const (
	// queueCap 单设备单服务队列上限，超出丢弃最旧（防止离线设备无限积压）。
	queueCap = 200
	// presenceTTL presence HASH 的过期时间，避免设备长期不连后残留。
	presenceTTL = 24 * time.Hour
	// onlineThreshold 判定「在线」的 last_seen 新鲜度窗口。
	onlineThreshold = 60 * time.Second
)

var (
	// ErrServiceUnknown 推送/ack 的服务名未注册。
	ErrServiceUnknown = errors.New("syncbus: unknown service")
	// ErrExpired payload 已过期，回放时应丢弃并清理。
	ErrExpired = errors.New("syncbus: payload expired")
)

type Handler interface {
	Service() string
	Validate(payload json.RawMessage) error
}

type Envelope struct {
	Type    string          `json:"type"`
	Service string          `json:"service"`
	Kind    string          `json:"kind,omitempty"`
	ID      string          `json:"id"`
	From    string          `json:"from"`
	To      string          `json:"to"`
	SentAt  int64           `json:"sentAt"`
	Payload json.RawMessage `json:"payload"`
}

type DeviceInfo struct {
	DeviceID string `json:"deviceId"`
	Name     string `json:"name"`
	Online   bool   `json:"online"`
	LastSeen int64  `json:"lastSeen"`
}

type Bus struct {
	redis      *redis.Client
	dispatcher *pubsub.Dispatcher
	services   map[string]Handler
}

// NewSyncBus 构造 Bus。dispatcher 为进程级共享订阅调度器，由组合根注入：
// 所有设备频道订阅复用同一条 Redis pubsub 连接。
func NewSyncBus(client *redis.Client, dispatcher *pubsub.Dispatcher) *Bus {
	return &Bus{redis: client, dispatcher: dispatcher, services: make(map[string]Handler)}
}

// Register 注册一个同步服务；同名覆盖。
func (b *Bus) Register(h Handler) {
	b.services[h.Service()] = h
}

func (b *Bus) ServiceNames() []string {
	names := make([]string, 0, len(b.services))
	for name := range b.services {
		names = append(names, name)
	}
	return names
}

func queueKey(service string, userID uint, deviceID string) string {
	return fmt.Sprintf("nomu:sync:q:%s:%d:%s", service, userID, deviceID)
}

func channelKey(userID uint, deviceID string) string {
	return fmt.Sprintf("nomu:sync:ch:%d:%s", userID, deviceID)
}

func presenceKey(userID uint) string {
	return fmt.Sprintf("nomu:sync:presence:%d", userID)
}

func (b *Bus) Publish(ctx context.Context, userID uint, env Envelope) error {
	h, ok := b.services[env.Service]
	if !ok {
		return ErrServiceUnknown
	}
	if env.ID == "" || env.To == "" {
		return errors.New("syncbus: id and to are required")
	}
	if err := h.Validate(env.Payload); err != nil {
		return err
	}

	env.Type = "delivery"
	raw, err := json.Marshal(env)
	if err != nil {
		return err
	}

	qk := queueKey(env.Service, userID, env.To)
	pipe := b.redis.Pipeline()
	pipe.RPush(ctx, qk, raw)
	pipe.LTrim(ctx, qk, -queueCap, -1)
	published := pipe.Publish(ctx, channelKey(userID, env.To), raw)
	if _, err := pipe.Exec(ctx); err != nil {
		slog.ErrorContext(ctx, "syncbus publish failed",
			"service", env.Service, "user_id", userID, "to", env.To, "id", env.ID,
			"key", qk, "error", err)
		return err
	}

	// subscribers=0 表示目标此刻离线，条目留队列等回放；后续以 delivered 为准。
	slog.InfoContext(ctx, "syncbus published",
		"service", env.Service, "user_id", userID, "to", env.To, "id", env.ID,
		"subscribers", published.Val())
	return nil
}

// Replay 回放本设备队列中积压的信封。过期条目顺手 LREM 清理，损坏条目跳过。
func (b *Bus) Replay(ctx context.Context, userID uint, deviceID string, write func(Envelope) error) error {
	for service, h := range b.services {
		qk := queueKey(service, userID, deviceID)
		items, err := b.redis.LRange(ctx, qk, 0, -1).Result()
		if err != nil {
			return err
		}
		replayed := 0
		for _, raw := range items {
			var env Envelope
			if err := json.Unmarshal([]byte(raw), &env); err != nil {
				slog.WarnContext(ctx, "syncbus: skip corrupt queue entry", "key", qk, "error", err)
				continue
			}
			if err := h.Validate(env.Payload); err != nil {
				if errors.Is(err, ErrExpired) {
					_ = b.redis.LRem(ctx, qk, 0, raw).Err()
				}
				continue
			}
			if err := write(env); err != nil {
				return err
			}
			replayed++
		}
		if len(items) > 0 {
			slog.InfoContext(ctx, "syncbus replay",
				"service", service, "user_id", userID, "device_id", deviceID,
				"found", len(items), "replayed", replayed)
		}
	}
	return nil
}

// Subscribe 订阅本设备频道的实时投递，返回信封 channel 与取消函数。
// 复用进程级共享 Dispatcher：同账号多设备仅占一条 Redis pubsub 连接。
func (b *Bus) Subscribe(ctx context.Context, userID uint, deviceID string) (<-chan Envelope, func(), error) {
	rawCh, cancel, err := b.dispatcher.Subscribe(ctx, channelKey(userID, deviceID))
	if err != nil {
		return nil, nil, err
	}

	out := make(chan Envelope, 16)
	go func() {
		defer close(out)
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-rawCh:
				if !ok {
					return
				}
				var env Envelope
				if err := json.Unmarshal([]byte(msg.Payload), &env); err != nil {
					slog.WarnContext(ctx, "syncbus: skip corrupt pubsub message",
						"channel", msg.Channel, "error", err)
					continue
				}
				slog.InfoContext(ctx, "syncbus delivered",
					"service", env.Service, "user_id", userID, "to", deviceID, "id", env.ID)
				select {
				case out <- env:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	return out, cancel, nil
}

// Ack 接收端确认后弹出队列条目。仅本设备（deviceID）自己的队列可 ack。
func (b *Bus) Ack(ctx context.Context, userID uint, deviceID, service, id string) error {
	if _, ok := b.services[service]; !ok {
		return ErrServiceUnknown
	}
	qk := queueKey(service, userID, deviceID)
	items, err := b.redis.LRange(ctx, qk, 0, -1).Result()
	if err != nil {
		return err
	}
	for _, raw := range items {
		var env Envelope
		if err := json.Unmarshal([]byte(raw), &env); err != nil {
			continue
		}
		if env.ID == id {
			// ponytail: O(n) 扫描定位 id（n≤queueCap=200）；条目只归本设备，无需另建索引
			if err := b.redis.LRem(ctx, qk, 1, raw).Err(); err != nil {
				return err
			}
			slog.InfoContext(ctx, "syncbus acked",
				"service", service, "user_id", userID, "device_id", deviceID,
				"id", id, "remaining", len(items)-1)
			return nil
		}
	}
	return nil
}

type presenceRecord struct {
	Name     string `json:"name"`
	LastSeen int64  `json:"lastSeen"`
}

// TouchPresence 记录设备在线（连接时与 ping 时调用）。不维护连接计数：
// 在线判定基于 last_seen 新鲜度，多连接/短连接都自然覆盖。
// name 为空（心跳）时保留已存名字，避免把握手时写入的店铺名冲成空串。
func (b *Bus) TouchPresence(ctx context.Context, userID uint, deviceID, name string) error {
	key := presenceKey(userID)
	if name == "" {
		// ponytail: HGet+HSet 非原子，同设备并发 touch 时理论上可能读到旧名；
		// 名字只在握手/ping 更新，窗口极小，暂不引入 Lua。
		if raw, err := b.redis.HGet(ctx, key, deviceID).Result(); err == nil {
			var prev presenceRecord
			if json.Unmarshal([]byte(raw), &prev) == nil {
				name = prev.Name
			}
		}
	}
	rec, err := json.Marshal(presenceRecord{Name: name, LastSeen: time.Now().Unix()})
	if err != nil {
		return err
	}
	pipe := b.redis.Pipeline()
	pipe.HSet(ctx, key, deviceID, rec)
	pipe.Expire(ctx, key, presenceTTL)
	_, err = pipe.Exec(ctx)
	return err
}

// Devices 返回该账号下已知设备及在线状态。
func (b *Bus) Devices(ctx context.Context, userID uint) ([]DeviceInfo, error) {
	all, err := b.redis.HGetAll(ctx, presenceKey(userID)).Result()
	if err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	out := make([]DeviceInfo, 0, len(all))
	for id, raw := range all {
		var rec presenceRecord
		_ = json.Unmarshal([]byte(raw), &rec)
		out = append(out, DeviceInfo{
			DeviceID: id,
			Name:     rec.Name,
			Online:   now-rec.LastSeen < int64(onlineThreshold.Seconds()),
			LastSeen: rec.LastSeen,
		})
	}
	return out, nil
}
