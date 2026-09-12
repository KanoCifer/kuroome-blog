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

type SyncBuser interface {
	Publish(ctx context.Context, userID uint, env syncbus.Envelope) error
	Replay(ctx context.Context, userID uint, deviceID string, write func(syncbus.Envelope) error) error
	Subscribe(ctx context.Context, userID uint, deviceID string) (<-chan syncbus.Envelope, func(), error)
	Ack(ctx context.Context, userID uint, deviceID, service, id string) error
	TouchPresence(ctx context.Context, userID uint, deviceID, name string) error
	Devices(ctx context.Context, userID uint) ([]syncbus.DeviceInfo, error)
	// 采集快照云端池：写入 / 列池 / 只读认领 / 认领并清除，以及池变更订阅。
	CollectionPut(ctx context.Context, userID uint, snap syncbus.CollectionSnapshot) error
	CollectionList(ctx context.Context, userID uint) ([]syncbus.CollectionSnapshot, error)
	CollectionClaim(ctx context.Context, userID uint, id string) (*syncbus.CollectionSnapshot, error)
	CollectionClaimClear(ctx context.Context, userID uint, from, id string) (*syncbus.CollectionSnapshot, error)
	SubscribeCollection(ctx context.Context, userID uint) (<-chan syncbus.CollectionSnapshotUpdate, func(), error)
}

type NomuSyncWSHandler struct {
	bus SyncBuser
}

func NewNomuSyncWSHandler(bus SyncBuser) *NomuSyncWSHandler {
	return &NomuSyncWSHandler{bus: bus}
}

func (h *NomuSyncWSHandler) RegisterRoutes(r *gin.RouterGroup, mw ...gin.HandlerFunc) {
	g := r.Group("/nomu")
	g.GET("/sync/ws", h.HandleSyncWS)
	g.GET("/sync/devices", append(mw, h.ListDevices)...)
}

type syncClientMsg struct {
	Type    string `json:"type"`
	ID      string `json:"id,omitempty"`
	To      string `json:"to,omitempty"`
	Service string `json:"service,omitempty"`
	Kind    string `json:"kind,omitempty"`
	// Source 仅 collection_put 携带：采集来源 [taobao,1688,jd,other...]。
	Source string `json:"source,omitempty"`
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
	go func() { errc <- h.readLoop(ctx, userID, deviceID, name, w) }()
	<-errc
	cancel()
	<-errc

	slog.InfoContext(reqCtx, "sync ws disconnected", "user_id", userID, "device_id", deviceID)
}

func (h *NomuSyncWSHandler) deliveryLoop(ctx context.Context, userID uint, deviceID string, w *syncWriter) error {
	ch, cancelSub, err := h.bus.Subscribe(ctx, userID, deviceID)
	if err != nil {
		return err
	}
	defer cancelSub()

	// 采集快照池订阅与设备投递共用本连接的写锁，两路并行推送互不踩踏。
	poolCh, cancelPool, err := h.bus.SubscribeCollection(ctx, userID)
	if err != nil {
		return err
	}
	defer cancelPool()

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
		case upd, ok := <-poolCh:
			if !ok {
				return nil
			}
			if err := w.write(ctx, map[string]any{"type": "collection_update", "update": upd}); err != nil {
				return err
			}
		}
	}
}

// readLoop 处理接收端的 ack/ping 与发送端的 push/采集快照池操作。
func (h *NomuSyncWSHandler) readLoop(ctx context.Context, userID uint, deviceID, name string, w *syncWriter) error {
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
		case "collection_put":
			// payload 原始 JSON 透传，服务端不解释；写入方设备名与来源由连接上下文补全。
			snap := syncbus.CollectionSnapshot{
				ID:         msg.ID,
				Source:     msg.Source,
				CapturedAt: time.Now().Unix(),
				From:       deviceID,
				Name:       name,
				Snapshot:   msg.Payload,
			}
			if err := h.bus.CollectionPut(ctx, userID, snap); err != nil {
				if werr := w.write(ctx, map[string]any{"type": "collection_put_error", "id": msg.ID, "requestId": msg.RequestID, "error": err.Error()}); werr != nil {
					return werr
				}
				continue
			}
			if err := w.write(ctx, map[string]any{"type": "collection_put_ok", "id": msg.ID, "requestId": msg.RequestID}); err != nil {
				return err
			}
		case "collection_list":
			snaps, err := h.bus.CollectionList(ctx, userID)
			frame := map[string]any{"type": "collection_list_result", "requestId": msg.RequestID}
			if err != nil {
				slog.WarnContext(ctx, "collection list failed", "error", err, "device_id", deviceID)
				frame["ok"] = false
			} else {
				frame["ok"] = true
				frame["snapshots"] = snaps
			}
			if err := w.write(ctx, frame); err != nil {
				return err
			}
		case "collection_claim", "collection_claim_clear":
			var (
				snap *syncbus.CollectionSnapshot
				err  error
			)
			if msg.Type == "collection_claim" {
				snap, err = h.bus.CollectionClaim(ctx, userID, msg.ID)
			} else {
				snap, err = h.bus.CollectionClaimClear(ctx, userID, deviceID, msg.ID)
			}
			frame := map[string]any{"type": msg.Type + "_result", "id": msg.ID, "requestId": msg.RequestID}
			if err != nil {
				slog.WarnContext(ctx, "collection claim failed", "error", err, "id", msg.ID, "device_id", deviceID)
				frame["ok"] = false
			} else {
				frame["ok"] = true
				frame["snapshot"] = snap // nil 表示条目不存在或已被他人认领
			}
			if err := w.write(ctx, frame); err != nil {
				return err
			}
		case "ping":
			if err := h.bus.TouchPresence(ctx, userID, deviceID, msg.Name); err != nil {
				return err
			}
			pong := map[string]any{"type": "pong"}
			if msg.RequestID != "" {
				pong["requestId"] = msg.RequestID
			}

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
