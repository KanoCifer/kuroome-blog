package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"app/internal/config"
	"app/internal/db"
	"app/internal/handler"
	"app/internal/middleware"
	"app/internal/repository/postgres"
	"app/internal/service"
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
	userSvc := service.NewUserService(userRepo, db.GetRedis())
	userHandler := handler.NewUserHandler(userSvc)
	userHandler.RegisterRoutes(v3, middleware.AuthMiddleware())

	adminRepo := postgres.NewAdminRepo(db.GetMongo())
	adminSvc := service.NewAdminService(adminRepo, db.GetRedis())
	adminHandler := handler.NewAdminHandler(adminSvc)
	adminHandler.RegisterRoutes(v3, middleware.AdminMiddleware())

	addr := fmt.Sprintf("127.0.0.1:%d", config.Cfg.Port)
	r.Run(addr)
}
