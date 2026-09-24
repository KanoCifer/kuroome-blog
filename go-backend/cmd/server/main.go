package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/app"
	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/db"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/router"
	userservice "github.com/KanoCifer/kuroome-blog/internal/service/user"
	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

func main() {
	config.Load()
	logger.Init(config.Cfg)

	// 监听 SIGINT / SIGTERM；第一次信号触发 graceful shutdown，没有二次强制。
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := db.InitDB(); err != nil {
		slog.Error("init db", "error", err)
	}
	if err := db.InitMongo(); err != nil {
		slog.Error("init mongo", "error", err)
	}
	if err := db.InitRedis(); err != nil {
		slog.Error("init redis", "error", err)
	}
	defer db.Close()

	// 收口 gin 内部日志到 slog。访问日志由 SlogMiddleware 单行结构化输出，
	// 不再经过 gin 默认的 plaintext Logger。
	gin.DefaultWriter = logger.GinLogWriter{}
	gin.DefaultErrorWriter = logger.GinLogWriter{}

	// gin.New() 而非 gin.Default()：收口 gin 内部日志到 slog（见 GinLogWriter）后，
	// 显式挂载 Recovery + SlogMiddleware，替代默认的 plaintext Logger。
	r := gin.New()
	r.Use(gin.Recovery())

	// 可信反向代理（同机 nginx 等）：限制 gin 内置 ClientIP() 只信任这些来源，
	// 覆盖默认"信任所有代理"的行为。真实 IP 的统一解析见 RealClientIPMiddleware。
	if err := r.SetTrustedProxies(config.Cfg.Server.TrustedProxies); err != nil {
		slog.Warn("set trusted proxies", "error", err.Error())
	}

	wa, err := userservice.NewWebAuthn(config.Cfg.WebAuthn.RPID, config.Cfg.WebAuthn.Origin)
	if err != nil {
		slog.Error("init webauthn", "error", err)
	}

	state := app.NewAppState(
		config.Cfg,
		db.GetDB(),
		db.GetMongoDB(),
		db.GetRedis(),
		wa,
	)
	// 退出时关闭共享 pubsub 连接（幂等）。
	defer func() { _ = state.PubSub().Close() }()

	router.Setup(r, state, db.GetRedis())
	sendBootNotification()

	addr := fmt.Sprintf("127.0.0.1:%d", config.Cfg.Server.Port)

	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("http server failed", "error", err.Error())
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err.Error())
	}
	sendShutdownNotification(err)

	slog.Warn("server exiting")
}

// sendShutdownNotification → Feishu webhook 退出通知。正常退出灰色，异常退出
// 红色。复用 SendBootEmail 开关；进程即将退出，独立 5s 超时避免 webhook 抖动
// 拖死进程。
func sendShutdownNotification(shutdownErr error) {
	if !config.Cfg.Admin.SendBootEmail || config.Cfg.Feishu.WebhookURL == "" {
		reason := "send_boot_email_disabled"
		if config.Cfg.Feishu.WebhookURL == "" {
			reason = "feishu_webhook_unset"
		}
		slog.Debug("shutdown notification disabled", "reason", reason)
		return
	}
	body, color := "Go Backend exited normally", "grey"
	if shutdownErr != nil {
		body = "Go Backend exited with error: " + shutdownErr.Error()
		color = "red"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	nc := notification.NewFeishuChannel()
	if !nc.Send(ctx, notification.Message{
		Title: "Go Backend Exited",
		Body:  body,
		Color: color,
	}, notification.NotificationContext{}) {
		slog.Error("send shutdown notification", "reason", "send_returned_false")
	}
}

// sendBootEmail → Feishu webhook 启动通知。配置缺失或开关关闭时 Debug 跳过。
func sendBootNotification() {
	if !config.Cfg.Admin.SendBootEmail || config.Cfg.Feishu.WebhookURL == "" {
		reason := "send_boot_email_disabled"
		if config.Cfg.Feishu.WebhookURL == "" {
			reason = "feishu_webhook_unset"
		}
		slog.Debug("boot notification disabled", "reason", reason)
		return
	}
	nc := notification.NewFeishuChannel()
	if !nc.Send(context.Background(), notification.Message{
		Title: "Go Backend Booted",
		Body:  "Go Backend Booted successfully",
		Color: "green",
	}, notification.NotificationContext{}) {
		slog.Error("send boot notification", "reason", "send_returned_false")
	}
}
