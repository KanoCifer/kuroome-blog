package app

import (
	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	"github.com/redis/go-redis/v9"
)

type AppState struct {
	config   *config.Config
	userSvc  *service.UserService
	adminSvc *service.AdminService
}

// NewAppState 组装所有 service，作为唯一的组合根入口。
func NewAppState(
	config *config.Config,
	userRepo *postgres.UserRepo,
	adminRepo *postgres.AdminRepo,
	redis *redis.Client,
) *AppState {
	return &AppState{
		config:   config,
		userSvc:  service.NewUserService(userRepo, redis),
		adminSvc: service.NewAdminService(adminRepo, redis),
	}
}

func (a *AppState) UserSvc() *service.UserService   { return a.userSvc }
func (a *AppState) AdminSvc() *service.AdminService { return a.adminSvc }
func (a *AppState) Cfg() *config.Config             { return a.config }
