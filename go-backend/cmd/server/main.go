package main

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/app"
	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/db"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/router"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

func init() {
	config.Load()
}

func sendBootNotification() {
	if !config.Cfg.Admin.SendBootEmail || config.Cfg.Feishu.WebhookURL == "" {
		slog.Info("boot notification disabled")
		return
	}
	nc := notification.NewFeishuChannel()
	var msg notification.Message = notification.Message{
		Title: "Go Backend Booted",
		Body:  "Go Backend Booted successfully",
		Color: "green",
	}
	if !nc.Send(context.Background(), msg, notification.NotificationContext{}) {
		slog.Error("send boot notification")
	}
}

func main() {
	logger.Init(config.Cfg)

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

	wa, err := service.NewWebAuthn(config.Cfg.WebAuthn.RPID, config.Cfg.WebAuthn.Origin)
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

	router.Setup(r, state, db.GetRedis())

	sendBootNotification()

	addr := fmt.Sprintf("127.0.0.1:%d", config.Cfg.Server.Port)
	r.Run(addr)
}
