package syncbus

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// CollectionSnapshot 池中一条采集快照。Snapshot 为扩展端生成的原始 JSON，服务端不解释。
type CollectionSnapshot struct {
	ID         string          `json:"id"`
	Source     string          `json:"source,omitempty"` // 采集来源 [taobao,1688,jd,other...]
	CapturedAt int64           `json:"captured_at"`
	From       string          `json:"from"`
	Name       string          `json:"name,omitempty"` // push 的设备名
	Snapshot   json.RawMessage `json:"snapshot"`
}

// CollectionSnapshotUpdate 池变更通知（写入 / 摘除），经账号级池频道广播给各在线设备。
type CollectionSnapshotUpdate struct {
	Kind string `json:"kind"` // put | claim_clear
	ID   string `json:"id"`
	From string `json:"from"`
	At   int64  `json:"at"`
}

func collectionKey(userID uint) string {
	return fmt.Sprintf("nomu:sync:collection:%d", userID)
}

func collectionChannel(userID uint) string {
	return fmt.Sprintf("nomu:sync:collection:ch:%d", userID)
}

// claimClearScript 原子取出并摘除一条：并发认领时只有一方拿到值，其余得 nil。
var claimClearScript = redis.NewScript(`
local v = redis.call('HGET', KEYS[1], ARGV[1])
if v then redis.call('HDEL', KEYS[1], ARGV[1]) end
return v
`)

// CollectionPut 写入/覆盖池中一条快照，并向账号池频道广播 put。
func (b *Bus) CollectionPut(ctx context.Context, userID uint, snap CollectionSnapshot) error {
	if snap.ID == "" {
		return errors.New("syncbus: collection snapshot id is required")
	}
	raw, err := json.Marshal(snap)
	if err != nil {
		return err
	}
	if err := b.redis.HSet(ctx, collectionKey(userID), snap.ID, raw).Err(); err != nil {
		return err
	}
	b.notifyCollection(ctx, userID, CollectionSnapshotUpdate{Kind: "put", ID: snap.ID, From: snap.From, At: time.Now().Unix()})
	return nil
}

// CollectionList 列出池中全部快照（连接时渲染已有条目用）。
func (b *Bus) CollectionList(ctx context.Context, userID uint) ([]CollectionSnapshot, error) {
	all, err := b.redis.HGetAll(ctx, collectionKey(userID)).Result()
	if err != nil {
		return nil, err
	}
	out := make([]CollectionSnapshot, 0, len(all))
	for _, raw := range all {
		snap, err := decodeCollectionSnapshot([]byte(raw))
		if err != nil {
			slog.WarnContext(ctx, "syncbus: skip corrupt collection entry", "user_id", userID, "error", err)
			continue
		}
		out = append(out, *snap)
	}
	return out, nil
}

// CollectionClaim 只读认领：读取一条快照并保留池中条目。不在池中返回 (nil, nil)。
func (b *Bus) CollectionClaim(ctx context.Context, userID uint, id string) (*CollectionSnapshot, error) {
	if id == "" {
		return nil, errors.New("syncbus: collection snapshot id is required")
	}
	raw, err := b.redis.HGet(ctx, collectionKey(userID), id).Result()
	if errors.Is(err, redis.Nil) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return decodeCollectionSnapshot([]byte(raw))
}

// CollectionClaimClear 认领并清除池：原子取出并摘除一条。并发时只有一方拿到，另一方得 nil。
func (b *Bus) CollectionClaimClear(ctx context.Context, userID uint, from, id string) (*CollectionSnapshot, error) {
	if id == "" {
		return nil, errors.New("syncbus: collection snapshot id is required")
	}
	res, err := claimClearScript.Run(ctx, b.redis, []string{collectionKey(userID)}, id).Result()
	if errors.Is(err, redis.Nil) {
		return nil, nil // 条目已不在池中（他人先认领或不存在）
	}
	if err != nil {
		return nil, err
	}
	raw, ok := res.(string)
	if !ok || raw == "" {
		return nil, nil
	}
	snap, err := decodeCollectionSnapshot([]byte(raw))
	if err != nil {
		return nil, err
	}
	b.notifyCollection(ctx, userID, CollectionSnapshotUpdate{Kind: "claim_clear", ID: id, From: from, At: time.Now().Unix()})
	return snap, nil
}

// SubscribeCollection 订阅本账号采集快照池的变更通知，返回更新 channel 与取消函数。
// 复用进程级共享 Dispatcher：同账号多设备合并为共享连接上的同一 channel 订阅。
func (b *Bus) SubscribeCollection(ctx context.Context, userID uint) (<-chan CollectionSnapshotUpdate, func(), error) {
	rawCh, cancel, err := b.dispatcher.Subscribe(ctx, collectionChannel(userID))
	if err != nil {
		return nil, nil, err
	}

	out := make(chan CollectionSnapshotUpdate, 16)
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
				var upd CollectionSnapshotUpdate
				if err := json.Unmarshal([]byte(msg.Payload), &upd); err != nil {
					slog.WarnContext(ctx, "syncbus: skip corrupt collection update", "channel", msg.Channel, "error", err)
					continue
				}
				select {
				case out <- upd:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	return out, cancel, nil
}

func decodeCollectionSnapshot(raw []byte) (*CollectionSnapshot, error) {
	var snap CollectionSnapshot
	if err := json.Unmarshal(raw, &snap); err != nil {
		return nil, err
	}
	return &snap, nil
}

// notifyCollection 尽力广播池变更；通知失败不影响已落地的池写入。
func (b *Bus) notifyCollection(ctx context.Context, userID uint, upd CollectionSnapshotUpdate) {
	raw, err := json.Marshal(upd)
	if err != nil {
		return
	}
	if err := b.redis.Publish(ctx, collectionChannel(userID), raw).Err(); err != nil {
		slog.WarnContext(ctx, "syncbus collection notify failed",
			"user_id", userID, "id", upd.ID, "kind", upd.Kind, "error", err)
	}
}
