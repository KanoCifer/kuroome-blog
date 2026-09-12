// Package pubsub 提供进程级共享的 Redis 订阅调度器：全进程复用一条 PubSub
// 连接，按 channel 名 fan-out 给各订阅方。
//
// go-redis 的 *redis.PubSub 在单条连接上可 SUBSCRIBE 任意多个 channel，
// 因此订阅方数量与 Redis 连接数解耦：无论多少订阅者，都只占一条连接。
// 每个订阅方拿到独立的 <-chan *redis.Message。
//
// 典型用法（service 层持有，由 appstate 构造注入）：
//
//	d := pubsub.NewDispatcher(rdb)
//	ch, cancel, err := d.Subscribe(ctx, "some:channel")
//	if err != nil { ... }
//	defer cancel()
//	for msg := range ch { ... }
//
// 订阅方 channel 满时消息被丢弃（drop-on-full），绝不阻塞共享消费循环，
// 否则一个慢订阅方会拖死全进程。
package pubsub

import (
	"context"
	"errors"
	"log/slog"
	"sync"

	"github.com/redis/go-redis/v9"
)

// subBuffer 单个订阅方 channel 的缓冲深度。
const subBuffer = 64

// ErrClosed Dispatcher 已关闭，不能再订阅。
var ErrClosed = errors.New("pubsub: dispatcher closed")

// subscriber 一个订阅方。mu 同时保护 closed 标志与 channel 关闭，
// 使「消费循环发送」与「cancel 关闭」互斥，避免向已关闭 channel 发送。
type subscriber struct {
	mu     sync.Mutex
	ch     chan *redis.Message
	closed bool
}

// trySend 非阻塞投递，缓冲满返回 false（由调用方告警丢弃）。
func (s *subscriber) trySend(msg *redis.Message) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return false
	}
	select {
	case s.ch <- msg:
		return true
	default:
		return false
	}
}

func (s *subscriber) isClosed() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.closed
}

func (s *subscriber) close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.closed {
		s.closed = true
		close(s.ch)
	}
}

// Dispatcher 进程级共享订阅调度器。零值不可用，须经 NewDispatcher 构造。
// 内部单 goroutine 消费，可并发调用 Subscribe / Close。
type Dispatcher struct {
	pubsub *redis.PubSub
	done   chan struct{} // consume 退出后关闭，Close 据此等待清理完成

	mu     sync.RWMutex
	subs   map[string]map[*subscriber]struct{}
	closed bool

	closeOnce sync.Once
	closeErr  error
}

// NewDispatcher 基于共享 redis 客户端构造调度器。
// 空订阅合法：这里只创建一个空 PubSub，不在构造期发裸 Receive 预热。
// 消费循环启动后会建立唯一的 Redis 连接（Receive 会按需 dial），此后
// 所有订阅复用该连接。
func NewDispatcher(rdb *redis.Client) *Dispatcher {
	d := &Dispatcher{
		pubsub: rdb.Subscribe(context.Background()),
		done:   make(chan struct{}),
		subs:   make(map[string]map[*subscriber]struct{}),
	}
	go d.consume()
	return d
}

func (d *Dispatcher) consume() {
	defer close(d.done)
	for msg := range d.pubsub.Channel() {
		d.mu.RLock()
		// 复制目标列表：map 迭代不是快照，解锁后其它 goroutine 会 delete，
		// 直接遍历原 map 会并发读写 panic。
		targets := make([]*subscriber, 0, len(d.subs[msg.Channel]))
		for s := range d.subs[msg.Channel] {
			targets = append(targets, s)
		}
		d.mu.RUnlock()

		for _, s := range targets {
			// 返回 false 有两种可能：缓冲满，或该订阅方刚被取消（窗口内）。
			// 后者无需告警，故仅在「未关闭但仍满」时记日志。
			if !s.trySend(msg) && !s.isClosed() {
				// ponytail: 订阅方缓冲满则丢弃，不阻塞共享消费循环。syncbus 的
				// 实时投递有 LIST 队列 + 连接时 replay 兜底，会话中段丢的消息要等
				// 重连才补。若需会话内补投，可给该订阅方置「需重放」标志触发 Replay。
				slog.Warn("pubsub subscriber full, dropped", "channel", msg.Channel)
			}
		}
	}
	// Channel() 关闭（PubSub.Close / 连接终止）后唤醒所有订阅方。
	d.closeAll()
}

// closeAll 关闭全部订阅方 channel 并清空表。仅在消费循环退出后调用。
func (d *Dispatcher) closeAll() {
	d.mu.Lock()
	defer d.mu.Unlock()
	for _, set := range d.subs {
		for s := range set {
			s.close()
		}
	}
	d.subs = make(map[string]map[*subscriber]struct{})
	d.closed = true
}

// Subscribe 订阅 channel，返回消息 channel 与幂等的取消函数。
// 首次出现该 channel 时在共享连接上 SUBSCRIBE；同 channel 的每个调用方
// 各得独立 channel。
func (d *Dispatcher) Subscribe(ctx context.Context, channel string) (<-chan *redis.Message, func(), error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.closed {
		return nil, nil, ErrClosed
	}
	if d.subs[channel] == nil {
		if err := d.pubsub.Subscribe(ctx, channel); err != nil {
			return nil, nil, err
		}
		d.subs[channel] = make(map[*subscriber]struct{})
	}
	s := &subscriber{ch: make(chan *redis.Message, subBuffer)}
	d.subs[channel][s] = struct{}{}

	var once sync.Once
	cancel := func() { once.Do(func() { d.remove(channel, s) }) }
	return s.ch, cancel, nil
}

// remove 摘除一个订阅方；该 channel 变空时在共享连接上 UNSUBSCRIBE。
func (d *Dispatcher) remove(channel string, s *subscriber) {
	d.mu.Lock()
	defer d.mu.Unlock()

	set, ok := d.subs[channel]
	if !ok {
		return
	}
	if _, ok := set[s]; !ok {
		return
	}
	delete(set, s)
	s.close()
	if len(set) > 0 {
		return
	}
	delete(d.subs, channel)

	// 1→0：持写锁退订，避免与并发 Subscribe 竞态（可能把刚订上的 channel
	// 又退掉）。go-redis 的写有 WriteTimeout 兜底，锁持有时间有界。
	if err := d.pubsub.Unsubscribe(context.Background(), channel); err != nil {
		slog.Warn("pubsub unsubscribe failed", "channel", channel, "error", err)
	}
}

// Close 关闭底层 PubSub，等待消费循环退出并关闭所有订阅方 channel。
// 幂等。
func (d *Dispatcher) Close() error {
	d.closeOnce.Do(func() {
		d.mu.Lock()
		d.closed = true
		d.mu.Unlock()

		d.closeErr = d.pubsub.Close()
		<-d.done
	})
	return d.closeErr
}
