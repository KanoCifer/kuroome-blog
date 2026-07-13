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
	blogSvc     *service.BlogService
	devTaskSvc  *service.DevTaskService
	passkeySvc  *service.PasskeyService
	githubOAuth *service.GitHubOAuth
	monitorSvc  *service.MonitorService
	wssvc       *service.WSService
}

// NewAppState 组装所有 service，作为唯一的组合根入口。
func NewAppState(
	cfg *config.Config,
	userRepo *postgres.UserRepo,
	adminRepo *postgres.AdminRepo,
	visitorRepo *postgres.VisitorRepo,
	blogSvc *service.BlogService,
	devTaskSvc *service.DevTaskService,
	redis *redis.Client,
	passkeySvc *service.PasskeyService,
	wssvc *service.WSService,
) *AppState {
	userSvc := service.NewUserService(userRepo, redis, cfg.Admin.UserIDs)
	return &AppState{
		config:     cfg,
		userSvc:    userSvc,
		adminSvc:   service.NewAdminService(adminRepo, visitorRepo, redis),
		blogSvc:    blogSvc,
		devTaskSvc: devTaskSvc,
		passkeySvc: passkeySvc,
		monitorSvc: service.NewMonitorService(visitorRepo, userRepo),
		wssvc:      wssvc,
		githubOAuth: service.NewGitHubOAuth(
			redis, userRepo, userSvc,
			cfg.GitHub.ClientID, cfg.GitHub.ClientSecret, cfg.GitHub.RedirectURI,
		),
	}
}

func (a *AppState) UserSvc() *service.UserService       { return a.userSvc }
func (a *AppState) AdminSvc() *service.AdminService     { return a.adminSvc }
func (a *AppState) BlogSvc() *service.BlogService         { return a.blogSvc }
func (a *AppState) DevTaskSvc() *service.DevTaskService   { return a.devTaskSvc }
func (a *AppState) PasskeySvc() *service.PasskeyService   { return a.passkeySvc }
func (a *AppState) WSSvc() *service.WSService           { return a.wssvc }
func (a *AppState) MonitorSvc() *service.MonitorService { return a.monitorSvc }
func (a *AppState) GitHubOAuth() *service.GitHubOAuth   { return a.githubOAuth }
func (a *AppState) Cfg() *config.Config                 { return a.config }
