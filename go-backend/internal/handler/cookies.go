package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

// cookieDomain 返回 cookie 使用的 domain。
func cookieDomain(cfg *config.Config) string {
	if d := cfg.Security.CookieDomain; d != "" {
		return d
	}
	return ""
}

// setRefreshCookie 写入 HttpOnly refresh_token cookie（与 Python 端一致），
// 用于登录 / 刷新 / passkey 登录 / github 登录后让前端静默刷新可用。
func setRefreshCookie(c *gin.Context, cfg *config.Config, token string) {
	c.SetCookie("refresh_token", token, 7*24*3600, "/", cookieDomain(cfg), true, true)
}

// clearRefreshCookie 删除 refresh_token cookie（登出时调用）。
func clearRefreshCookie(c *gin.Context, cfg *config.Config) {
	c.SetCookie("refresh_token", "", -1, "/", cookieDomain(cfg), true, true)
}
