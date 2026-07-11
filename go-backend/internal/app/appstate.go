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
	passkeySvc  *service.PasskeyService
	githubOAuth *service.GitHubOAuth
}

// NewAppState 组装所有 service，作为唯一的组合根入口。
func NewAppState(
	cfg *config.Config,
	userRepo *postgres.UserRepo,
	adminRepo *postgres.AdminRepo,
	blogSvc *service.BlogService,
	redis *redis.Client,
	passkeySvc *service.PasskeyService,
) *AppState {
	userSvc := service.NewUserService(userRepo, redis, cfg.Admin.UserIDs)
	return &AppState{
		config:     cfg,
		userSvc:    userSvc,
		adminSvc:   service.NewAdminService(adminRepo, redis),
		blogSvc:    blogSvc,
		passkeySvc: passkeySvc,
		githubOAuth: service.NewGitHubOAuth(
			redis, userRepo, userSvc,
			cfg.GitHub.ClientID, cfg.GitHub.ClientSecret, cfg.GitHub.RedirectURI,
		),
	}
}

func (a *AppState) UserSvc() *service.UserService       { return a.userSvc }
func (a *AppState) AdminSvc() *service.AdminService     { return a.adminSvc }
func (a *AppState) BlogSvc() *service.BlogService       { return a.blogSvc }
func (a *AppState) PasskeySvc() *service.PasskeyService { return a.passkeySvc }
func (a *AppState) GitHubOAuth() *service.GitHubOAuth   { return a.githubOAuth }
func (a *AppState) Cfg() *config.Config                 { return a.config }
