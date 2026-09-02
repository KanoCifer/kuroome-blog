package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/emailtemplates"
	"github.com/KanoCifer/kuroome-blog/pkg/notification"
)

const (
	magicLoginTokenBytes = 32
	magicLoginTokenHex   = magicLoginTokenBytes * 2
	magicLoginTokenTTL   = time.Minute * 10
	magicLoginCacheKey   = "magiclogintoken:%s:%s"

	// nomu 接法 B 轮询契约：
	//   nomulogin:hex:<hex>           → device_id（回调端按 hex 反查槽位）
	//   nomulogin:device:<device_id>  → 轮询槽位（pending / done / error）
	nomuLoginHexKey       = "nomulogin:hex:%s"
	nomuLoginStateKey     = "nomulogin:device:%s"
	nomuLoginStateTTL     = time.Minute * 10
	nomuLoginPendingState = "pending"
	nomuLoginDoneState    = "done"
)

// magicLoginLinkPathFor 给出 mode 对应的"路径?token=%s"模板。
// nomu 走 hash 路由（#/login/magic），所以 path 里必须含 "#"。
func magicLoginLinkPathFor(mode string) string {
	if mode == modeNomu {
		return "/options.html#/login/magic?token=%s"
	}
	return "/auth/magic?token=%s"
}

// SendMagicLoginEmail 向已注册邮箱发送一次性登录链接；邮箱不存在时静默返回 true。
//
// mode 决定链接 host + 路径以及 Redis key 命名空间。未知 mode 兜底为 blog 并 warn。
//
// deviceID 仅 nomu 接法 B 用：Nomu 扩展申请魔法登录邮件时生成，后端据此建立
// 轮询槽位（nomulogin:<device_id>）与 hex→device 反向映射，回调端据此定位槽位。
func (s *userService) SendMagicLoginEmail(ctx context.Context, email, mode, deviceID string) bool {
	// 一次查询同时承担"邮箱是否存在"判断和后续 user 解析，
	// 避免 EmailExists + GetByEmail 之间被并发注册/删除留下不一致窗口。
	u, _, err := s.repo.GetByEmail(ctx, email)
	if err != nil || u == nil {
		return true
	}
	if s.redis == nil {
		slog.WarnContext(ctx, "magic login aborted: redis not configured")
		return false
	}

	normalized := normalizeMode(mode)
	if normalized != mode {
		slog.WarnContext(ctx, "magic login unknown mode, fallback to blog",
			"requested_mode", mode, "effective_mode", normalized)
	}
	mode = normalized

	hex := randomHex(magicLoginTokenBytes)
	cacheKey := fmt.Sprintf(magicLoginCacheKey, hex, mode)
	if err := s.redis.Set(ctx, cacheKey, email, magicLoginTokenTTL).Err(); err != nil {
		slog.ErrorContext(ctx, "magic login redis set failed", "err", err)
		return false
	}

	// Nomu 接法 B：登记轮询槽位 + hex→device 反向映射，供回调端把结果写回槽位。
	if mode == modeNomu && deviceID != "" {
		if err := s.redis.Set(ctx, fmt.Sprintf(nomuLoginHexKey, hex), deviceID, magicLoginTokenTTL).Err(); err == nil {
			pending, _ := json.Marshal(NomuLoginState{Status: nomuLoginPendingState})
			s.redis.Set(ctx, fmt.Sprintf(nomuLoginStateKey, deviceID), pending, nomuLoginStateTTL)
		}
	}

	// 邮件里给出的 token 包含 mode 段，consume 端据此反查正确的 redis key。
	token := hex + ":" + mode
	link := s.magicLoginLink(token, mode)
	msg := emailtemplates.MagicLoginEmail(link, mode)
	ok := (&notification.EmailChannel{}).Send(ctx, msg, notification.NotificationContext{Email: email})
	if !ok {
		s.redis.Del(ctx, cacheKey)
		return false
	}
	slog.InfoContext(ctx, "magic login email sent", "email", email, "mode", mode)
	return true
}

// magicLoginLink 拼出邮件里用的完整登录链接。
//
// 缺省回退到纯相对路径（<path>?token=<token>）：对应 mode 的 host 未注入时
// 仍能给出可用的相对链接，便于 dev / 配置漂移时排查。
func (s *userService) magicLoginLink(token, mode string) string {
	rel := fmt.Sprintf(magicLoginLinkPathFor(mode), token)
	host := s.frontendURLs[mode]
	if host == "" {
		return rel
	}
	return host + rel
}

// splitMagicLoginToken 把 "<64-hex>:<mode>" 拆成 (hex, mode)。
// 任何一段不合法都返回 ok=false，调用方应回 ErrInvalidMagicToken。
func splitMagicLoginToken(token string) (hex, mode string, ok bool) {
	idx := strings.LastIndex(token, ":")
	if idx < 0 {
		return "", "", false
	}
	hex, mode = token[:idx], token[idx+1:]
	if len(hex) != magicLoginTokenHex {
		return "", "", false
	}
	if mode != modeBlog && mode != modeNomu {
		return "", "", false
	}
	return hex, mode, true
}

// AuthenticateMagicLogin 用一次性 token 换取登录态；token 校验后立即消费。
//
// token 形态: "<64-hex>:<mode>"，hex 段进 redis key，mode 段决定走哪个命名空间。
func (s *userService) AuthenticateMagicLogin(ctx context.Context, token string) (*model.User, *model.Profile, error) {
	if s.redis == nil || token == "" {
		return nil, nil, usererrs.ErrInvalidMagicToken
	}
	hex, mode, ok := splitMagicLoginToken(token)
	if !ok {
		return nil, nil, usererrs.ErrInvalidMagicToken
	}
	cacheKey := fmt.Sprintf(magicLoginCacheKey, hex, mode)
	email, err := s.redis.GetDel(ctx, cacheKey).Result()
	if errors.Is(err, redis.Nil) || err != nil || email == "" {
		return nil, nil, usererrs.ErrInvalidMagicToken
	}

	u, p, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, nil, err
	}
	if u == nil {
		return nil, nil, usererrs.ErrUserNotFound
	}

	// Nomu 接法 B：回调端确认后，把 device_id 槽位标记为 done，轮询端据此取登录结果。
	if mode == modeNomu {
		s.finishNomuLogin(ctx, hex, u, p)
	}
	slog.InfoContext(ctx, "magic login consumed", "user_id", u.ID, "mode", mode)
	return u, p, nil
}

// NomuLoginState 是 nomu 轮询槽位的内容：一个 JSON 串。
//
// status:
//   - "pending"：已申请邮件，等回调确认（含哨兵：键不存在 / 未配置也返回 pending）；
//   - "done"：回调已确认，携带 token / 用户信息，轮询端直接取用。
type NomuLoginState struct {
	Status       string `json:"status"`
	AccessToken  string `json:"access_token,omitempty"`
	RefreshToken string `json:"refresh_token,omitempty"`
	User         any    `json:"user,omitempty"`
	Error        string `json:"error,omitempty"`
}

// finishNomuLogin 回调端确认登录后，把登录结果写回 device 槽位。
func (s *userService) finishNomuLogin(ctx context.Context, hex string, u *model.User, p *model.Profile) {
	if s.redis == nil {
		return
	}
	deviceID, err := s.redis.Get(ctx, fmt.Sprintf(nomuLoginHexKey, hex)).Result()
	if err != nil || deviceID == "" {
		return
	}
	tokens, err := s.CreateTokens(ctx, u)
	if err != nil {
		slog.ErrorContext(ctx, "nomu login create tokens error", "error", err, "user_id", u.ID)
		return
	}
	state := NomuLoginState{
		Status:       nomuLoginDoneState,
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User:         s.UserToDict(u, p),
	}
	b, _ := json.Marshal(state)
	s.redis.Set(ctx, fmt.Sprintf(nomuLoginStateKey, deviceID), b, nomuLoginStateTTL)
	// 反向映射用完即删，避免脏数据。
	s.redis.Del(ctx, fmt.Sprintf(nomuLoginHexKey, hex))
	slog.InfoContext(ctx, "nomu login slot written", "device_id", deviceID)
}

// PollNomuLogin 扩展侧轮询 device_id，取回 nomu 登录结果。
//
// 槽位不存在 / 尚未确认 / redis 未配置都返回 pending（无 error），扩展侧
// 只需看 state.Status == "done" 即可收 tail；为避免扩展在"申请邮件"与"回调
// 落地"之间抢跑，pending 对缺失槽位也成立（fire-and-forget 竞态安全）。
func (s *userService) PollNomuLogin(ctx context.Context, deviceID string) (*NomuLoginState, error) {
	if s.redis == nil || deviceID == "" {
		return &NomuLoginState{Status: nomuLoginPendingState}, nil
	}
	raw, err := s.redis.Get(ctx, fmt.Sprintf(nomuLoginStateKey, deviceID)).Result()
	if err != nil || raw == "" {
		return &NomuLoginState{Status: nomuLoginPendingState}, nil
	}
	var st NomuLoginState
	if err := json.Unmarshal([]byte(raw), &st); err != nil {
		return &NomuLoginState{Status: nomuLoginPendingState}, nil
	}
	return &st, nil
}

// randomHex 生成 n 字节随机数并以 hex 编码。
func randomHex(n int) string {
	raw := make([]byte, n)
	if _, err := rand.Read(raw); err != nil {
		return ""
	}
	return hex.EncodeToString(raw)
}