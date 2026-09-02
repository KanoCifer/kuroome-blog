package handler

import (
	"context"
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	"github.com/KanoCifer/kuroome-blog/internal/util"
)

type Userer interface {
	Authenticate(ctx context.Context, username, password string) (*model.User, error)
	AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error)
	CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error)
	CreateUser(ctx context.Context, username, password, email, emailCode, avatarURL, mode string) (*model.User, *model.Profile, error)
	GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error)
	Logout(ctx context.Context, userID uint)
	RefreshTokens(ctx context.Context, refreshToken string) (*dto.TokensResponse, error)
	UserToDict(u *model.User, p *model.Profile) map[string]any
	SendEmailCode(ctx context.Context, email, mode string) bool
	SendMagicLoginEmail(ctx context.Context, email, mode, deviceID string) bool
	PollNomuLogin(ctx context.Context, deviceID string) (*service.NomuLoginState, error)
}

// UserHandler 持有业务服务，gin 路由方法挂在其上。
type UserHandler struct {
	userSvc Userer
	cfg     *config.Config
}

func NewUserHandler(userSvc Userer, cfg *config.Config) *UserHandler {
	return &UserHandler{userSvc: userSvc, cfg: cfg}
}

func (h *UserHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body")
		return
	}

	user, err := h.userSvc.Authenticate(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		if errors.Is(err, usererrs.ErrInvalidCredentials) {
			slog.WarnContext(c.Request.Context(), "login failed", "reason", "invalid_credentials", "username", req.Username)
			response.APIError(c, err.Error(), 401)
			return
		}
		slog.ErrorContext(c.Request.Context(), "login error", "error", err, "username", req.Username)
		response.APIError(c, "server error", 500)
		return
	}

	tokens, err := h.userSvc.CreateTokens(c.Request.Context(), user)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "create tokens error", "error", err, "user_id", user.ID)
		response.APIError(c, "server error", 500)
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
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body")
		return
	}

	u, _, err := h.userSvc.CreateUser(c.Request.Context(), req.Username, req.Password, req.Email, req.EmailCode, "", req.Mode)
	if err != nil {
		switch {
		case errors.Is(err, usererrs.ErrUserExists):
			slog.WarnContext(c.Request.Context(), "register failed", "reason", "user_exists", "username", req.Username)
			response.APIError(c, err.Error(), 409)
		case errors.Is(err, usererrs.ErrEmailExists):
			slog.WarnContext(c.Request.Context(), "register failed", "reason", "email_exists", "email", req.Email)
			response.APIError(c, err.Error(), 409)
		case errors.Is(err, usererrs.ErrInvalidEmailCode):
			slog.WarnContext(c.Request.Context(), "register failed", "reason", "invalid_email_code", "email", req.Email)
			response.APIError(c, err.Error(), 400)
		default:
			slog.ErrorContext(c.Request.Context(), "register error", "error", err, "username", req.Username)
			response.APIError(c, "server error", 500)
		}
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
	if err != nil {
		if errors.Is(err, usererrs.ErrUserNotFound) {
			slog.WarnContext(c.Request.Context(), "get user failed", "reason", "user_not_found", "user_id", c.GetInt("user_id"))
			response.APIError(c, "用户不存在", 404)
			return
		}
		slog.ErrorContext(c.Request.Context(), "get user error", "error", err, "user_id", c.GetInt("user_id"))
		response.APIError(c, "server error", 500)
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

	h.userSvc.Logout(c.Request.Context(), uint(c.GetInt("user_id")))
	// 清除 refresh_token cookie（与 Python 端一致）。
	util.ClearRefreshCookie(c, h.cfg)
	response.Success(c, nil, "已退出登录")
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
		response.APIError(c, err.Error(), 401)
		return
	}

	// 轮换 refresh cookie（与 Python 端一致）。
	util.SetRefreshCookie(c, h.cfg, tokens.RefreshToken)

	response.Success(c, gin.H{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
	}, "访问令牌已刷新")
}

// EmailCode 申请注册验证码邮件。
//
// req.Mode 决定 HTML 模板（blog 编辑式 / nomu logo + 副标）和 Redis key
// 命名空间（email_code:<email>:<mode>）。mode 缺省 / 非法值走 blog 兜底，
// DTO 用 binding:"omitempty,oneof=blog nomu" 拦截非法值。
func (h *UserHandler) EmailCode(c *gin.Context) {
	var req dto.EmailCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error(), 400)
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
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error(), 400)
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
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "nomu poll error", "error", err)
		response.APIError(c, "server error", 500)
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
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error(), 400)
		return
	}

	u, p, err := h.userSvc.AuthenticateMagicLogin(c.Request.Context(), req.Token)
	if err != nil {
		switch {
		case errors.Is(err, usererrs.ErrInvalidMagicToken):
			slog.WarnContext(c.Request.Context(), "magic login failed", "reason", "invalid_token")
			response.APIError(c, err.Error(), 401)
		case errors.Is(err, usererrs.ErrUserNotFound):
			slog.WarnContext(c.Request.Context(), "magic login failed", "reason", "user_not_found")
			response.APIError(c, "用户不存在", 404)
		default:
			slog.ErrorContext(c.Request.Context(), "magic login error", "error", err)
			response.APIError(c, "server error", 500)
		}
		return
	}

	if req.Mode == "nomu" {
		// Nomu 接法 B：service 内部已把登录结果写回 device 槽位，回调页无需关心结果。
		response.Success(c, nil, "登录已确认")
		return
	}

	// blog：浏览器域下，写 refresh cookie + 返完整登录数据。
	tokens, err := h.userSvc.CreateTokens(c.Request.Context(), u)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "magic login create tokens error", "error", err, "user_id", u.ID)
		response.APIError(c, "server error", 500)
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
	// Nomu 接法 B：回调页转发 token（公开 + 限流） + 扩展轮询 device_id（公开，
	// 不挂限流：扩展以 300ms~3s 间隔持续轮询，login/register 的 5 次/分钟窗口
	// 会直接 429 掉；device_id 是高熵随机串，轮询响应也不泄露用户数据）。
	r.POST("/nomu/magic-login", append(publicMWs, h.MagicLoginConsume)...)
	r.GET("/nomu/login/:device_id", h.PollNomuLogin)
}
