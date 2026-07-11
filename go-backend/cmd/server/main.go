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
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
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
	var nc notification.Channel = &notification.FeishuChannel{}
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

	// 收口 gin 内部日志到 slog。访问日志由 Trace 中间件在 handler 层记录，
	// 不再输出 uvicorn 风格的独立 access 行。
	gin.DefaultWriter = logger.GinLogWriter{}
	gin.DefaultErrorWriter = logger.GinLogWriter{}

	r := gin.Default()

	wa, err := service.NewWebAuthn(config.Cfg.WebAuthn.RPID, config.Cfg.WebAuthn.Origin)
	if err != nil {
		slog.Error("init webauthn", "error", err)
	}
	passkeySvc := service.NewPasskeyService(wa, db.GetRedis(), postgres.NewPasskeyRepo(db.GetDB()), postgres.NewUserRepo(db.GetDB()))

	state := app.NewAppState(
		config.Cfg,
		postgres.NewUserRepo(db.GetDB()),
		postgres.NewAdminRepo(db.GetMongo()),
		db.GetRedis(),
		passkeySvc,
	)

	router.Setup(r, state, db.GetRedis())

	addr := fmt.Sprintf("127.0.0.1:%d", config.Cfg.Server.Port)
	r.Run(addr)
	sendBootNotification()
}
