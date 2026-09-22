package handler

import (
	"context"
	"log/slog"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/middleware"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	"github.com/KanoCifer/kuroome-blog/internal/util"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

// Userer 定义 handler 依赖的用户业务能力集合。
// 由 *service.UserService 隐式满足。接口在消费方（handler）一侧定义，
// 遵循 Go 的 "accept interfaces, return structs" 惯例。
type Userer interface {
	GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error)
	GetByUsername(ctx context.Context, username string) (*model.User, *model.Profile, error)
	CreateUser(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error)
	SendEmailCode(ctx context.Context, email, mode string) bool
	SendMagicLoginEmail(ctx context.Context, email, mode, deviceID string) bool
	Authenticate(ctx context.Context, username, password string) (*model.User, error)
	AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error)
	CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error)
	RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error)
	Logout(ctx context.Context, userID uint, jti string)
	UserToDict(u *model.User, p *model.Profile) map[string]any
	PollNomuLogin(ctx context.Context, deviceID string) (*service.NomuLoginState, error)
	// RegisterFlow 是 register handler 的编排入口：建账号 + 注册赠送积分。
	RegisterFlow(ctx context.Context, username, password, email, emailCode, mode string) (*model.User, *model.Profile, error)
}

var _ Userer = (*service.UserService)(nil)


// UserHandler 持有业务服务，gin 路由方法挂在其上。
type UserHandler struct {
	userSvc Userer
	cfg     *config.Config
	// refreshAuthFailLimiter RefreshToken 失败路径专用, 与 ws 失败限流解耦(两个 scope,
	// 即同一坏客户端把坏循环挪到 /refresh-token 也会被同一套机制挡)。
	// nil-safe: 测试 / 未配置 Redis 场景下 Fail() 直接放行。
	refreshAuthFailLimiter *middleware.AuthFailLimiter
}

// NewUserHandler 构造 user handler。refreshLimiter 可为 nil(nil-safe)。
func NewUserHandler(
	userSvc Userer,
	cfg *config.Config,
	refreshLimiter *middleware.AuthFailLimiter,
) *UserHandler {
	return &UserHandler{
		userSvc:                userSvc,
		cfg:                    cfg,
		refreshAuthFailLimiter: refreshLimiter,
	}
}

func (h *UserHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if !bindJSON(c, &req) {
		return
	}

	user, err := h.userSvc.Authenticate(c.Request.Context(), req.Username, req.Password)
	if respondErr(c, err, "login failed", "username", req.Username) {
		return
	}

	tokens, err := h.userSvc.CreateTokens(c.Request.Context(), user)
	if respondErr(c, err, "create tokens error", "user_id", user.ID) {
		return
	}

	// 写入 refresh_token cookie（与 Python 端一致），供前端静默刷新。
	util.SetRefreshCookie(c, h.cfg, tokens.RefreshToken)

	// 用户字段铺平到 data 顶层（与 Python 端 user_to_dict 形状一致）。
	userData := h.userSvc.UserToDict(user, user.Profile)
	userData["access_token"] = tokens.AccessToken
	userData["refresh_token"] = tokens.RefreshToken
	response.Success(c, userData, "登录成功")
}

func (h *UserHandler) Register(c *gin.Context) {
	// "/register"
	var req dto.RegisterRequest
	if !bindJSON(c, &req) {
		return
	}

	u, _, err := h.userSvc.RegisterFlow(c.Request.Context(),
		req.Username, req.Password, req.Email, req.EmailCode, req.Mode)
	if respondErr(c, err, "register failed", "username", req.Username, "email", req.Email) {
		return
	}

	response.Success(c, dto.FromUser(u, false), "注册成功")
}

func (h *UserHandler) Me(c *gin.Context) {
	// "/me"
	_, ok := c.Get("user_id")
	if !ok {
		response.APIError(c, "未授权", 401)
		return
	}

	u, p, err := h.userSvc.GetByID(c.Request.Context(), uint(c.GetInt("user_id")))
	if respondErr(c, err, "get user failed", "user_id", c.GetInt("user_id")) {
		return
	}

	response.Success(c, h.userSvc.UserToDict(u, p))
}

func (h *UserHandler) Logout(c *gin.Context) {
	_, ok := c.Get("user_id")
	if !ok {
		response.APIError(c, "未授权", 401)
		return
	}

	// 从 cookie 取 refresh token 解析 jti，删自己的 device field。
	userID := uint(c.GetInt("user_id"))
	jti := h.currentRefreshJTI(c)
	h.userSvc.Logout(c.Request.Context(), userID, jti)

	// 清除 refresh_token cookie（与 Python 端一致）。
	util.ClearRefreshCookie(c, h.cfg)
	response.Success(c, nil, "已退出登录")
}

// currentRefreshJTI 从请求的 refresh_token cookie 解析出 jti。
// cookie 缺失或解析失败时返回空串（Logout 仍会执行，只是不删 Hash field）。
func (h *UserHandler) currentRefreshJTI(c *gin.Context) string {
	cookie, err := c.Cookie("refresh_token")
	if err != nil {
		return ""
	}
	claims, err := jwt.ParseToken(cookie)
	if err != nil {
		return ""
	}
	return claims.ID
}

func (h *UserHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = c.ShouldBindJSON(&req)

	// refresh_token 优先取 body，缺失时回退到 HttpOnly cookie（与 Python 一致）。
	refreshToken := req.RefreshToken
	if refreshToken == "" {
		if cookie, err := c.Cookie("refresh_token"); err == nil {
			refreshToken = cookie
		}
	}
	if refreshToken == "" {
		response.APIError(c, "刷新令牌不存在", 401)
		return
	}

	tokens, err := h.userSvc.RefreshTokens(c.Request.Context(), refreshToken)
	if err != nil {
		slog.WarnContext(c.Request.Context(), "refresh token failed", "reason", "invalid_token")
		h.rejectRefreshInvalid(c, err)
		return
	}

	// 轮换 refresh cookie（与 Python 端一致）。
	util.SetRefreshCookie(c, h.cfg, tokens.RefreshToken)

	response.Success(c, gin.H{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
	}, "访问令牌已刷新")
}

// rejectRefreshInvalid /refresh-token 失败统一出口:失败计数 → 超阈值 429 → 否则
// 401 + code=refresh_token_expired。与 ws 失败限流语义一致,但 scope 独立(同一坏
// 客户端把循环挪到 /refresh-token 也照样被卡)。
//
// 日志:首次进入限流状态(firstHit)打 WARN,稳态中(follow-up)不打,避免坏前端
// 在限流窗口内持续刷 WARN 撑爆日志。
func (h *UserHandler) rejectRefreshInvalid(c *gin.Context, _ error) {
	if limited, firstHit, retry := h.refreshAuthFailLimiter.Fail(c); limited {
		retrySec := int(retry.Seconds())
		if retrySec < 1 {
			retrySec = 30
		}
		c.Header("Retry-After", strconv.Itoa(retrySec))
		if firstHit {
			slog.WarnContext(c.Request.Context(),
				"refresh rejected: too many auth failures (entered limit)",
				"scope", h.refreshAuthFailLimiter.Scope(),
				"client_ip", middleware.ClientIP(c),
			)
		}
		response.APIErrorWithCode(c, "too_many_auth_failures",
			"刷新令牌校验失败次数过多,请稍后再试或重新登录", 429)
		return
	}
	c.Header("WWW-Authenticate", `Bearer error="invalid_token"`)
	response.APIErrorWithCode(c, "refresh_token_expired",
		"refresh_token 已失效,请清除本地 token 后重新登录", 401)
}

// EmailCode 申请注册验证码邮件。
//
// req.Mode 决定 HTML 模板（blog 编辑式 / nomu logo + 副标）和 Redis key
// 命名空间（email_code:<email>:<mode>）。mode 缺省 / 非法值走 blog 兜底，
// DTO 用 binding:"omitempty,oneof=blog nomu" 拦截非法值。
func (h *UserHandler) EmailCode(c *gin.Context) {
	var req dto.EmailCodeRequest
	if !bindJSON(c, &req) {
		return
	}
	if req.Email == "" {
		response.APIError(c, "邮箱不能为空", 400)
		return
	}
	// fire-and-forget；WithoutCancel 避免 handler 返回后 ctx 取消导致发送中断
	go h.userSvc.SendEmailCode(context.WithoutCancel(c.Request.Context()), req.Email, req.Mode)
	response.Success(c, nil, "验证码已发送")
}

// MagicLoginEmail 申请魔法登录邮件。
//
// req.Mode 决定链接 host + Redis key 命名空间（blog / nomu），
// DTO 用 binding:"required,oneof=blog nomu" 拦截非法值。
func (h *UserHandler) MagicLoginEmail(c *gin.Context) {
	var req dto.MagicLoginEmailRequest
	if !bindJSON(c, &req) {
		return
	}

	go h.userSvc.SendMagicLoginEmail(context.WithoutCancel(c.Request.Context()), req.Email, req.Mode, req.DeviceID)
	response.Success(c, nil, "若该邮箱已注册，登录链接已发送")
}

// PollNomuLogin 扩展侧轮询 device_id 取最终登录结果。
func (h *UserHandler) PollNomuLogin(c *gin.Context) {
	deviceID := c.Param("device_id")
	if deviceID == "" {
		response.APIError(c, "device_id 不能为空", 400)
		return
	}
	state, err := h.userSvc.PollNomuLogin(c.Request.Context(), deviceID)
	if respondErr(c, err, "nomu poll error") {
		return
	}
	response.Success(c, state, "ok")
}

// MagicLoginConsume 回调页转发一次性 token 完成登录，按 mode 决定返回形态：
//   - "nomu"：service 内部已把结果写到 device 槽位，handler 只返 200；
//   - "blog"：handler 写 refresh cookie + 返 access/refresh/user dict。
//
// 缺省 / 非法 mode 走 blog 兜底。
//
// 回调页职责单一：发请求 + 不跳转；登录态由响应体或扩展轮询各自消费。
func (h *UserHandler) MagicLoginConsume(c *gin.Context) {
	var req dto.MagicLoginConsumeRequest
	if !bindJSON(c, &req) {
		return
	}

	u, p, err := h.userSvc.AuthenticateMagicLogin(c.Request.Context(), req.Token)
	if respondErr(c, err, "magic login failed") {
		return
	}

	if req.Mode == "nomu" {
		// Nomu 接法 B：service 内部已把登录结果写回 device 槽位，回调页无需关心结果。
		response.Success(c, nil, "登录已确认")
		return
	}

	// blog：浏览器域下，写 refresh cookie + 返完整登录数据。
	tokens, err := h.userSvc.CreateTokens(c.Request.Context(), u)
	if respondErr(c, err, "magic login create tokens error", "user_id", u.ID) {
		return
	}
	util.SetRefreshCookie(c, h.cfg, tokens.RefreshToken)
	userData := h.userSvc.UserToDict(u, p)
	userData["access_token"] = tokens.AccessToken
	userData["refresh_token"] = tokens.RefreshToken
	response.Success(c, userData, "登录成功")
}

func (h *UserHandler) RegisterRoutes(r *gin.RouterGroup, authMiddleware gin.HandlerFunc, publicMWs ...gin.HandlerFunc) {
	r.POST("/login", append(publicMWs, h.Login)...)
	r.POST("/register", append(publicMWs, h.Register)...)
	r.POST("/refresh-token", h.RefreshToken)
	r.POST("/logout", authMiddleware, h.Logout)
	r.GET("/me", authMiddleware, h.Me)
	r.POST("/email/code", h.EmailCode)
	r.POST("/magic-login/consume", append(publicMWs, h.MagicLoginConsume)...)
	r.POST("/email/magic-login", append(publicMWs, h.MagicLoginEmail)...)

	r.POST("/nomu/magic-login", append(publicMWs, h.MagicLoginConsume)...)
	r.GET("/nomu/login/:device_id", h.PollNomuLogin)
}
