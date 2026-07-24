package util

import (
	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/config"
)

// CookieDomain 返回 cookie 使用的 domain。
func CookieDomain(cfg *config.Config) string {
	if d := cfg.Security.CookieDomain; d != "" {
		return d
	}
	return ""
}

// SetRefreshCookie 写入 HttpOnly refresh_token cookie（与 Python 端一致），
// 用于登录 / 刷新 / passkey 登录 / github 登录后让前端静默刷新可用。
func SetRefreshCookie(c *gin.Context, cfg *config.Config, token string) {
	c.SetCookie("refresh_token", token, 7*24*3600, "/", CookieDomain(cfg), true, true)
}

// ClearRefreshCookie 删除 refresh_token cookie（登出时调用）。
func ClearRefreshCookie(c *gin.Context, cfg *config.Config) {
	c.SetCookie("refresh_token", "", -1, "/", CookieDomain(cfg), true, true)
}
