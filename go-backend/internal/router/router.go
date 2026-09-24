// Package router 集中注册所有业务路由。
//
// handler 各自通过 RegisterRoutes 挂载到传入的 *gin.RouterGroup，
// 便于按版本分组（当前统一前缀 /v3）。
package router

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/app"
	"github.com/KanoCifer/kuroome-blog/internal/handler"
	"github.com/KanoCifer/kuroome-blog/internal/middleware"
)

// Setup 装配 gin 引擎：全局中间件 + 路由注册 + 限流 + 静态媒体。
func Setup(r *gin.Engine, state *app.AppState, rdb *redis.Client) {
	// --- 全局中间件 ---------------------------------------------------- //
	// RealClientIP 最先挂：解析真实客户端 IP 写入 context，供后续限流 / 日志 /
	// 审计使用（见 middleware.ClientIP）。依赖 main.go 已 SetTrustedProxies。
	r.Use(middleware.RealClientIPMiddleware(state.Cfg().Server.TrustedProxies))
	r.Use(middleware.Duration())
	r.Use(middleware.Trace())
	r.Use(middleware.SlogMiddleware(slog.Default()))
	r.Use(middleware.CORS())

	v3 := r.Group("/v3")

	// --- 限流器 ------------------------------------------------------- //
	loginLimiter := middleware.NewRateLimiter(rdb, "login", 5, 60*time.Second)
	registerLimiter := middleware.NewRateLimiter(rdb, "register", 5, 60*time.Second)
	likeLimiter := middleware.NewRateLimiter(rdb, "like", 25, 24*time.Hour)
	currencyLimiter := middleware.NewRateLimiter(rdb, "currency", 500, time.Hour)
	// 登录发码独立限流：防止跨 IP 短时间内高频轰炸验证码接口；
	// service 层另有 per-email 60s 冷却作为第二道闸门。
	loginCodeSendLimiter := middleware.NewRateLimiter(rdb, "login_code_send", 5, 60*time.Second)

	// 认证失败路径专用限流(在 handler 失败分支里调用,与前置 RateLimiter 不同):
	//  - scope 独立:ws 走 nomu_ws_auth_fail,refresh 走 refresh_auth_fail,互不串;
	//  - 时机:前置 RateLimiter 拦的是"请求总数",这里是"业务判定失败"才计数;
	//  - 阈值 5 次/小时,见 middleware.NewAuthFailLimiter 注释。
	//  - 解决 Nomu 旧版 ws bug:refresh 过期后旧 AT 仍反复重连 → 5 次后 429 顶回。
	refreshAuthFailLimiter := middleware.NewAuthFailLimiter(rdb, "refresh_auth_fail")
	nomuWSAuthFailLimiter := middleware.NewAuthFailLimiter(rdb, "nomu_ws_auth_fail")

	// --- 鉴权 & 用户域 -------------------------------------------------- //
	auth := middleware.AuthMiddleware()
	adminOnly := middleware.AdminMiddleware(state.Cfg().Admin.UserIDs)

	userH := handler.NewUserHandler(state.UserSvc(), state.AuthSvc(), state.UserView(), state.Cfg(), refreshAuthFailLimiter)
	userH.RegisterRoutes(v3, auth, loginCodeSendLimiter.Middleware(), loginLimiter.Middleware(), registerLimiter.Middleware())

	adminH := handler.NewAdminHandler(state.AdminSvc(), state.VisitorTracker(), state.Cfg())
	adminH.RegisterRoutes(v3, auth, adminOnly)

	passkeyH := handler.NewPasskeyHandler(state.PasskeySvc(), state.Cfg())
	passkeyH.RegisterRoutes(v3, auth)

	githubH := handler.NewGitHubHandler(state.GitHubOAuth(), state.Cfg())
	githubH.RegisterRoutes(v3, auth)

	// --- 内容 & 工具域 -------------------------------------------------- //
	blogH := handler.NewBlogHandler(state.BlogSvc())
	blogH.RegisterRoutes(v3)

	momentH := handler.NewMomentHandler(state.MomentSvc())
	momentH.RegisterRoutes(v3, auth, adminOnly)

	fishH := handler.NewFishHandler(state.FishSvc())
	// fish：GET 列表/详情公开；POST / PATCH / DELETE 需 admin 中间件。
	fishH.RegisterRoutes(v3, auth, adminOnly)

	systemH := handler.NewSystemHandler(state.SystemSvc())
	systemH.RegisterRoutes(v3)

	socialH := handler.NewSocialHandler(rdb)
	socialH.RegisterRoutes(v3, likeLimiter.Middleware())

	deployH := handler.NewDeployHandler(state.Cfg())
	deployH.RegisterRoutes(v3)

	monitorH := handler.NewMonitorHandler(state.VisitorTracker(), state.VisitorAnalytics(), state.UserLoginAnalytics(), state.SystemMonitor(), state.Cfg())
	monitorH.RegisterRoutes(v3, auth, adminOnly)
	// 向后兼容：旧版 /track → 新的 /status/track。
	v3.POST("/track", monitorH.TrackVisitor)

	amapH := handler.NewAmapHandler(state.Cfg())
	amapH.RegisterRoutes(v3)

	weatherH := handler.NewWeatherHandler(state.WeatherSvc())
	// weather：公开访问，对齐 Python 端 /api/v2/weather/*。
	weatherH.RegisterRoutes(v3)

	wereadH := handler.NewWereadHandler(state.WereadSvc())
	wereadH.RegisterRoutes(v3, auth)

	currencyH := handler.NewCurrencyHandler(state.CurrencySvc())
	currencyH.RegisterRoutes(v3, currencyLimiter.Middleware())

	// --- 上传 & 静态媒体 ----------------------------------------------- //
	uploadH := handler.NewUploadHandler(state.FileSvc(), state.ImageSvc(), state.AvatarSvc(), state.UserSvc(), state.UserView())
	uploadH.RegisterRoutes(v3, auth)

	// 媒体静态服务：把上传的文件以 /v3/media/* 暴露，对齐 handler 返回的 url。
	// 挂在 Static 前，给响应打上公共缓存头，让 CDN 缓存命中（7d，uuid 命名不可变）。
	r.Use(middleware.MediaCacheMiddleware())
	r.Static("/v3/media", state.Cfg().Upload.UploadDir)

	// --- 名目(nomu)域 -------------------------------------------------- //
	designH := handler.NewDesignHandler(state.DesignSvc())
	// design：出图按张预扣积分（余额不足 402，失败退款），要求登录。
	designH.RegisterRoutes(v3, auth)

	nomuH := handler.NewNomuHandler(state.NomuConfigSyncSvc(), state.NomuBlobProxySvc())
	// nomu config sync：云端配置同步，要求登录。
	nomuH.RegisterRoutes(v3, auth)

	// nomu 多设备同步总线：/sync/ws 走 query token 自鉴权，/sync/devices 走 Bearer。
	// 注入 ws 失败专用限流器(scope=nomu_ws_auth_fail),阈值 5/hour。
	syncH := handler.NewNomuSyncWSHandler(state.SyncBus(), nomuWSAuthFailLimiter)
	syncH.RegisterRoutes(v3, auth)

	// --- 实时通信 ----------------------------------------------------- //
	wsH := handler.NewWSHandler(state.WSSvc())
	wsH.RegisterRoutes(v3)

	// --- 积分 & 内部工具 --------------------------------------------- //
	// credits：余额/流水明细挂 Auth；admin grant 必先 Auth 再 Admin（docs/rules/auth.md）。
	// grant 支持 email → user_id 解析（task-557），需要 UserRepo。
	creditH := handler.NewCreditHandler(state.CreditSvc(), state.UserRepo())
	creditH.RegisterRoutes(v3, auth, adminOnly)

	// devtask 看板：内部工具，先 DevTaskMiddleware 再 Auth + Admin。
	devTaskH := handler.NewDevTaskHandler(state.DevTaskSvc(), state.Cfg())
	devTaskH.RegisterRoutes(v3, middleware.DevTaskMiddleware(), auth, adminOnly)
}
