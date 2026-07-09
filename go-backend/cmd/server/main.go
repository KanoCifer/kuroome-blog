package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/app"
	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/db"
	"github.com/KanoCifer/kuroome-blog/internal/handler"
	"github.com/KanoCifer/kuroome-blog/internal/middleware"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

func init() {
	config.Load()
}

func main() {
	if err := db.InitDB(); err != nil {
		log.Fatal(err)
	}
	if err := db.InitMongo(); err != nil {
		log.Fatal(err)
	}
	if err := db.InitRedis(); err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	r := gin.Default()
	api := r.Group("/api")
	v3 := api.Group("/v3")

	userRepo := postgres.NewUserRepo(db.GetDB())
	adminRepo := postgres.NewAdminRepo(db.GetMongo())
	passkeyRepo := postgres.NewPasskeyRepo(db.GetDB())

	wa, err := service.NewWebAuthn()
	if err != nil {
		log.Fatal(err)
	}
	passkeySvc := service.NewPasskeyService(wa, db.GetRedis(), passkeyRepo, userRepo)

	state := app.NewAppState(config.Cfg, userRepo, adminRepo, db.GetRedis(), passkeySvc)

	userHandler := handler.NewUserHandler(state.UserSvc())
	userHandler.RegisterRoutes(v3, middleware.AuthMiddleware())

	adminHandler := handler.NewAdminHandler(state.AdminSvc())
	adminHandler.RegisterRoutes(v3, middleware.AuthMiddleware(), middleware.AdminMiddleware())

	passkeyHandler := handler.NewPasskeyHandler(state.PasskeySvc(), state.UserSvc())
	passkeyHandler.RegisterRoutes(v3, middleware.AuthMiddleware())

	githubHandler := handler.NewGitHubHandler(state.GitHubOAuth())
	githubHandler.RegisterRoutes(v3, middleware.AuthMiddleware())

	addr := fmt.Sprintf("127.0.0.1:%d", config.Cfg.Port)
	r.Run(addr)
}
