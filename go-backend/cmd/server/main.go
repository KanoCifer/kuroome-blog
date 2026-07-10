package main

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/app"
	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/db"
	"github.com/KanoCifer/kuroome-blog/internal/handler"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/middleware"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

func init() {
	config.Load()
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

	r := gin.Default()
	r.Use(middleware.CORS())
	api := r.Group("/api")
	v3 := api.Group("/v3")

	userRepo := postgres.NewUserRepo(db.GetDB())
	adminRepo := postgres.NewAdminRepo(db.GetMongo())
	passkeyRepo := postgres.NewPasskeyRepo(db.GetDB())

	wa, err := service.NewWebAuthn(config.Cfg.WebAuthn.RPID, config.Cfg.WebAuthn.Origin)
	if err != nil {
		slog.Error("init webauthn", "error", err)
	}
	passkeySvc := service.NewPasskeyService(wa, db.GetRedis(), passkeyRepo, userRepo)

	state := app.NewAppState(config.Cfg, userRepo, adminRepo, db.GetRedis(), passkeySvc)

	// 限流: 登录 / 注册各 5 次 / 分钟
	loginLimiter := middleware.NewRateLimiter(db.GetRedis(), "login", 5, 60*time.Second)
	registerLimiter := middleware.NewRateLimiter(db.GetRedis(), "register", 5, 60*time.Second)

	userHandler := handler.NewUserHandler(state.UserSvc(), state.Cfg())
	userHandler.RegisterRoutes(v3, middleware.AuthMiddleware(), loginLimiter.Middleware(), registerLimiter.Middleware())

	adminHandler := handler.NewAdminHandler(state.AdminSvc(), state.Cfg())
	adminHandler.RegisterRoutes(v3, middleware.AuthMiddleware(), middleware.AdminMiddleware(state.Cfg().Admin.UserIDs))

	passkeyHandler := handler.NewPasskeyHandler(state.PasskeySvc(), state.UserSvc(), state.Cfg())
	passkeyHandler.RegisterRoutes(v3, middleware.AuthMiddleware())

	githubHandler := handler.NewGitHubHandler(state.GitHubOAuth(), state.Cfg())
	githubHandler.RegisterRoutes(v3, middleware.AuthMiddleware())

	addr := fmt.Sprintf("127.0.0.1:%d", state.Cfg().Server.Port)
	r.Run(addr)
}
