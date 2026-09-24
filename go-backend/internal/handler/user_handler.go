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
	userservice "github.com/KanoCifer/kuroome-blog/internal/service/user"
	"github.com/KanoCifer/kuroome-blog/internal/util"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

type AccountService interface {
	GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error)
	SendEmailCode(ctx context.Context, email, mode string) bool
	RegisterFlow(ctx context.Context, username, password, email, emailCode, mode string) (*model.User, *model.Profile, error)
}

type Authenticator interface {
	Authenticate(ctx context.Context, username, password string) (*model.User, error)
	AuthenticateEmailCode(ctx context.Context, email, code string) (*model.User, *model.Profile, error)
	AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error)
	CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error)
	RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error)
	Logout(ctx context.Context, userID uint, jti string)
	SendLoginEmailCode(ctx context.Context, email string) bool
	SendMagicLoginEmail(ctx context.Context, email, mode, deviceID string) bool
	PollNomuLogin(ctx context.Context, deviceID string) (*userservice.NomuLoginState, error)
	ResetPasswordFlow(ctx context.Context, email, mode string) (challenge string, err error)
	ConfirmPasswordReset(ctx context.Context, email, code, newPassword, mode, challenge string) error
}

type UserRenderer interface {
	Render(u *model.User, p *model.Profile) map[string]any
}

var (
	_ AccountService = (*userservice.UserService)(nil)
	_ Authenticator  = (*userservice.AuthService)(nil)
	_ UserRenderer   = userservice.UserView{}
)

// UserHandler 持有业务服务，gin 路由方法挂在其上。
type UserHandler struct {
	userSvc  AccountService
	authSvc  Authenticator
	userView UserRenderer
	cfg      *config.Config
	// refreshAuthFailLimiter RefreshToken 失败路径专用, 与 ws 失败限流解耦(两个 scope,
	// 即同一坏客户端把坏循环挪到 /refresh-token 也会被同一套机制挡)。
	// nil-safe: 测试 / 未配置 Redis 场景下 Fail() 直接放行。
	refreshAuthFailLimiter *middleware.AuthFailLimiter
}

// NewUserHandler 构造 user handler。refreshLimiter 可为 nil(nil-safe)。
func NewUserHandler(
	userSvc AccountService,
	authSvc Authenticator,
	userView UserRenderer,
	cfg *config.Config,
	refreshLimiter *middleware.AuthFailLimiter,
) *UserHandler {
	return &UserHandler{
		userSvc:                userSvc,
		authSvc:                authSvc,
		userView:               userView,
		cfg:                    cfg,
		refreshAuthFailLimiter: refreshLimiter,
	}
}

func (h *UserHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if !bindJSON(c, &req) {
		return
	}

	user, err := h.authSvc.Authenticate(c.Request.Context(), req.Username, req.Password)
	if respondErr(c, err, "login failed", "username", req.Username) {
		return
	}

	tokens, err := h.authSvc.CreateTokens(c.Request.Context(), user)
	if respondErr(c, err, "create tokens error", "user_id", user.ID) {
		return
	}

	// 写入 refresh_token cookie（与 Python 端一致），供前端静默刷新。
	util.SetRefreshCookie(c, h.cfg, tokens.RefreshToken)

	// 用户字段铺平到 data 顶层（与 Python 端 user_to_dict 形状一致）。
	userData := h.userView.Render(user, user.Profile)
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

	response.Success(c, h.userView.Render(u, p))
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
	h.authSvc.Logout(c.Request.Context(), userID, jti)

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

	tokens, err := h.authSvc.RefreshTokens(c.Request.Context(), refreshToken)
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

// SendLoginEmailCode 申请 Nomu 邮箱验证码登录的邮件。
//
// 与 EmailCode 的差别：
//   - 仅 Nomu 模式（blog 不发邮件登录码）；DTO 强制 mode=nomu；
//   - 未知邮箱 / 邮件发送失败对客户端返回同一通用成功响应，隐藏账户是否存在；
//   - 复用现有 fire-and-forget 范式，但 service 内部已先写 redis 才发邮件，
//     发送失败会清掉刚写的 code key，不会留下可登录凭证。
//
// 测试需要等待后台 service 调用完成（用 channel / WaitGroup 同步）。
func (h *UserHandler) SendLoginEmailCode(c *gin.Context) {
	var req dto.LoginEmailCodeSendRequest
	if !bindJSON(c, &req) {
		return
	}
	// fire-and-forget；WithoutCancel 避免 handler 返回后 ctx 取消导致发送中断
	go h.authSvc.SendLoginEmailCode(context.WithoutCancel(c.Request.Context()), req.Email)
	response.Success(c, nil, "若该邮箱已注册，验证码已发送")
}

// LoginEmailCode 提交 Nomu 邮箱验证码完成登录。
//
// 与密码登录共用响应形态：handler 调 CreateTokens 拿 access/refresh，写
// refresh_token HttpOnly cookie，把 user dict 平铺到 data 顶层并补 access/
// refresh 字段。未知账户、错码、过期码、已消费码、错误次数耗尽 →
// service 统一返 ErrInvalidEmailCode（400「验证码无效」），handler 不区分
// 账户状态，避免侧信道枚举。
func (h *UserHandler) LoginEmailCode(c *gin.Context) {
	var req dto.LoginEmailCodeRequest
	if !bindJSON(c, &req) {
		return
	}

	u, p, err := h.authSvc.AuthenticateEmailCode(c.Request.Context(), req.Email, req.EmailCode)
	if respondErr(c, err, "email code login failed", "mode", "nomu") {
		return
	}

	tokens, err := h.authSvc.CreateTokens(c.Request.Context(), u)
	if respondErr(c, err, "create tokens error", "user_id", u.ID) {
		return
	}

	util.SetRefreshCookie(c, h.cfg, tokens.RefreshToken)
	userData := h.userView.Render(u, p)
	userData["access_token"] = tokens.AccessToken
	userData["refresh_token"] = tokens.RefreshToken
	response.Success(c, userData, "登录成功")
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

	go h.authSvc.SendMagicLoginEmail(context.WithoutCancel(c.Request.Context()), req.Email, req.Mode, req.DeviceID)
	response.Success(c, nil, "若该邮箱已注册，登录链接已发送")
}

// PollNomuLogin 扩展侧轮询 device_id 取最终登录结果。
func (h *UserHandler) PollNomuLogin(c *gin.Context) {
	deviceID := c.Param("device_id")
	if deviceID == "" {
		response.APIError(c, "device_id 不能为空", 400)
		return
	}
	state, err := h.authSvc.PollNomuLogin(c.Request.Context(), deviceID)
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

	u, p, err := h.authSvc.AuthenticateMagicLogin(c.Request.Context(), req.Token)
	if respondErr(c, err, "magic login failed") {
		return
	}

	if req.Mode == "nomu" {
		// Nomu 接法 B：service 内部已把登录结果写回 device 槽位，回调页无需关心结果。
		response.Success(c, nil, "登录已确认")
		return
	}

	// blog：浏览器域下，写 refresh cookie + 返完整登录数据。
	tokens, err := h.authSvc.CreateTokens(c.Request.Context(), u)
	if respondErr(c, err, "magic login create tokens error", "user_id", u.ID) {
		return
	}
	util.SetRefreshCookie(c, h.cfg, tokens.RefreshToken)
	userData := h.userView.Render(u, p)
	userData["access_token"] = tokens.AccessToken
	userData["refresh_token"] = tokens.RefreshToken
	response.Success(c, userData, "登录成功")
}

func (h *UserHandler) ResetPassword(c *gin.Context) {
	var req dto.ResetPasswordRequest
	if !bindJSON(c, &req) {
		return
	}

	challenge, err := h.authSvc.ResetPasswordFlow(c.Request.Context(), req.Email, req.Mode)
	if respondErr(c, err, "reset password failed", "email", req.Email) {
		return
	}

	response.Success(c, gin.H{"challenge": challenge}, "若该邮箱已注册，重置密码邮件已发送")
}

func (h *UserHandler) ConfirmPasswordReset(c *gin.Context) {
	var req dto.ResetPasswordConfirmRequest
	if !bindJSON(c, &req) {
		return
	}

	err := h.authSvc.ConfirmPasswordReset(c.Request.Context(),
		req.Email, req.EmailCode, req.NewPassword, req.Mode, req.Challenge)
	if respondErr(c, err, "confirm password reset failed", "email", req.Email) {
		return
	}

	response.Success(c, nil, "密码已重置")
}

func (h *UserHandler) RegisterRoutes(
	r *gin.RouterGroup,
	authMiddleware gin.HandlerFunc,
	loginCodeSendMW gin.HandlerFunc,
	publicMWs ...gin.HandlerFunc,
) {
	r.POST("/login", append(publicMWs, h.Login)...)
	r.POST("/register", append(publicMWs, h.Register)...)
	r.POST("/refresh-token", h.RefreshToken)
	r.POST("/logout", authMiddleware, h.Logout)
	r.GET("/me", authMiddleware, h.Me)
	r.POST("/email/code", h.EmailCode)
	// Nomu 邮箱验证码登录：发码 + 提交登录两个公开端点。
	//   /email/login-code   走独立 IP 限流器（防跨 IP 邮件轰炸），service 内部
	//                       还有 per-email 60s 冷却作为第二道闸门；
	//   /login/email-code   复用现有 loginLimiter（5/min IP），与密码登录同等待遇。
	if loginCodeSendMW != nil {
		r.POST("/email/login-code", loginCodeSendMW, h.SendLoginEmailCode)
	} else {
		r.POST("/email/login-code", h.SendLoginEmailCode)
	}
	r.POST("/login/email-code", append(publicMWs, h.LoginEmailCode)...)
	r.POST("/magic-login/consume", append(publicMWs, h.MagicLoginConsume)...)
	r.POST("/email/magic-login", append(publicMWs, h.MagicLoginEmail)...)

	r.POST("/nomu/magic-login", append(publicMWs, h.MagicLoginConsume)...)
	r.GET("/nomu/login/:device_id", h.PollNomuLogin)

	r.POST("/password/reset", append(publicMWs, h.ResetPassword)...)
	r.POST("/password/reset/confirm", append(publicMWs, h.ConfirmPasswordReset)...)
}
