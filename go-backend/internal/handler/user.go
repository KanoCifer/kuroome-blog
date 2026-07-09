package handler

import (
	"errors"
	"github.com/KanoCifer/kuroome-blog/internal/model"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/response"
)

type UserService interface {
	Authenticate(username, password string) (*model.User, error)
	CreateTokens(u *model.User) (*dto.Tokens, error)
	CreateUser(username, password, email, emailCode string) (*model.User, *model.Profile, error)
	GetByID(userID uint) (*model.User, *model.Profile, error)
	Logout(userID uint)
	RefreshTokens(refreshToken string) (*dto.Tokens, error)
	UserToDict(u *model.User, p *model.Profile) map[string]any
}

// UserHandler 持有业务服务，gin 路由方法挂在其上。
type UserHandler struct {
	userSvc UserService
}

func NewUserHandler(userSvc UserService) *UserHandler {
	return &UserHandler{userSvc: userSvc}
}

func (h *UserHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body")
		return
	}

	user, err := h.userSvc.Authenticate(req.Username, req.Password)
	if err != nil {
		if errors.Is(err, errs.ErrInvalidCredentials) {
			response.APIError(c, err.Error(), 401)
			return
		}
		response.APIError(c, "server error", 500)
		return
	}

	tokens, err := h.userSvc.CreateTokens(user)
	if err != nil {
		response.APIError(c, "server error", 500)
		return
	}
	userData := h.userSvc.UserToDict(user, user.Profile)

	response.Success(c, gin.H{
		"user":          userData,
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
	})
}

func (h *UserHandler) Register(c *gin.Context) {
	// "/register"
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body")
		return
	}

	u, _, err := h.userSvc.CreateUser(req.Username, req.Password, req.Email, req.EmailCode)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrUserExists):
			response.APIError(c, err.Error(), 409)
		case errors.Is(err, errs.ErrEmailExists):
			response.APIError(c, err.Error(), 409)
		case errors.Is(err, errs.ErrInvalidEmailCode):
			response.APIError(c, err.Error(), 400)
		default:
			response.APIError(c, "server error", 500)
		}
		return
	}

	response.Success(c, dto.ToUserResponse(u.ID, u.Username, false), "注册成功")
}

func (h *UserHandler) Me(c *gin.Context) {
	// "/me"
	_, ok := c.Get("user_id")
	if !ok {
		response.APIError(c, "未授权", 401)
		return
	}

	u, p, err := h.userSvc.GetByID(uint(c.GetInt("user_id")))
	if err != nil {
		if errors.Is(err, errs.ErrUserNotFound) {
			response.APIError(c, "用户不存在", 404)
			return
		}
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

	h.userSvc.Logout(uint(c.GetInt("user_id")))
	response.Success(c, nil, "已退出登录")
}

func (h *UserHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body")
		return
	}

	tokens, err := h.userSvc.RefreshTokens(req.RefreshToken)
	if err != nil {
		response.APIError(c, err.Error(), 401)
		return
	}

	response.Success(c, gin.H{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
	})
}

// RegisterRoutes 把 handler 方法挂到路由组。
func (h *UserHandler) RegisterRoutes(r *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	r.POST("/login", h.Login)
	r.POST("/register", h.Register)
	r.POST("/refresh-token", h.RefreshToken)
	r.POST("/logout", authMiddleware, h.Logout)
	r.GET("/me", authMiddleware, h.Me)
}
