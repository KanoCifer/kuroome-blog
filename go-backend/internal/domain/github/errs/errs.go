// Package githuberrs 定义 GitHub OAuth 域业务错误。
package githuberrs

import (
	"errors"

	"github.com/KanoCifer/kuroome-blog/internal/apierr"
)

var (
	// 下列两个走 OAuth 重定向路径（redirectWithError），不进 respondErr。
	ErrGitHubNotConfigured = errors.New("GitHub OAuth 未配置")
	ErrInvalidOAuthState   = errors.New("state 无效或已过期")
	ErrGitHubAlreadyBound  = apierr.New(409, "该 GitHub 账户已被绑定")
)
