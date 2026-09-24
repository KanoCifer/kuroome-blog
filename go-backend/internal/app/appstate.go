// Package app 暴露 AppState：组合根入口，持有全部 service / repo / infra。
//
// main.go 只负责构造基础依赖（db / mongo / redis / webauthn）并传入；
// 所有 service 在 NewAppState 内部统一构造，按"repos → infra → services"
// 三阶段组装，便于一眼看清依赖关系。
package app

import (
	"log/slog"

	"github.com/go-webauthn/webauthn/webauthn"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/infra/eventbus"
	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/infra/pubsub"
	"github.com/KanoCifer/kuroome-blog/internal/infra/qweather"
	"github.com/KanoCifer/kuroome-blog/internal/repository/mongodb"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	monitorsvc "github.com/KanoCifer/kuroome-blog/internal/service/monitor"
	nomuSvc "github.com/KanoCifer/kuroome-blog/internal/service/nomu"
	"github.com/KanoCifer/kuroome-blog/internal/service/nomu/blobproxy"
	"github.com/KanoCifer/kuroome-blog/internal/service/nomu/configsync"
	"github.com/KanoCifer/kuroome-blog/internal/service/syncbus"
	uploadsvc "github.com/KanoCifer/kuroome-blog/internal/service/upload"
	userservice "github.com/KanoCifer/kuroome-blog/internal/service/user"
	visitorsvc "github.com/KanoCifer/kuroome-blog/internal/service/visitor"
	wereadSvc "github.com/KanoCifer/kuroome-blog/internal/service/weread"
	"github.com/KanoCifer/kuroome-blog/pkg/emailtemplates"
	"github.com/redis/go-redis/v9"
)

// AppState 把所有可注入依赖集中到一处，对外只暴露 getter。
// router / 中间件都通过 state.XxxSvc() / state.Cfg() 等方法拿到依赖，
// 不直接读字段。
type AppState struct {
	config *config.Config

	// repos
	userRepo *postgres.UserRepo

	// infra
	syncBus    *syncbus.Bus
	dispatcher *pubsub.Dispatcher
	eventBus   eventbus.Bus

	// services
	userSvc            *userservice.UserService
	authSvc            *userservice.AuthService
	userView           userservice.UserView
	adminSvc           *service.AdminService
	visitorSvc         *visitorsvc.Tracker
	blogSvc            *service.BlogService
	devTaskSvc         *service.DevTaskService
	passkeySvc         *userservice.PasskeyService
	githubOAuth        *userservice.GitHubOAuth
	visitorAnalytics   *monitorsvc.VisitorAnalytics
	userLoginAnalytics *monitorsvc.UserLoginAnalytics
	systemMonitor      *monitorsvc.SystemMetrics
	systemSvc          *service.SystemService
	wsSvc              *service.WSService
	fishSvc            *service.FishService
	fileSvc            *uploadsvc.FileService
	imageSvc           *uploadsvc.ImageService
	avatarSvc          *uploadsvc.AvatarService
	momentSvc          *service.MomentService
	weatherSvc         *service.WeatherService
	wereadSvc          wereadSvc.Reader
	currencySvc        *service.CurrencyService
	creditSvc          *service.CreditService
	designSvc          *nomuSvc.DesignService
	nomuConfigSyncSvc  *configsync.Service
	nomuBlobProxySvc   *blobproxy.Service

	// mailer 邮件发送器，注入到 UserService.SendEmailCode / SendMagicLoginEmail。
	mailer *emailtemplates.Mailer
}

// repos 集中持有全部 repository，便于 service 构造阶段一次性取用。
type repos struct {
	user    *postgres.UserRepo
	visitor *postgres.VisitorRepo
	event   *postgres.EventRepo
	passkey *postgres.PasskeyRepo
	nomu    *postgres.NomuRepository
	fish    *mongodb.FishRepo
	admin   *mongodb.AdminRepo
	blog    *mongodb.BlogRepository
	devTask *mongodb.DevTaskRepository
	moment  *mongodb.MomentRepo
	weread  *mongodb.WeReadRepository
}

func buildRepos(db *gorm.DB, mongoDB *mongo.Database) repos {
	return repos{
		user:    postgres.NewUserRepo(db),
		visitor: postgres.NewVisitorRepo(db),
		event:   postgres.NewEventRepo(db),
		passkey: postgres.NewPasskeyRepo(db),
		nomu:    postgres.NewNomuRepository(db),
		fish:    mongodb.NewFishRepo(mongoDB),
		admin:   mongodb.NewAdminRepo(mongoDB),
		blog:    mongodb.NewBlogRepository(mongoDB),
		devTask: mongodb.NewDevTaskRepository(mongoDB),
		moment:  mongodb.NewMomentRepo(mongoDB),
		weread:  mongodb.NewWeReadRepository(mongoDB),
	}
}

// infra 集中持有跨切面基础设施：HTTP 客户端、pubsub 总线、各类签名器 / 路由器。
type infra struct {
	httpCli        *httpclient.Client
	designHTTP     *httpclient.Client
	designRouter   *nomuSvc.Router
	qweatherSigner *qweather.Signer
	dispatcher     *pubsub.Dispatcher
	syncBus        *syncbus.Bus
	eventBus       eventbus.Bus
}

func buildInfra(cfg *config.Config, rdb *redis.Client) infra {
	// 通用 HTTP 客户端：trace_id 注入 + 出站日志 + 超时。
	// weather / 未来其它出站调用都复用这一份，不另起 *http.Client。
	httpCli := httpclient.New()
	designHTTP := httpclient.WithLongTimeout()

	// design 出图服务商：同时注册方舟与 apiyi，前端按 model 自动路由
	// （gpt-image-* → apiyi；Doubao-* → 方舟）。DESIGN_PROVIDER 退化为
	// 「model 为空时的默认服务商」，不再决定谁可用。密钥各自独立，缺失
	// 只会在请求打到该服务商时才报错。
	designRouter := nomuSvc.NewRouter(
		cfg.Design.Provider,
		nomuSvc.DefaultProvider(cfg.Design.APIKey, cfg.Design.BaseURL, cfg.Design.AuthScheme),
		nomuSvc.ApiyiProvider(cfg.Design.APIYIAPIKey, cfg.Design.APIYIBaseURL),
	)

	// QWeather EdDSA 签名器。私钥未配置时不阻断启动；weather 接口会
	// 在首次请求时 fail-fast（service 层 nil signer 会 panic，可观测）。
	signer, err := qweather.NewSigner(cfg.Weather.JWTPrivateKey)
	if err != nil {
		slog.Warn("qweather signer init failed; /api/v3/weather/* will error at runtime",
			"error", err.Error())
		signer = nil
	}

	dispatcher := pubsub.NewDispatcher(rdb)
	syncBus := syncbus.NewSyncBus(rdb, dispatcher)
	syncBus.Register(syncbus.DuplicateSnapshotHandler{})
	eventBus := eventbus.NewEventBus()

	return infra{
		httpCli:        httpCli,
		designHTTP:     designHTTP,
		designRouter:   designRouter,
		qweatherSigner: signer,
		dispatcher:     dispatcher,
		syncBus:        syncBus,
		eventBus:       eventBus,
	}
}

// NewAppState 组装所有 service，作为唯一的组合根入口。
//
// 构造顺序：repos → infra → services。前两者抽到私有 helper，
// 让 service 装配阶段只剩"按字段填值"，可读性更高。
func NewAppState(
	cfg *config.Config,
	db *gorm.DB,
	mongoDB *mongo.Database,
	rdb *redis.Client,
	wa *webauthn.WebAuthn,
) *AppState {
	rs := buildRepos(db, mongoDB)
	ifc := buildInfra(cfg, rdb)

	// mailer 只暴露业务语义；生产发送先进入 EventBus，再由 handler 执行 SMTP。
	mailer := emailtemplates.NewMailer()
	mailer.RegisterEventBus(ifc.eventBus)

	// creditSvc 在 userService.RegisterFlow 收尾处调 GrantRegisterBonus 赠送 100 积分；
	// 只走密码注册 handler 这一条路径，GitHub 自动建号 / magic-login 不发。
	creditSvc := service.NewCreditService(postgres.NewCreditRepository(db))

	// frontendURLs 按 mode 索引：blog → kanocifer.chat（/auth/magic），
	// nomu → nomu.kanocifer.chat（/nomu/login），两个独立 origin。
	frontendURLs := map[string]string{
		"blog": cfg.Frontend.URLs.Blog,
		"nomu": cfg.Frontend.URLs.Nomu,
	}
	userView := userservice.NewUserView(cfg.Admin.UserIDs)
	userSvc := userservice.NewUserService(rs.user, rdb, creditSvc, mailer)
	authSvc := userservice.NewAuthService(userSvc, rdb, frontendURLs, cfg.Security.MaxRefreshDevices, mailer, userView)

	fileSvc := uploadsvc.NewFileService(&cfg.Upload)
	imageSvc := uploadsvc.NewImageService(&cfg.Upload)
	avatarSvc := uploadsvc.NewAvatarService(rs.user, &cfg.Upload)
	visitorSvc := visitorsvc.NewTracker(rs.visitor)

	return &AppState{
		config:     cfg,
		userRepo:   rs.user,
		syncBus:    ifc.syncBus,
		dispatcher: ifc.dispatcher,
		eventBus:   ifc.eventBus,

		userSvc:    userSvc,
		authSvc:    authSvc,
		userView:   userView,
		adminSvc:   service.NewAdminService(rs.admin, rdb),
		visitorSvc: visitorSvc,
		blogSvc:    service.NewBlogService(rs.blog),
		devTaskSvc: service.NewDevTaskService(rs.devTask),
		passkeySvc: userservice.NewPasskeyService(wa, userservice.NewRedisSessionStore(rdb), rs.passkey, rs.user, authSvc, userView),
		githubOAuth: userservice.NewGitHubOAuth(rdb, userSvc, authSvc,
			cfg.GitHub.ClientID, cfg.GitHub.ClientSecret, cfg.GitHub.RedirectURI),
		visitorAnalytics:   monitorsvc.NewVisitorAnalytics(rs.visitor),
		userLoginAnalytics: monitorsvc.NewUserLoginAnalytics(rs.user),
		systemMonitor:      monitorsvc.NewSystemMetrics(rs.visitor, cfg.API.Version),
		systemSvc:          service.NewSystemService(rs.event),
		wsSvc:              service.NewWSService(rdb, ifc.dispatcher),
		fishSvc:            service.NewFishService(rs.fish),
		fileSvc:            fileSvc,
		imageSvc:           imageSvc,
		avatarSvc:          avatarSvc,
		momentSvc:          service.NewMomentService(rs.moment),
		weatherSvc:         service.NewWeatherService(ifc.httpCli, rdb, cfg.Weather, ifc.qweatherSigner),
		wereadSvc:          wereadSvc.New(ifc.httpCli, rdb, rs.weread),
		currencySvc:        service.NewCurrencyService(ifc.httpCli, rdb),
		creditSvc:          creditSvc,
		designSvc:          nomuSvc.NewDesignService(ifc.designHTTP, ifc.designRouter, imageSvc, creditSvc),
		nomuConfigSyncSvc:  configsync.NewService(rs.nomu),
		nomuBlobProxySvc:   blobproxy.NewService(),

		mailer: mailer,
	}
}

// Dependency Injection
func (a *AppState) Cfg() *config.Config                                { return a.config }
func (a *AppState) UserRepo() *postgres.UserRepo                       { return a.userRepo }
func (a *AppState) UserSvc() *userservice.UserService                  { return a.userSvc }
func (a *AppState) AuthSvc() *userservice.AuthService                  { return a.authSvc }
func (a *AppState) UserView() userservice.UserView                     { return a.userView }
func (a *AppState) AdminSvc() *service.AdminService                    { return a.adminSvc }
func (a *AppState) VisitorTracker() *visitorsvc.Tracker                { return a.visitorSvc }
func (a *AppState) BlogSvc() *service.BlogService                      { return a.blogSvc }
func (a *AppState) DevTaskSvc() *service.DevTaskService                { return a.devTaskSvc }
func (a *AppState) PasskeySvc() *userservice.PasskeyService            { return a.passkeySvc }
func (a *AppState) WSSvc() *service.WSService                          { return a.wsSvc }
func (a *AppState) VisitorAnalytics() *monitorsvc.VisitorAnalytics     { return a.visitorAnalytics }
func (a *AppState) UserLoginAnalytics() *monitorsvc.UserLoginAnalytics { return a.userLoginAnalytics }
func (a *AppState) SystemMonitor() *monitorsvc.SystemMetrics           { return a.systemMonitor }
func (a *AppState) SystemSvc() *service.SystemService                  { return a.systemSvc }
func (a *AppState) GitHubOAuth() *userservice.GitHubOAuth              { return a.githubOAuth }
func (a *AppState) FishSvc() *service.FishService                      { return a.fishSvc }
func (a *AppState) FileSvc() *uploadsvc.FileService                    { return a.fileSvc }
func (a *AppState) ImageSvc() *uploadsvc.ImageService                  { return a.imageSvc }
func (a *AppState) AvatarSvc() *uploadsvc.AvatarService                { return a.avatarSvc }
func (a *AppState) MomentSvc() *service.MomentService                  { return a.momentSvc }
func (a *AppState) WeatherSvc() *service.WeatherService                { return a.weatherSvc }
func (a *AppState) WereadSvc() wereadSvc.Reader                        { return a.wereadSvc }
func (a *AppState) CurrencySvc() *service.CurrencyService              { return a.currencySvc }
func (a *AppState) CreditSvc() *service.CreditService                  { return a.creditSvc }
func (a *AppState) DesignSvc() *nomuSvc.DesignService                  { return a.designSvc }
func (a *AppState) NomuConfigSyncSvc() *configsync.Service             { return a.nomuConfigSyncSvc }
func (a *AppState) NomuBlobProxySvc() *blobproxy.Service               { return a.nomuBlobProxySvc }
func (a *AppState) SyncBus() *syncbus.Bus                              { return a.syncBus }
func (a *AppState) EventBus() eventbus.Bus                             { return a.eventBus }
func (a *AppState) Mailer() *emailtemplates.Mailer                     { return a.mailer }

func (a *AppState) PubSub() *pubsub.Dispatcher { return a.dispatcher }
