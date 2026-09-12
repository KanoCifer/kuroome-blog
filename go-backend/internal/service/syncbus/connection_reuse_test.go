package syncbus

import (
	"context"
	"testing"
	"time"
)

// waitSub 轮询等待某 channel 在连接上的订阅数达到 want。
func waitSub(t *testing.T, mr interface {
	PubSubNumSub(...string) map[string]int
}, channel string, want int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if mr.PubSubNumSub(channel)[channel] == want {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for %s subscription count = %d", channel, want)
}

// TestSubscriptionsShareOneConnection 多个设备订阅 + 同账号多设备采集池订阅，
// 只应新增一条 Redis pubsub 连接（进程级共享 Dispatcher）。
func TestSubscriptionsShareOneConnection(t *testing.T) {
	bus, mr := newTestBus(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 预热命令池，使后续连接数增量只来自订阅。
	_ = bus.redis.Ping(ctx).Err()
	// Dispatcher 的消费循环启动时已建立共享连接，故 baseline 已含该连接；
	// 之后的订阅都不应再新增连接。
	baseline := mr.CurrentConnectionCount()

	// 3 个设备频道 + 2 个设备对同账号采集池的订阅。
	type registration struct {
		device   string
		withPool bool
	}
	regs := []registration{{"A", true}, {"B", true}, {"C", false}}

	var cancels []func()
	for _, r := range regs {
		_, cancelSub, err := bus.Subscribe(ctx, 7, r.device)
		if err != nil {
			t.Fatalf("Subscribe %s: %v", r.device, err)
		}
		cancels = append(cancels, cancelSub)
		if r.withPool {
			_, cancelPool, err := bus.SubscribeCollection(ctx, 7)
			if err != nil {
				t.Fatalf("SubscribeCollection %s: %v", r.device, err)
			}
			cancels = append(cancels, cancelPool)
		}
	}

	waitSub(t, mr, channelKey(7, "A"), 1)
	waitSub(t, mr, channelKey(7, "B"), 1)
	waitSub(t, mr, channelKey(7, "C"), 1)
	// 两台设备订阅同账号采集池，连接级仍是 1（合并在共享连接同一 channel）。
	waitSub(t, mr, collectionChannel(7), 1)

	got := mr.CurrentConnectionCount()
	if got != baseline {
		t.Fatalf("connections = %d, baseline = %d; subscriptions must reuse the shared pubsub conn", got, baseline)
	}

	for _, c := range cancels {
		c()
	}
}
