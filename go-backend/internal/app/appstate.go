package app

import (
	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	"github.com/redis/go-redis/v9"
)

type AppState struct {
	config      *config.Config
	userSvc     *service.UserService
	adminSvc    *service.AdminService
	passkeySvc  *service.PasskeyService
	githubOAuth *service.GitHubOAuth
}

// NewAppState 组装所有 service，作为唯一的组合根入口。
func NewAppState(
	cfg *config.Config,
	userRepo *postgres.UserRepo,
	adminRepo *postgres.AdminRepo,
	redis *redis.Client,
	passkeySvc *service.PasskeyService,
) *AppState {
	userSvc := service.NewUserService(userRepo, redis)
	return &AppState{
		config:      cfg,
		userSvc:     userSvc,
		adminSvc:    service.NewAdminService(adminRepo, redis),
		passkeySvc:  passkeySvc,
		githubOAuth: service.NewGitHubOAuth(redis, userRepo, userSvc),
	}
}

func (a *AppState) UserSvc() *service.UserService       { return a.userSvc }
func (a *AppState) AdminSvc() *service.AdminService     { return a.adminSvc }
func (a *AppState) PasskeySvc() *service.PasskeyService { return a.passkeySvc }
func (a *AppState) GitHubOAuth() *service.GitHubOAuth   { return a.githubOAuth }
func (a *AppState) Cfg() *config.Config                 { return a.config }
