// Package service: GitHub OAuth 登录 / 绑定 / 解绑。
//
// 流程(授权码 + state, 无 PKCE — state 本身即一次性随机数):
//  1. AuthURL(mode, userID) → 生成 state, 存 Redis(state:{state}=userID_or_0), 返回 GitHub 授权地址。
//  2. HandleCallback(state, code) → 校验 state, 用 code 换 access_token, 取 GitHub 用户信息。
//     - state 里存的是 0 → login 流程: 按 github_id 找用户, 找到则登录, 找不到则自动创建;
//     - state 里存的是 userID → bind 流程: 把 github_id 绑到该用户。
package user

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	githuberrs "github.com/KanoCifer/kuroome-blog/internal/domain/github/errs"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// GitHubAccountManager 定义 GitHub 模块依赖的用户业务能力。
type GitHubAccountManager interface {
	GetByID(ctx context.Context, userID uint) (*model.User, *model.Profile, error)
	GetByGithubID(ctx context.Context, githubID int) (*model.User, error)
	CreateOAuthUser(ctx context.Context, githubID int, username, email, avatarURL string) (*model.User, error)
	LinkGitHub(ctx context.Context, userID uint, githubID int) error
	UnlinkGitHub(ctx context.Context, userID uint) error
}

type SessionIssuer interface {
	CreateTokens(ctx context.Context, u *model.User) (*dto.TokensResponse, error)
}

// GitHubOAuther 定义 github handler 依赖的业务能力。

// GitHubOAuth 封装 GitHub OAuth 业务逻辑。
//
// clientID / clientSecret / redirectURI 由调用方从 config 注入，避免本包
// 直接读取全局 config.Cfg。
type GitHubOAuth struct {
	redis        *redis.Client
	accounts     GitHubAccountManager
	auth         SessionIssuer
	httpCli      *http.Client
	clientID     string
	clientSecret string
	redirectURI  string
}

// NewGitHubOAuth 构造一个 gitHubOAuth 实例, state TTL 10 分钟。
func NewGitHubOAuth(
	redis *redis.Client,
	accounts GitHubAccountManager,
	auth SessionIssuer,
	clientID, clientSecret, redirectURI string,
) *GitHubOAuth {
	return &GitHubOAuth{
		redis:        redis,
		accounts:     accounts,
		auth:         auth,
		httpCli:      &http.Client{Timeout: 10 * time.Second},
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURI:  redirectURI,
	}
}

const (
	githubAuthURL  = "https://github.com/login/oauth/authorize"
	githubTokenURL = "https://github.com/login/oauth/access_token"
	githubUserURL  = "https://api.github.com/user"
	statePrefix    = "github_oauth_state:" // github_oauth_state:{state} → userID 或 "0"
	stateTTL       = 10 * time.Minute
)

// ghUser 是 GitHub /user API 的响应字段子集。
type ghUser struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

// randomState 生成 16 字节的随机 hex 作为 state。
func randomState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// AuthURL 构造 GitHub 授权地址。
//
// mode="login" 时 userID=0, mode="bind" 时 userID 为当前登录用户。
// 返回的 URL 应由 handler 发起 302 重定向。
func (g *GitHubOAuth) AuthURL(ctx context.Context, mode string, userID uint) (string, error) {
	if g.clientID == "" {
		return "", githuberrs.ErrGitHubNotConfigured
	}
	state, err := randomState()
	if err != nil {
		return "", err
	}
	if g.redis != nil {
		if err := g.redis.Set(
			ctx,
			statePrefix+state,
			strconv.FormatUint(uint64(userID), 10),
			stateTTL,
		).Err(); err != nil {
			return "", fmt.Errorf("store oauth state: %w", err)
		}
	}

	v := url.Values{}
	v.Set("client_id", g.clientID)
	v.Set("redirect_uri", g.redirectURI)
	v.Set("state", state)
	v.Set("scope", "read:user user:email")
	return githubAuthURL + "?" + v.Encode(), nil
}

// HandleCallback 处理 GitHub 回调。
//
// login 模式(userID=0): 按 github_id 找用户, 找到返回 (user, tokens, nil);
//
//	找不到则自动创建用户后返回 (user, tokens, nil)。
//
// bind 模式(userID>0): 把 github_id 绑到该用户, 返回 (user, nil, nil)。
//
// 出错时返回 (nil, nil, err)。
func (g *GitHubOAuth) HandleCallback(ctx context.Context, state, code string) (*model.User, *dto.TokensResponse, error) {
	// 1. 校验 state
	if state == "" || code == "" || g.redis == nil {
		return nil, nil, githuberrs.ErrInvalidOAuthState
	}
	userIDVal, err := g.redis.Get(ctx, statePrefix+state).Result()
	if err != nil {
		return nil, nil, githuberrs.ErrInvalidOAuthState
	}
	g.redis.Del(ctx, statePrefix+state) // 一次性
	userID, _ := strconv.ParseUint(userIDVal, 10, 64)

	// 2. code → access_token
	accessToken, err := g.exchangeCode(ctx, code)
	if err != nil {
		return nil, nil, err
	}

	// 3. 取 GitHub 用户信息
	gh, err := g.fetchUser(ctx, accessToken)
	if err != nil {
		return nil, nil, err
	}

	if userID == 0 {
		return g.loginByGitHub(ctx, gh)
	}
	return g.bindGitHub(ctx, uint(userID), gh)
}

// loginByGitHub 按 github_id 查找或自动创建用户, 并签发 token。
func (g *GitHubOAuth) loginByGitHub(ctx context.Context, gh *ghUser) (*model.User, *dto.TokensResponse, error) {
	existing, err := g.accounts.GetByGithubID(ctx, gh.ID)
	if err != nil {
		return nil, nil, err
	}
	if existing == nil {
		email := gh.Email
		if email == "" {
			email = gh.Login + "@github.com"
		}
		existing, err = g.accounts.CreateOAuthUser(ctx, gh.ID, gh.Login, email, gh.AvatarURL)
		if err != nil {
			return nil, nil, err
		}
		slog.InfoContext(ctx, "github login", "user_id", existing.ID, "github_id", gh.ID)
	}
	tokens, err := g.auth.CreateTokens(ctx, existing)
	if err != nil {
		return nil, nil, err
	}
	return existing, tokens, nil
}

// bindGitHub 把 github_id 绑到指定用户。
func (g *GitHubOAuth) bindGitHub(ctx context.Context, userID uint, gh *ghUser) (*model.User, *dto.TokensResponse, error) {
	existing, err := g.accounts.GetByGithubID(ctx, gh.ID)
	if err != nil {
		return nil, nil, err
	}
	if existing != nil {
		return nil, nil, githuberrs.ErrGitHubAlreadyBound
	}
	if err := g.accounts.LinkGitHub(ctx, userID, gh.ID); err != nil {
		return nil, nil, err
	}
	user, _, err := g.accounts.GetByID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	slog.InfoContext(ctx, "github bound", "user_id", userID, "github_id", gh.ID)
	return user, nil, nil
}

// UnbindGitHub 解除用户与 GitHub 的绑定。
func (g *GitHubOAuth) UnbindGitHub(ctx context.Context, userID uint) error {
	if err := g.accounts.UnlinkGitHub(ctx, userID); err != nil {
		return err
	}
	slog.InfoContext(ctx, "github unbound", "user_id", userID)
	return nil
}

// exchangeCode 用 GitHub 授权码换 access_token。
func (g *GitHubOAuth) exchangeCode(ctx context.Context, code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", g.clientID)
	data.Set("client_secret", g.clientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", g.redirectURI)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, githubTokenURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	req.URL.RawQuery = data.Encode()

	resp, err := g.httpCli.Do(req)
	if err != nil {
		return "", fmt.Errorf("github token exchange: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github token exchange failed: %s", string(body))
	}
	var result struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	if result.AccessToken == "" {
		return "", fmt.Errorf("github token empty: %s", result.Error)
	}
	return result.AccessToken, nil
}

// fetchUser 用 access_token 取 GitHub 用户信息。
func (g *GitHubOAuth) fetchUser(ctx context.Context, accessToken string) (*ghUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, githubUserURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := g.httpCli.Do(req)
	if err != nil {
		return nil, fmt.Errorf("github user fetch: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github user fetch failed: %s", string(body))
	}
	var u ghUser
	if err := json.Unmarshal(body, &u); err != nil {
		return nil, err
	}
	return &u, nil
}
