package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service/syncbus"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

// SyncBuser 是 handler 依赖的同步总线窄接口，*syncbus.Bus 满足。
type SyncBuser interface {
	Publish(ctx context.Context, userID uint, env syncbus.Envelope) error
	Replay(ctx context.Context, userID uint, deviceID string, write func(syncbus.Envelope) error) error
	Subscribe(ctx context.Context, userID uint, deviceID string) (<-chan syncbus.Envelope, func(), error)
	Ack(ctx context.Context, userID uint, deviceID, service, id string) error
	TouchPresence(ctx context.Context, userID uint, deviceID, name string) error
	Devices(ctx context.Context, userID uint) ([]syncbus.DeviceInfo, error)
}

type NomuSyncWSHandler struct {
	bus SyncBuser
}

func NewNomuSyncWSHandler(bus SyncBuser) *NomuSyncWSHandler {
	return &NomuSyncWSHandler{bus: bus}
}

// RegisterRoutes 挂载同步总线路由。
// /sync/ws 用 query token 自鉴权（浏览器 WebSocket 无法设置 Authorization 头）；
// /sync/devices 走常规 Bearer，供发送端列举目标设备。
func (h *NomuSyncWSHandler) RegisterRoutes(r *gin.RouterGroup, mw ...gin.HandlerFunc) {
	g := r.Group("/nomu")
	g.GET("/sync/ws", h.HandleSyncWS)
	g.GET("/sync/devices", append(mw, h.ListDevices)...)
}

// syncClientMsg 是接收端/发送端 → 服务端的控制消息。
type syncClientMsg struct {
	Type    string          `json:"type"`
	ID      string          `json:"id,omitempty"`
	To      string          `json:"to,omitempty"`
	Service string          `json:"service,omitempty"`
	Kind    string          `json:"kind,omitempty"`
	// Name 仅 ping 携带：心跳顺带刷新设备名（如店铺 code 变更）。空则保留旧名。
	Name    string          `json:"name,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
	// RequestID 由客户端生成，服务端在响应帧原样回传，供客户端关联请求。
	RequestID string `json:"requestId,omitempty"`
}

// HandleSyncWS Nomu 同步设备长连接：鉴权 → 回放积压 → 实时投递/确认循环。
func (h *NomuSyncWSHandler) HandleSyncWS(c *gin.Context) {
	token := c.Query("token")
	deviceID := c.Query("device_id")
	name := c.Query("name")
	if token == "" || deviceID == "" {
		response.APIError(c, "token and device_id are required", 400)
		return
	}
	if name == "" {
		name = deviceID
	}

	claims, err := jwt.ParseToken(token)
	if err != nil {
		response.APIError(c, "invalid token", 401)
		return
	}
	uid, err := strconv.Atoi(claims.Subject)
	if err != nil {
		response.APIError(c, "invalid token", 401)
		return
	}
	userID := uint(uid)

	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "sync ws accept failed", "error", err)
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "closed")

	reqCtx := c.Request.Context()
	if err := h.bus.TouchPresence(reqCtx, userID, deviceID, name); err != nil {
		slog.ErrorContext(reqCtx, "sync ws presence failed", "error", err)
		return
	}
	slog.InfoContext(reqCtx, "sync ws connected", "user_id", userID, "device_id", deviceID, "name", name)

	ctx, cancel := context.WithCancel(reqCtx)
	defer cancel()

	w := &syncWriter{conn: conn}
	errc := make(chan error, 2)
	go func() { errc <- h.deliveryLoop(ctx, userID, deviceID, w) }()
	go func() { errc <- h.readLoop(ctx, userID, deviceID, w) }()
	<-errc
	cancel()
	<-errc

	slog.InfoContext(reqCtx, "sync ws disconnected", "user_id", userID, "device_id", deviceID)
}

// deliveryLoop 先订阅实时投递，再回放队列积压。
// 顺序不能反：先回放再订阅会留下「回放读完 → 订阅生效」的窗口，落在窗口里的
// Publish 其 pubsub 消息早于 Receive 被丢弃，只能等下次重连 —— 对常驻 UI 页
// 可能是无限期。先订阅只可能让窗口内的条目重复投递一次（回放与实时各一次），
// 由接收端幂等入队 + ack 幂等吸收。
func (h *NomuSyncWSHandler) deliveryLoop(ctx context.Context, userID uint, deviceID string, w *syncWriter) error {
	ch, cancelSub, err := h.bus.Subscribe(ctx, userID, deviceID)
	if err != nil {
		return err
	}
	defer cancelSub()
	if err := h.bus.Replay(ctx, userID, deviceID, func(env syncbus.Envelope) error {
		return w.write(ctx, env)
	}); err != nil {
		return err
	}
	for {
		select {
		case <-ctx.Done():
			return nil
		case env, ok := <-ch:
			if !ok {
				return nil
			}
			if err := w.write(ctx, env); err != nil {
				return err
			}
		}
	}
}

// readLoop 处理接收端的 ack/ping 与发送端的 push。
func (h *NomuSyncWSHandler) readLoop(ctx context.Context, userID uint, deviceID string, w *syncWriter) error {
	for {
		var msg syncClientMsg
		if err := wsjson.Read(ctx, w.conn, &msg); err != nil {
			return err
		}
		switch msg.Type {
		case "push":
			env := syncbus.Envelope{
				Service: msg.Service,
				Kind:    msg.Kind,
				ID:      msg.ID,
				From:    deviceID,
				To:      msg.To,
				SentAt:  time.Now().Unix(),
				Payload: msg.Payload,
			}
			if err := h.bus.Publish(ctx, userID, env); err != nil {
				if werr := w.write(ctx, map[string]any{"type": "push_error", "id": msg.ID, "requestId": msg.RequestID, "error": err.Error()}); werr != nil {
					return werr
				}
				continue
			}
			if err := w.write(ctx, map[string]any{"type": "push_ok", "id": msg.ID, "requestId": msg.RequestID}); err != nil {
				return err
			}
		case "ack":
			if err := h.bus.Ack(ctx, userID, deviceID, msg.Service, msg.ID); err != nil {
				if !errors.Is(err, syncbus.ErrServiceUnknown) {
					slog.WarnContext(ctx, "sync ack failed", "error", err, "id", msg.ID)
				}
				continue
			}
		case "ping":
			// 心跳可带 name 刷新设备名；空则保留握手时写入的名字。
			if err := h.bus.TouchPresence(ctx, userID, deviceID, msg.Name); err != nil {
				return err
			}
			pong := map[string]any{"type": "pong"}
			if msg.RequestID != "" {
				pong["requestId"] = msg.RequestID
			}
			// 心跳顺带回当前已知设备(含 online 标记),扩展侧据此即时刷新设备选择器;
			// Devices 读失败只少一个字段,不影响 pong 本身的保活语义。
			if devices, err := h.bus.Devices(ctx, userID); err == nil {
				pong["devices"] = devices
			}
			if err := w.write(ctx, pong); err != nil {
				return err
			}
		}
	}
}

// ListDevices GET /v3/nomu/sync/devices
func (h *NomuSyncWSHandler) ListDevices(c *gin.Context) {
	userID := uint(c.GetInt("user_id"))
	devices, err := h.bus.Devices(c.Request.Context(), userID)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "list sync devices failed", "error", err)
		response.APIError(c, "internal error", 500)
		return
	}
	response.Success(c, devices, "ok")
}

// syncWriter 串行化对同一连接的写（deliveryLoop 与 readLoop 都会写）。
type syncWriter struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

func (w *syncWriter) write(ctx context.Context, v any) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	return wsjson.Write(ctx, w.conn, v)
}
