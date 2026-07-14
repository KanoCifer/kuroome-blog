package handler

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

type AdminServiceer interface {
	AddPost(ctx context.Context, post dto.PostIn) (id string, err error)
	UpdatePost(ctx context.Context, id string, post dto.PostUpdate) error
	DeletePost(ctx context.Context, id string) error
	TrackVisitor(ctx context.Context, data dto.VisitorData) error
	ListPostViewsData(ctx context.Context) ([]dto.PostViewData, error)
}

type AdminHandler struct {
	adminSvc AdminServiceer
	cfg      *config.Config
}

func NewAdminHandler(adminSvc AdminServiceer, cfg *config.Config) *AdminHandler {
	return &AdminHandler{adminSvc: adminSvc, cfg: cfg}
}

func (h *AdminHandler) AddPost(c *gin.Context) {
	var req dto.PostIn
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error())
		return
	}
	id, err := h.adminSvc.AddPost(c.Request.Context(), req)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "add post error", "error", err)
		response.APIError(c, err.Error(), 500)
		return
	}
	slog.InfoContext(c.Request.Context(), "post created", "post_id", id)
	response.Success(c, gin.H{"_id": id}, "Blog post added successfully")
}

func (h *AdminHandler) UpdatePost(c *gin.Context) {
	var req dto.PostUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error())
		return
	}
	if req.ID == "" {
		response.APIError(c, "_id is required")
		return
	}
	if err := h.adminSvc.UpdatePost(c.Request.Context(), req.ID, req); err != nil {
		switch {
		case errors.Is(err, errs.ErrPostNotFound):
			slog.WarnContext(c.Request.Context(), "update post failed", "reason", "post_not_found", "post_id", req.ID)
			response.APIError(c, err.Error(), 404)
		case errors.Is(err, errs.ErrInvalidPostID):
			slog.WarnContext(c.Request.Context(), "update post failed", "reason", "invalid_post_id", "post_id", req.ID)
			response.APIError(c, err.Error(), 400)
		default:
			slog.ErrorContext(c.Request.Context(), "update post error", "error", err, "post_id", req.ID)
			response.APIError(c, err.Error(), 500)
		}
		return
	}
	slog.InfoContext(c.Request.Context(), "post updated", "post_id", req.ID)
	response.Success(c, gin.H{"_id": req.ID}, "Blog post updated successfully")
}

func (h *AdminHandler) DeletePost(c *gin.Context) {
	postID := c.Param("post_id")
	if err := h.adminSvc.DeletePost(c.Request.Context(), postID); err != nil {
		switch {
		case errors.Is(err, errs.ErrPostNotFound):
			slog.WarnContext(c.Request.Context(), "delete post failed", "reason", "post_not_found", "post_id", postID)
			response.APIError(c, err.Error(), 404)
		case errors.Is(err, errs.ErrInvalidPostID):
			slog.WarnContext(c.Request.Context(), "delete post failed", "reason", "invalid_post_id", "post_id", postID)
			response.APIError(c, err.Error(), 400)
		default:
			slog.ErrorContext(c.Request.Context(), "delete post error", "error", err, "post_id", postID)
			response.APIError(c, err.Error(), 500)
		}
		return
	}
	slog.InfoContext(c.Request.Context(), "post deleted", "post_id", postID)
	response.Success(c, gin.H{"_id": postID}, "Blog post deleted successfully")
}

func (h *AdminHandler) ListPostViewsData(c *gin.Context) {
	data, err := h.adminSvc.ListPostViewsData(c.Request.Context())
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "list post views data", "error", err)
		response.APIError(c, err.Error(), http.StatusInternalServerError)
		return
	}
	response.Success(c, data, "Post views data retrieved successfully")
}

func (h *AdminHandler) TrackVisitor(c *gin.Context) {
	if !h.cfg.Admin.EnableTracking {
		c.Status(204)
		return
	}
	var req dto.VisitorData
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, err.Error())
		return
	}
	req.IpAddress = c.ClientIP()
	if err := h.adminSvc.TrackVisitor(c.Request.Context(), req); err != nil {
		response.APIError(c, err.Error(), 500)
		return
	}
	c.Status(204)
}

func (h *AdminHandler) WebhookDeploy(c *gin.Context) {
	secret := h.cfg.Gitee.WebhookSecret
	if secret == nil || *secret == "" {
		response.APIError(c, "Webhook secret not configured", 500)
		return
	}

	giteeToken := c.GetHeader("X-Gitee-Token")
	signatureHeader := c.GetHeader("X-Hub-Signature-256")

	switch {
	case giteeToken != "":
		if giteeToken != *secret {
			response.APIError(c, "Invalid token", 403)
			return
		}
	case signatureHeader != "":
		body, err := c.GetRawData()
		if err != nil {
			response.APIError(c, "Failed to read request body", 400)
			return
		}
		if !hmacEqualBody(body, *secret, signatureHeader) {
			response.APIError(c, "Invalid signature", 403)
			return
		}
	default:
		response.APIError(c, "No authentication provided", 401)
		return
	}

	go runDeployment()

	slog.Info("Deployment triggered by webhook", "ip", c.ClientIP())
	response.Success(c, gin.H{"status": "pending"}, "Deployment triggered successfully")
}

func hmacEqualBody(body []byte, secret, signatureHeader string) bool {
	const prefix = "sha256="
	if len(signatureHeader) <= len(prefix) || signatureHeader[:len(prefix)] != prefix {
		return false
	}
	received := signatureHeader[len(prefix):]
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(received), []byte(expected))
}

func runDeployment() {
	scriptPath := os.Getenv("DEPLOY_SCRIPT_PATH")
	if scriptPath == "" {
		scriptPath = "/home/kano/blog/backend/deploy.sh"
	}
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		slog.Error("Deploy script not found", "path", scriptPath)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, scriptPath)
	cmd.Dir = "/home/kano/blog/backend"
	output, err := cmd.CombinedOutput()
	if err != nil {
		slog.Error("Deployment failed", "error", err, "output", string(output))
		return
	}
	slog.Info("Deployment completed", "output", string(output))
}

// DevTaskToken 为前端签发 devtask service-JWT。
// GET /api/v3/dev-task/token?days=N
// 前端用用户 JWT 调用此端点，后端校验 admin 后返回 service token。
// days 可选，1..365，默认 1h（兼容看板自身短期 token）；传 days 后按整天计算，
// 用于 MCP server 等长期服务鉴权。
func (h *AdminHandler) DevTaskToken(c *gin.Context) {
	if h.cfg.Security.DevTaskSecret == "" {
		response.APIError(c, "devtask secret not configured", http.StatusServiceUnavailable)
		return
	}

	expiresAt := time.Now().Add(1 * time.Hour)
	if d := c.Query("days"); d != "" {
		days, err := strconv.Atoi(d)
		if err != nil || days < 1 || days > 365 {
			response.APIError(c, "days must be an integer between 1 and 365", http.StatusBadRequest)
			return
		}
		expiresAt = time.Now().AddDate(0, 0, days)
	}

	token, err := jwt.GenerateServiceToken(expiresAt, h.cfg.Security.DevTaskSecret)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "generate devtask service token", "error", err)
		response.APIError(c, "failed to generate token", http.StatusInternalServerError)
		return
	}

	response.Success(c, gin.H{
		"token":      token,
		"expires_at": expiresAt.Format(time.RFC3339),
		"days":       int(time.Until(expiresAt).Hours() / 24),
	}, "DevTask token issued successfully")
}

func (h *AdminHandler) RegisterRoutes(r *gin.RouterGroup, authMW gin.HandlerFunc, adminMW gin.HandlerFunc) {
	r.POST("/post/add", authMW, adminMW, h.AddPost)
	r.PUT("/post/update", authMW, adminMW, h.UpdatePost)
	r.DELETE("/post/:post_id/delete", authMW, adminMW, h.DeletePost)
	r.GET("/post/views", authMW, adminMW, h.ListPostViewsData)
	r.POST("/track", h.TrackVisitor)
	r.POST("/deploy", h.WebhookDeploy)
	r.GET("/dev-task/token", authMW, adminMW, h.DevTaskToken)
}
