package handler

import (
	"context"
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	passkeyerrs "github.com/KanoCifer/kuroome-blog/internal/domain/passkey/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
	"github.com/KanoCifer/kuroome-blog/internal/util"
)

// Passkeyer 定义 handler 依赖的 Passkey 业务能力。
// 由 *service.PasskeyService 隐式满足。
type Passkeyer interface {
	HasPasskey(ctx context.Context, userID uint) bool
	BeginRegistration(ctx context.Context, userID uint) (map[string]any, error)
	FinishRegistration(ctx context.Context, userID uint, response map[string]any) error
	BeginLogin(ctx context.Context) (map[string]any, error)
	FinishLogin(ctx context.Context, response map[string]any) (*model.User, error)
	DeletePasskey(ctx context.Context, userID uint) error
	// LoginFlow 是 /passkey/authenticate 的编排入口：WebAuthn 验签 + 签 token + 铺平字段。
	// 返回 userData 已含 is_admin / has_passkey / github_bound，handler 只贴 access/refresh。
	LoginFlow(ctx context.Context, assertion map[string]any) (*dto.TokensResponse, map[string]any, error)
}

var _ Passkeyer = (*service.PasskeyService)(nil)

// PasskeyHandler 持有 passkeySvc（cookie 设置等 HTTP 关注点留在 handler）。
type PasskeyHandler struct {
	passkeySvc Passkeyer
	cfg        *config.Config
}

func NewPasskeyHandler(passkeySvc Passkeyer, cfg *config.Config) *PasskeyHandler {
	return &PasskeyHandler{passkeySvc: passkeySvc, cfg: cfg}
}

// RegistrationOptions GET /passkey/registration-options (auth required)
func (h *PasskeyHandler) RegistrationOptions(c *gin.Context) {
	userID := c.GetInt("user_id")

	options, err := h.passkeySvc.BeginRegistration(c.Request.Context(), uint(userID))
	if respondErr(c, err, "passkey registration begin failed", "user_id", userID) {
		return
	}
	response.Success(c, options, "Passkey 注册选项生成成功")
}

// Register POST /passkey/register (auth required)
func (h *PasskeyHandler) Register(c *gin.Context) {
	userID := c.GetInt("user_id")

	var req dto.PasskeyRegistrationRequest
	if !bindJSON(c, &req) {
		return
	}

	if err := h.passkeySvc.FinishRegistration(c.Request.Context(), uint(userID), req.Response); respondErr(c, err, "passkey registration finish failed", "user_id", userID) {
		return
	}
	response.Success(c, nil, "Passkey 注册成功")
}

// AuthenticationOptions GET /passkey/authentication-options (public)
func (h *PasskeyHandler) AuthenticationOptions(c *gin.Context) {
	options, err := h.passkeySvc.BeginLogin(c.Request.Context())
	if respondErr(c, err, "passkey authentication options failed") {
		return
	}
	response.Success(c, options, "Passkey 认证选项生成成功")
}

// Authenticate POST /passkey/authenticate (public → returns tokens)
func (h *PasskeyHandler) Authenticate(c *gin.Context) {
	var req dto.PasskeyAuthRequest
	if !bindJSON(c, &req) {
		return
	}

	tokens, userData, err := h.passkeySvc.LoginFlow(c.Request.Context(), req.Assertion)
	if respondErr(c, err, "passkey login failed") {
		return
	}

	// 写入 refresh_token cookie（与 Python 端一致，HTTP 关注点留 handler）。
	util.SetRefreshCookie(c, h.cfg, tokens.RefreshToken)

	userData["access_token"] = tokens.AccessToken
	userData["refresh_token"] = tokens.RefreshToken
	response.Success(c, userData, "Passkey 登录成功")
}

// DeletePasskey DELETE /passkey/delete (auth required)
func (h *PasskeyHandler) DeletePasskey(c *gin.Context) {
	userID := c.GetInt("user_id")

	if err := h.passkeySvc.DeletePasskey(c.Request.Context(), uint(userID)); err != nil {
		// 删除场景文案与通用 err.Error() 不同，保留专属 400 文案。
		if errors.Is(err, passkeyerrs.ErrPasskeyNotFound) {
			slog.WarnContext(c.Request.Context(), "passkey delete failed", "user_id", userID, "error", err)
			response.APIError(c, "您的账户尚未绑定Passkey", 400)
			return
		}
		if respondErr(c, err, "passkey delete failed", "user_id", userID) {
			return
		}
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
