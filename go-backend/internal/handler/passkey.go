package handler

import (
	"errors"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/response"
)

// PasskeyService 定义 handler 依赖的 Passkey 业务接口。
type PasskeyService interface {
	BeginRegistration(userID uint) (map[string]any, error)
	FinishRegistration(userID uint, response map[string]any) error
	BeginLogin() (map[string]any, error)
	FinishLogin(response map[string]any) (*model.User, error)
	DeletePasskey(userID uint) error
	HasPasskey(userID uint) bool
}

// PasskeyHandler 持有 PasskeyService 和 UserService（登录后构造 token）。
type PasskeyHandler struct {
	passkeySvc PasskeyService
	userSvc    interface {
		CreateTokens(u *model.User) (*dto.Tokens, error)
		UserToDict(u *model.User, p *model.Profile) map[string]any
	}
}

func NewPasskeyHandler(passkeySvc PasskeyService, userSvc interface {
	CreateTokens(u *model.User) (*dto.Tokens, error)
	UserToDict(u *model.User, p *model.Profile) map[string]any
}) *PasskeyHandler {
	return &PasskeyHandler{passkeySvc: passkeySvc, userSvc: userSvc}
}

// RegistrationOptions GET /passkey/registration-options (auth required)
func (h *PasskeyHandler) RegistrationOptions(c *gin.Context) {
	userID := c.GetInt("user_id")

	options, err := h.passkeySvc.BeginRegistration(uint(userID))
	if err != nil {
		if errors.Is(err, errs.ErrPasskeyExists) {
			response.APIError(c, err.Error(), 400)
			return
		}
		response.APIError(c, err.Error(), 500)
		return
	}
	response.Success(c, options, "Passkey 注册选项生成成功")
}

// Register POST /passkey/register (auth required)
func (h *PasskeyHandler) Register(c *gin.Context) {
	userID := c.GetInt("user_id")

	var req dto.PasskeyRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body")
		return
	}

	if err := h.passkeySvc.FinishRegistration(uint(userID), req.Response); err != nil {
		if errors.Is(err, errs.ErrInvalidPasskey) {
			response.APIError(c, err.Error(), 400)
			return
		}
		response.APIError(c, err.Error(), 500)
		return
	}
	response.Success(c, nil, "Passkey 注册成功")
}

// AuthenticationOptions GET /passkey/authentication-options (public)
func (h *PasskeyHandler) AuthenticationOptions(c *gin.Context) {
	options, err := h.passkeySvc.BeginLogin()
	if err != nil {
		response.APIError(c, err.Error(), 500)
		return
	}
	response.Success(c, options, "Passkey 认证选项生成成功")
}

// Authenticate POST /passkey/authenticate (public → returns tokens)
func (h *PasskeyHandler) Authenticate(c *gin.Context) {
	var req dto.PasskeyAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body")
		return
	}

	user, err := h.passkeySvc.FinishLogin(req.Assertion)
	if err != nil {
		if errors.Is(err, errs.ErrInvalidPasskey) || errors.Is(err, errs.ErrPasskeyNotFound) {
			response.APIError(c, err.Error(), 400)
			return
		}
		response.APIError(c, err.Error(), 500)
		return
	}

	tokens, err := h.userSvc.CreateTokens(user)
	if err != nil {
		response.APIError(c, "server error", 500)
		return
	}

	// 写入 refresh_token cookie（与 Python 端一致）。
	setRefreshCookie(c, tokens.RefreshToken)

	// 用户字段铺平到 data 顶层（与 Python 端 user_to_dict 形状一致）。
	userData := h.userSvc.UserToDict(user, user.Profile)
	userData["access_token"] = tokens.AccessToken
	userData["refresh_token"] = tokens.RefreshToken
	response.Success(c, userData, "Passkey 登录成功")
}

// DeletePasskey DELETE /passkey/delete (auth required)
func (h *PasskeyHandler) DeletePasskey(c *gin.Context) {
	userID := c.GetInt("user_id")

	if err := h.passkeySvc.DeletePasskey(uint(userID)); err != nil {
		if errors.Is(err, errs.ErrPasskeyNotFound) {
			response.APIError(c, "您的账户尚未绑定Passkey", 400)
			return
		}
		response.APIError(c, err.Error(), 500)
		return
	}
	response.Success(c, nil, "Passkey 删除成功")
}

// RegisterRoutes 把 handler 方法挂到路由组。
func (h *PasskeyHandler) RegisterRoutes(r *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	r.GET("/passkey/registration-options", authMiddleware, h.RegistrationOptions)
	r.POST("/passkey/register", authMiddleware, h.Register)
	r.GET("/passkey/authentication-options", h.AuthenticationOptions)
	r.POST("/passkey/authenticate", h.Authenticate)
	r.DELETE("/passkey/delete", authMiddleware, h.DeletePasskey)
}
