package pubsub

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestDispatcher(t *testing.T) (*Dispatcher, *miniredis.Miniredis) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close(); mr.Close() })

	d := NewDispatcher(rdb)
	t.Cleanup(func() { _ = d.Close() })
	return d, mr
}

// waitFor 轮询直到条件成立或超时。SUBSCRIBE/UNSUBSCRIBE 是异步确认的，
// miniredis 侧状态需要一点时间才更新。
func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for %s", what)
}

func recvMsg(t *testing.T, ch <-chan *redis.Message) (*redis.Message, bool) {
	t.Helper()
	select {
	case m, ok := <-ch:
		return m, ok
	case <-time.After(2 * time.Second):
		return nil, false
	}
}

// twoSubscribers 在同一 channel 上建两个订阅方，返回各自 channel 与取消函数。
func twoSubscribers(t *testing.T, d *Dispatcher, channel string) (<-chan *redis.Message, func(), <-chan *redis.Message, func()) {
	t.Helper()
	ctx := context.Background()
	ch1, cancel1, err := d.Subscribe(ctx, channel)
	if err != nil {
		t.Fatalf("Subscribe #1: %v", err)
	}
	ch2, cancel2, err := d.Subscribe(ctx, channel)
	if err != nil {
		t.Fatalf("Subscribe #2: %v", err)
	}
	return ch1, cancel1, ch2, cancel2
}

// 同 channel 两个订阅方都收到同一消息；且连接级订阅数为 1（共享连接，非每订阅方一条）。
func TestFanOutBothReceive(t *testing.T) {
	d, mr := newTestDispatcher(t)
	ch1, cancel1, ch2, cancel2 := twoSubscribers(t, d, "fanout")
	defer cancel1()
	defer cancel2()

	waitFor(t, "subscription registered", func() bool {
		return mr.PubSubNumSub("fanout")["fanout"] == 1
	})

	mr.Publish("fanout", "hello")

	m1, ok := recvMsg(t, ch1)
	if !ok || m1.Payload != "hello" {
		t.Fatalf("subscriber #1 got %v, ok=%v; want payload hello", m1, ok)
	}
	m2, ok := recvMsg(t, ch2)
	if !ok || m2.Payload != "hello" {
		t.Fatalf("subscriber #2 got %v, ok=%v; want payload hello", m2, ok)
	}

	// 两个订阅方共用一条 Redis 连接：NumSub 仍为 1。
	if n := mr.PubSubNumSub("fanout")["fanout"]; n != 1 {
		t.Fatalf("NumSub = %d, want 1 (connection decoupled from subscriber count)", n)
	}
}

// 取消其一，另一个继续收消息；被取消方的 channel 应立即关闭。
func TestCancelOneKeepsOther(t *testing.T) {
	d, mr := newTestDispatcher(t)
	ch1, cancel1, ch2, cancel2 := twoSubscribers(t, d, "keep")
	defer cancel2()

	waitFor(t, "subscription registered", func() bool {
		return mr.PubSubNumSub("keep")["keep"] == 1
	})

	cancel1()

	if _, ok := recvMsg(t, ch1); ok {
		t.Fatal("cancelled subscriber channel should be closed")
	}
	// 另一个订阅方仍在，连接级订阅不应被撤销。
	if n := mr.PubSubNumSub("keep")["keep"]; n != 1 {
		t.Fatalf("NumSub = %d after cancelling one, want 1", n)
	}

	mr.Publish("keep", "still-here")
	if m, ok := recvMsg(t, ch2); !ok || m.Payload != "still-here" {
		t.Fatalf("remaining subscriber got %v, ok=%v", m, ok)
	}
}

// 最后一个订阅方取消后，共享连接上该 channel 被 UNSUBSCRIBE。
func TestUnsubscribeWhenLastCancels(t *testing.T) {
	d, mr := newTestDispatcher(t)
	ch1, cancel1, ch2, cancel2 := twoSubscribers(t, d, "last")
	_ = ch1
	_ = ch2

	waitFor(t, "subscription registered", func() bool {
		return mr.PubSubNumSub("last")["last"] == 1
	})

	cancel1()
	if n := mr.PubSubNumSub("last")["last"]; n != 1 {
		t.Fatalf("NumSub = %d after first cancel, want 1", n)
	}

	cancel2()
	waitFor(t, "channel unsubscribed", func() bool {
		return mr.PubSubNumSub("last")["last"] == 0
	})
	if got := mr.PubSubChannels("*"); len(got) != 0 {
		t.Fatalf("PubSubChannels = %v, want empty after last cancel", got)
	}
}

// 订阅方缓冲满时丢弃消息，但不阻塞其它 channel 的投递。
func TestDropDoesNotBlockOthers(t *testing.T) {
	d, mr := newTestDispatcher(t)
	ctx := context.Background()

	full, cancelFull, err := d.Subscribe(ctx, "full")
	if err != nil {
		t.Fatalf("Subscribe full: %v", err)
	}
	defer cancelFull()
	other, cancelOther, err := d.Subscribe(ctx, "other")
	if err != nil {
		t.Fatalf("Subscribe other: %v", err)
	}
	defer cancelOther()

	waitFor(t, "both channels subscribed", func() bool {
		return mr.PubSubNumSub("full")["full"] == 1 && mr.PubSubNumSub("other")["other"] == 1
	})

	// 灌满 full 的缓冲（64）再多发 20 条；不读取该 channel。
	const overflow = 20
	for i := 0; i < subBuffer+overflow; i++ {
		mr.Publish("full", "x")
	}
	// full 之后发 other。消息按序处理：other 到达时 full 的溢出已被丢弃。
	mr.Publish("other", "unblocked")

	m, ok := recvMsg(t, other)
	if !ok || m.Payload != "unblocked" {
		t.Fatalf("other channel got %v, ok=%v; drop must not block it", m, ok)
	}

	// full 恰好保留 subBuffer 条，多出的被丢弃。
	count := 0
	for len(full) > 0 {
		<-full
		count++
	}
	if count != subBuffer {
		t.Fatalf("full buffered %d messages, want %d (overflow dropped)", count, subBuffer)
	}
}

// 取消函数幂等，重复调用不 panic。
func TestCancelIsIdempotent(t *testing.T) {
	d, _ := newTestDispatcher(t)
	_, cancel, err := d.Subscribe(context.Background(), "idem")
	if err != nil {
		t.Fatalf("Subscribe: %v", err)
	}
	cancel()
	cancel()
	cancel()
}

// Close 关闭所有订阅方 channel，range 正常退出；且 Close 后可重入。
func TestCloseClosesSubscriberChannels(t *testing.T) {
	d, _ := newTestDispatcher(t)
	ctx := context.Background()

	ch1, _, err := d.Subscribe(ctx, "c1")
	if err != nil {
		t.Fatalf("Subscribe c1: %v", err)
	}
	ch2, _, err := d.Subscribe(ctx, "c2")
	if err != nil {
		t.Fatalf("Subscribe c2: %v", err)
	}

	if err := d.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	if err := d.Close(); err != nil {
		t.Fatalf("second Close should be nil, got %v", err)
	}

	for i, ch := range []<-chan *redis.Message{ch1, ch2} {
		if _, ok := recvMsg(t, ch); ok {
			t.Fatalf("channel #%d not closed by Close", i+1)
		}
	}
	if _, _, err := d.Subscribe(ctx, "after-close"); err != ErrClosed {
		t.Fatalf("Subscribe after Close err = %v, want ErrClosed", err)
	}
}

// 并发订阅/取消/发布，配合 -race 检验发送与关闭之间的竞态。
func TestConcurrentSubscribeCancelPublish(t *testing.T) {
	d, mr := newTestDispatcher(t)
	ctx := context.Background()

	const workers = 16
	stop := make(chan struct{})
	pubDone := make(chan struct{})
	go func() {
		defer close(pubDone)
		tick := time.NewTicker(time.Millisecond)
		defer tick.Stop()
		for {
			select {
			case <-stop:
				return
			case <-tick.C:
				mr.Publish("race", "m")
			}
		}
	}()

	done := make(chan struct{}, workers)
	for i := 0; i < workers; i++ {
		go func() {
			defer func() { done <- struct{}{} }()
			for j := 0; j < 50; j++ {
				ch, cancel, err := d.Subscribe(ctx, "race")
				if err != nil {
					return
				}
				// 偶发读取，制造消费与关闭交错。
				select {
				case <-ch:
				default:
				}
				cancel()
			}
		}()
	}
	for i := 0; i < workers; i++ {
		<-done
	}
	close(stop)
	<-pubDone
}
