// Package service: GitHub OAuth 登录 / 绑定 / 解绑。
//
// 流程(授权码 + state, 无 PKCE — state 本身即一次性随机数):
//  1. AuthURL(mode, userID) → 生成 state, 存 Redis(state:{state}=userID_or_0), 返回 GitHub 授权地址。
//  2. HandleCallback(state, code) → 校验 state, 用 code 换 access_token, 取 GitHub 用户信息。
//     - state 里存的是 0 → login 流程: 按 github_id 找用户, 找到则登录, 找不到则自动创建;
//     - state 里存的是 userID → bind 流程: 把 github_id 绑到该用户。
package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

// GitHubOAuth 封装 GitHub OAuth 业务逻辑。
type GitHubOAuth struct {
	redis    *redis.Client
	userRepo *postgres.UserRepo
	userSvc  *UserService
	httpCli  *http.Client
}

// NewGitHubOAuth 构造一个 GitHubOAuth 实例, state TTL 10 分钟。
func NewGitHubOAuth(redis *redis.Client, userRepo *postgres.UserRepo, userSvc *UserService) *GitHubOAuth {
	return &GitHubOAuth{
		redis:    redis,
		userRepo: userRepo,
		userSvc:  userSvc,
		httpCli:  &http.Client{Timeout: 10 * time.Second},
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
	ID    int    `json:"id"`
	Login string `json:"login"`
	Email string `json:"email"`
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
func (g *GitHubOAuth) AuthURL(mode string, userID uint) (string, error) {
	if config.Cfg.GITHUB_CLIENT_ID == "" {
		return "", errs.ErrGitHubNotConfigured
	}
	state, err := randomState()
	if err != nil {
		return "", err
	}
	if g.redis != nil {
		if err := g.redis.Set(
			context.Background(),
			statePrefix+state,
			strconv.FormatUint(uint64(userID), 10),
			stateTTL,
		).Err(); err != nil {
			return "", fmt.Errorf("store oauth state: %w", err)
		}
	}

	v := url.Values{}
	v.Set("client_id", config.Cfg.GITHUB_CLIENT_ID)
	v.Set("redirect_uri", config.Cfg.GITHUB_REDIRECT_URI)
	v.Set("state", state)
	v.Set("scope", "read:user user:email")
	return githubAuthURL + "?" + v.Encode(), nil
}

// HandleCallback 处理 GitHub 回调。
//
// login 模式(userID=0): 按 github_id 找用户, 找到返回 (user, tokens, nil);
//   找不到则自动创建用户后返回 (user, tokens, nil)。
// bind 模式(userID>0): 把 github_id 绑到该用户, 返回 (user, nil, nil)。
//
// 出错时返回 (nil, nil, err)。
func (g *GitHubOAuth) HandleCallback(state, code string) (*model.User, *dto.Tokens, error) {
	// 1. 校验 state
	if state == "" || code == "" {
		return nil, nil, errs.ErrInvalidOAuthState
	}
	userIDVal, err := g.redis.Get(context.Background(), statePrefix+state).Result()
	if err != nil {
		return nil, nil, errs.ErrInvalidOAuthState
	}
	g.redis.Del(context.Background(), statePrefix+state) // 一次性
	userID, _ := strconv.ParseUint(userIDVal, 10, 64)

	// 2. code → access_token
	accessToken, err := g.exchangeCode(code)
	if err != nil {
		return nil, nil, err
	}

	// 3. 取 GitHub 用户信息
	gh, err := g.fetchUser(accessToken)
	if err != nil {
		return nil, nil, err
	}

	if userID == 0 {
		return g.loginByGitHub(gh)
	}
	return g.bindGitHub(uint(userID), gh)
}

// loginByGitHub 按 github_id 查找或自动创建用户, 并签发 token。
func (g *GitHubOAuth) loginByGitHub(gh *ghUser) (*model.User, *dto.Tokens, error) {
	existing, err := g.userRepo.GetByGithubID(gh.ID)
	if err != nil {
		return nil, nil, err
	}
	if existing != nil {
		tokens, err := g.userSvc.CreateTokens(existing)
		if err != nil {
			return nil, nil, err
		}
		return existing, tokens, nil
	}

	// 自动创建用户(与 Python 端 handle_github_login_callback 行为一致)
	username := uniqueUsername(gh.Login, g.userRepo.UsernameExists)
	email := gh.Email
	if email == "" {
		email = gh.Login + "@github.com"
	}
	u, _, err := g.userSvc.CreateUser(username, randomPassword(), email, "")
	if err != nil {
		return nil, nil, err
	}
	if err := g.userRepo.SetGithubID(u.ID, gh.ID); err != nil {
		return nil, nil, err
	}
	tokens, err := g.userSvc.CreateTokens(u)
	if err != nil {
		return nil, nil, err
	}
	return u, tokens, nil
}

// bindGitHub 把 github_id 绑到指定用户。
func (g *GitHubOAuth) bindGitHub(userID uint, gh *ghUser) (*model.User, *dto.Tokens, error) {
	existing, err := g.userRepo.GetByGithubID(gh.ID)
	if err != nil {
		return nil, nil, err
	}
	if existing != nil {
		return nil, nil, errs.ErrGitHubAlreadyBound
	}
	if err := g.userRepo.SetGithubID(userID, gh.ID); err != nil {
		return nil, nil, err
	}
	user, err := g.userRepo.GetByID(userID)
	if err != nil {
		return nil, nil, err
	}
	return user, nil, nil
}

// UnbindGitHub 解除用户与 GitHub 的绑定。
func (g *GitHubOAuth) UnbindGitHub(userID uint) error {
	return g.userRepo.ClearGithubID(userID)
}

// exchangeCode 用 GitHub 授权码换 access_token。
func (g *GitHubOAuth) exchangeCode(code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", config.Cfg.GITHUB_CLIENT_ID)
	data.Set("client_secret", config.Cfg.GITHUB_CLIENT_SECRET)
	data.Set("code", code)
	data.Set("redirect_uri", config.Cfg.GITHUB_REDIRECT_URI)

	req, err := http.NewRequest(http.MethodPost, githubTokenURL, nil)
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
func (g *GitHubOAuth) fetchUser(accessToken string) (*ghUser, error) {
	req, err := http.NewRequest(http.MethodGet, githubUserURL, nil)
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

// uniqueUsername 若 base 已被占用, 追加 _xxxx 后缀直到唯一。
func uniqueUsername(base string, exists func(string) bool) string {
	if !exists(base) {
		return base
	}
	for i := 0; i < 5; i++ {
		suffix := "_" + randomSuffix(4)
		candidate := base + suffix
		if !exists(candidate) {
			return candidate
		}
	}
	// 兜底: 长随机后缀
	return base + "_" + randomSuffix(8)
}

// randomSuffix 生成 n 字符的 url-safe 随机字符串。
func randomSuffix(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)[:n]
}

// randomPassword 生成 32 字节随机 hex 作为自动创建用户的密码。
// 该用户后续通过 GitHub OAuth 登录, 此密码仅作占位。
func randomPassword() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}
