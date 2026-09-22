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
	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/infra/pubsub"
	"github.com/KanoCifer/kuroome-blog/internal/infra/qweather"
	"github.com/KanoCifer/kuroome-blog/internal/repository/mongodb"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	nomuSvc "github.com/KanoCifer/kuroome-blog/internal/service/nomu"
	"github.com/KanoCifer/kuroome-blog/internal/service/syncbus"
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

	// services
	userSvc     *service.UserService
	adminSvc    *service.AdminService
	blogSvc     *service.BlogService
	devTaskSvc  *service.DevTaskService
	passkeySvc  *service.PasskeyService
	githubOAuth *service.GitHubOAuth
	monitorSvc  *service.MonitorService
	systemSvc   *service.SystemService
	wsSvc       *service.WSService
	fishSvc     *service.FishService
	uploadSvc   *service.UploadService
	momentSvc   *service.MomentService
	weatherSvc  *service.WeatherService
	wereadSvc   wereadSvc.Reader
	currencySvc *service.CurrencyService
	creditSvc   *service.CreditService
	designSvc   *nomuSvc.DesignService
	nomuSvc     *service.NomuServiceStruct

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

	return infra{
		httpCli:        httpCli,
		designHTTP:     designHTTP,
		designRouter:   designRouter,
		qweatherSigner: signer,
		dispatcher:     dispatcher,
		syncBus:        syncBus,
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

	// mailer 邮件发送器。UserService 通过它发验证码 / 魔法登录链接；
	// SMTP 未配置时 Mailer.Send* 自身返回 false，与旧 EmailChannel 行为对齐。
	mailer := emailtemplates.NewMailer()

	// creditSvc 在 userService.RegisterFlow 收尾处调 GrantRegisterBonus 赠送 100 积分；
	// 只走密码注册 handler 这一条路径，GitHub 自动建号 / magic-login 不发。
	creditSvc := service.NewCreditService(postgres.NewCreditRepository(db))

	// frontendURLs 按 mode 索引：blog → kanocifer.chat（/auth/magic），
	// nomu → nomu.kanocifer.chat（/nomu/login），两个独立 origin。
	userSvc := service.NewUserService(rs.user, rdb, cfg.Admin.UserIDs, map[string]string{
		"blog": cfg.Frontend.URLs.Blog,
		"nomu": cfg.Frontend.URLs.Nomu,
	}, cfg.Security.MaxRefreshDevices, creditSvc, mailer)

	uploadSvc := service.NewUploadService(rs.user, cfg)

	return &AppState{
		config:     cfg,
		userRepo:   rs.user,
		syncBus:    ifc.syncBus,
		dispatcher: ifc.dispatcher,

		userSvc:    userSvc,
		adminSvc:   service.NewAdminService(rs.admin, rs.visitor, rdb),
		blogSvc:    service.NewBlogService(rs.blog),
		devTaskSvc: service.NewDevTaskService(rs.devTask),
		passkeySvc: service.NewPasskeyService(wa, rdb, rs.passkey, rs.user, userSvc),
		githubOAuth: service.NewGitHubOAuth(rdb, rs.user, userSvc,
			cfg.GitHub.ClientID, cfg.GitHub.ClientSecret, cfg.GitHub.RedirectURI),
		monitorSvc:  service.NewMonitorService(rs.visitor, rs.user, cfg.API.Version),
		systemSvc:   service.NewSystemService(rs.event),
		wsSvc:       service.NewWSService(rdb, ifc.dispatcher),
		fishSvc:     service.NewFishService(rs.fish),
		uploadSvc:   uploadSvc,
		momentSvc:   service.NewMomentService(rs.moment),
		weatherSvc:  service.NewWeatherService(ifc.httpCli, rdb, cfg.Weather, ifc.qweatherSigner),
		wereadSvc:   wereadSvc.New(ifc.httpCli, rdb, rs.weread),
		currencySvc: service.NewCurrencyService(ifc.httpCli, rdb),
		creditSvc:   creditSvc,
		designSvc:   nomuSvc.NewDesignService(ifc.designHTTP, ifc.designRouter, uploadSvc, creditSvc),
		nomuSvc:     service.NewNomuService(rs.nomu),

		mailer: mailer,
	}
}

// Dependency Injection
func (a *AppState) Cfg() *config.Config                   { return a.config }
func (a *AppState) UserRepo() *postgres.UserRepo          { return a.userRepo }
func (a *AppState) UserSvc() *service.UserService         { return a.userSvc }
func (a *AppState) AdminSvc() *service.AdminService       { return a.adminSvc }
func (a *AppState) BlogSvc() *service.BlogService         { return a.blogSvc }
func (a *AppState) DevTaskSvc() *service.DevTaskService   { return a.devTaskSvc }
func (a *AppState) PasskeySvc() *service.PasskeyService   { return a.passkeySvc }
func (a *AppState) WSSvc() *service.WSService             { return a.wsSvc }
func (a *AppState) MonitorSvc() *service.MonitorService   { return a.monitorSvc }
func (a *AppState) SystemSvc() *service.SystemService     { return a.systemSvc }
func (a *AppState) GitHubOAuth() *service.GitHubOAuth     { return a.githubOAuth }
func (a *AppState) FishSvc() *service.FishService         { return a.fishSvc }
func (a *AppState) UploadSvc() *service.UploadService     { return a.uploadSvc }
func (a *AppState) MomentSvc() *service.MomentService     { return a.momentSvc }
func (a *AppState) WeatherSvc() *service.WeatherService   { return a.weatherSvc }
func (a *AppState) WereadSvc() wereadSvc.Reader           { return a.wereadSvc }
func (a *AppState) CurrencySvc() *service.CurrencyService { return a.currencySvc }
func (a *AppState) CreditSvc() *service.CreditService     { return a.creditSvc }
func (a *AppState) DesignSvc() *nomuSvc.DesignService     { return a.designSvc }
func (a *AppState) NomuSvc() *service.NomuServiceStruct   { return a.nomuSvc }
func (a *AppState) SyncBus() *syncbus.Bus                 { return a.syncBus }
func (a *AppState) Mailer() *emailtemplates.Mailer        { return a.mailer }

func (a *AppState) PubSub() *pubsub.Dispatcher { return a.dispatcher }
