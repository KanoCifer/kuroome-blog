package app

import (
	"github.com/go-webauthn/webauthn/webauthn"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/repository/mongodb"
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
	systemSvc   *service.SystemService
	wssvc       *service.WSService
}

// NewAppState 组装所有 service，作为唯一的组合根入口。
//
// main.go 仅负责构造基础依赖 (db / mongo / redis / webauthn) 并传入；
// 所有 service 在此统一构造，不再散落 main.go。
func NewAppState(
	cfg *config.Config,
	db *gorm.DB,
	mongoDB *mongo.Database,
	redis *redis.Client,
	wa *webauthn.WebAuthn,
) *AppState {
	// -- repos ------------------------------------------------------- //
	userRepo := postgres.NewUserRepo(db)
	adminRepo := mongodb.NewAdminRepo(mongoDB)
	visitorRepo := postgres.NewVisitorRepo(db)
	eventRepo := postgres.NewEventRepo(db)
	passkeyRepo := postgres.NewPasskeyRepo(db)
	blogRepo := mongodb.NewBlogRepository(mongoDB)

	// -- services ---------------------------------------------------- //
	userSvc := service.NewUserService(userRepo, redis, cfg.Admin.UserIDs)
	return &AppState{
		config:     cfg,
		userSvc:    userSvc,
		adminSvc:   service.NewAdminService(adminRepo, visitorRepo, redis),
		blogSvc:    service.NewBlogService(blogRepo),
		devTaskSvc: service.NewDevTaskService(mongoDB),
		passkeySvc: service.NewPasskeyService(wa, redis, passkeyRepo, userRepo),
		monitorSvc: service.NewMonitorService(visitorRepo, userRepo),
		systemSvc:  service.NewSystemService(eventRepo),
		wssvc:      service.NewWSService(redis),
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
func (a *AppState) SystemSvc() *service.SystemService   { return a.systemSvc }
func (a *AppState) GitHubOAuth() *service.GitHubOAuth   { return a.githubOAuth }
func (a *AppState) Cfg() *config.Config                 { return a.config }
