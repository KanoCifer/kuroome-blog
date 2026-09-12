package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/coder/websocket"
	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/infra/pubsub"
)

// startListenerServer 起一个只跑 RedisListener 的 WS 服务，返回其 URL。
// 真实 handler 用 readLoop 与 RedisListener 配对：客户端断开时 read 失败 → cancel
// → RedisListener 退出并释放订阅。这里用最小 reader goroutine 复现该生命周期。
func startListenerServer(t *testing.T, svc *WSService) string {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			return
		}
		defer conn.Close(websocket.StatusNormalClosure, "")

		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()
		go func() {
			for {
				if _, _, err := conn.Read(ctx); err != nil {
					cancel()
					return
				}
			}
		}()
		_ = svc.RedisListener(ctx, conn)
	}))
	t.Cleanup(srv.Close)
	return srv.URL
}

func dialWS(t *testing.T, srvURL string) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	t.Cleanup(cancel)
	conn, _, err := websocket.Dial(ctx, strings.Replace(srvURL, "http", "ws", 1), nil)
	if err != nil {
		t.Fatalf("dial ws: %v", err)
	}
	return conn
}

func waitNumSub(t *testing.T, mr *miniredis.Miniredis, channel string, want int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if mr.PubSubNumSub(channel)[channel] == want {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for %s NumSub = %d", channel, want)
}

// TestRedisListener_SharedSubscription 两个公开 WS 连接共享同一条 pubsub 连接上的
// visitorChannel 订阅；广播双方都收到；断开其一不影响另一个。
func TestRedisListener_SharedSubscription(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	dispatcher := pubsub.NewDispatcher(rdb)
	t.Cleanup(func() { _ = dispatcher.Close(); _ = rdb.Close(); mr.Close() })

	svc := NewWSService(rdb, dispatcher)
	srvURL := startListenerServer(t, svc)

	_ = rdb.Ping(context.Background()).Err()
	baseline := mr.CurrentConnectionCount()

	conn1 := dialWS(t, srvURL)
	conn2 := dialWS(t, srvURL)

	// 两个连接订阅同一频道，连接级订阅数仍为 1。
	waitNumSub(t, mr, visitorChannel, 1)
	if got := mr.CurrentConnectionCount(); got != baseline {
		t.Fatalf("connections = %d, baseline = %d; listeners must share one pubsub conn", got, baseline)
	}

	// 广播 → 两个连接都收到同一条文本帧。
	payload := `{"type":"count","count":5}`
	if err := rdb.Publish(context.Background(), visitorChannel, payload).Err(); err != nil {
		t.Fatalf("Publish: %v", err)
	}
	for i, conn := range []*websocket.Conn{conn1, conn2} {
		rctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		_, data, err := conn.Read(rctx)
		cancel()
		if err != nil {
			t.Fatalf("conn#%d read: %v", i+1, err)
		}
		if string(data) != payload {
			t.Fatalf("conn#%d got %q, want %q", i+1, data, payload)
		}
	}

	// 断开其一：另一订阅方仍在，连接级订阅保持 1。
	_ = conn1.Close(websocket.StatusNormalClosure, "")
	if err := rdb.Publish(context.Background(), visitorChannel, payload).Err(); err != nil {
		t.Fatalf("Publish #2: %v", err)
	}
	rctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if _, _, err := conn2.Read(rctx); err != nil {
		t.Fatalf("surviving conn read after other closed: %v", err)
	}

	// 全部断开 → 订阅释放。
	_ = conn2.Close(websocket.StatusNormalClosure, "")
	waitNumSub(t, mr, visitorChannel, 0)
}
