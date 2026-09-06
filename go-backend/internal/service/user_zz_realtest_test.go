package service

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// 真实 SMTP 端到端回归测试 —— 通过 configs/config.yaml 里的 QQ SMTP 真发
// 验证码邮件，验整条流水线：redis write + 真发邮件 + redis read + 一次性消费。
//
// 这个文件用 zz_ 前缀排序到包内测试末尾，避免 -run 选中普通用例时跑它
// （真实发送每次会真发邮件）。运行方式：
//
//	REAL_SEND=1 REAL_SEND_TO=you@example.com \
//	  go test ./internal/service/ -run TestEmailCode_RealSend -v
//
// 前置条件：
//   - configs/config.yaml 里的 MAIL_* 凭据可用（QQ SMTP）
//   - REDIS_URL 指向可写的 redis 实例（测试会写真实 key，5 分钟 TTL）
//   - REAL_SEND_TO 指定收件人邮箱（默认是占位的 example.com，
//     真要发到真实地址必须显式 env 注入，避免地址写进仓库）
//
// 走查链路（任意一环挂都 fail）：
//  1. SendEmailCode(email, "blog") 写 redis（key = email_code:<email>:blog，TTL 5min）
//  2. 通过 QQ SMTP 真发邮件到 REAL_SEND_TO
//  3. 从 redis 取出验证码
//  4. verifyEmailCode(email, code, "blog") 接受它
//  5. 重复 verifyEmailCode 同一验证码被拒（一次性消费）
//
// 主要防回归场景：send / verify 用错 redis key 命名空间（之前 send 写
// email_code:、verify 读 signup_code:，register 永远 ErrInvalidEmailCode
// 但 send 看上去 200）；以及 send / verify mode 不一致导致 blog 验证码被
// nomu 模式消费。
func TestEmailCode_RealSend_ToOutlook(t *testing.T) {
	// 默认不跑：必须显式设 REAL_SEND=1（QQ SMTP 真发邮件，每次都消耗一次发信额度）。
	if os.Getenv("REAL_SEND") != "1" {
		t.Skip("set REAL_SEND=1 to actually send mail via QQ SMTP")
	}
	// 目标邮箱也必须显式 env 注入，不写死在源码里（避免个人邮箱被 commit）。
	target := os.Getenv("REAL_SEND_TO")
	if target == "" {
		t.Skip("set REAL_SEND_TO=<your-email> to choose the recipient")
	}

	cfg := loadConfigForRealtest(t)

	rdb, err := redisFromCfg(cfg)
	if err != nil {
		t.Skipf("redis 不可用，跳过真实发送测试：%v", err)
	}
	t.Cleanup(func() { _ = rdb.Close() })

	// 全局 config.Cfg 注入真实 Mail 配置（QQ SMTP 凭据），handler 的
	// notification.EmailChannel.Send 从 config.Cfg.Mail 读。restore 在
	// cleanup 里做，避免污染其它测试。
	prev := config.Cfg
	config.Cfg = cfg
	t.Cleanup(func() { config.Cfg = prev })

	// 干净起点：清掉这个 email 之前的残留 key（如果上次跑挂的话）
	_ = rdb.Del(context.Background(), emailCodeKey(target, modeBlog)).Err()

	repo := &mockUserRepo{
		getByEmailFn: func(ctx context.Context, email string) (*model.User, *model.Profile, error) {
			return nil, nil, nil
		},
	}
	svc := NewUserService(repo, rdb, nil, nil)

	t.Logf(">>> 真发邮件到 %s 通过 %s:%d（QQ SMTP），请查收",
		target, cfg.Mail.Server, cfg.Mail.Port)

	if !svc.SendEmailCode(context.Background(), target, modeBlog) {
		t.Fatal("SendEmailCode returned false：QQ SMTP 发送失败，看上面 slog 日志")
	}

	// 验证码在 redis 里 TTL 5min，5s 内一定能 Get 到。
	key := emailCodeKey(target, modeBlog)
	stored, err := rdb.Get(context.Background(), key).Result()
	if err != nil {
		t.Fatalf("redis key %q 写失败：%v", key, err)
	}
	if !isAllDigits(stored) {
		t.Fatalf("redis 里的 code 不是纯数字：%q", stored)
	}
	t.Logf(">>> redis key %s 已写入，code = %s（5min TTL）", key, stored)

	// verify 接受这个 code（锁住 send/verify 同一 key 命名空间）。
	if !svc.verifyEmailCode(context.Background(), target, stored, modeBlog) {
		t.Fatal("verifyEmailCode 拒绝 redis 里的 code —— send/verify key 命名空间不一致？")
	}
	// 重复使用被拒（一次性消费）。
	if svc.verifyEmailCode(context.Background(), target, stored, modeBlog) {
		t.Error("verifyEmailCode 不该接受已消费的 code")
	}
}

// ---------- 工具：real-send 测试用 ----------

// loadConfigForRealtest 从 configs/config.yaml 加载配置；
// 找不到时 Skip（CI / 离线环境不至于 fail）。
func loadConfigForRealtest(t *testing.T) *config.Config {
	t.Helper()
	// go test 的 cwd 是 package 目录（internal/service/），repo 根在 ../..
	wd, _ := os.Getwd()
	candidates := []string{
		filepath.Join(wd, "configs", "config.yaml"),
		filepath.Join(wd, "..", "..", "configs", "config.yaml"),
		filepath.Join(wd, "..", "..", "..", "configs", "config.yaml"),
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			cfg, err := config.Load(p)
			if err != nil {
				t.Fatalf("load config %s: %v", p, err)
			}
			if cfg.Mail.Username == "" || cfg.Mail.Password == "" {
				t.Skipf("%s 里没有 MAIL_USERNAME / MAIL_PASSWORD，跳过真实发送测试", p)
			}
			return cfg
		}
	}
	t.Skip("configs/config.yaml 找不到（搜索过 " + strings.Join(candidates, " / ") + "），跳过真实发送测试")
	return nil
}

// redisFromCfg 解析 cfg.Database.RedisURL 并连一次 Ping；不通就返回错，
// 由 caller 决定 Skip。
func redisFromCfg(cfg *config.Config) (*redis.Client, error) {
	opts, err := redis.ParseURL(cfg.Database.RedisURL)
	if err != nil {
		return nil, err
	}
	rdb := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		_ = rdb.Close()
		return nil, errors.New("ping: " + err.Error())
	}
	return rdb, nil
}

func isAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// TestMagicLogin_RealSend_BlogMode 真实 SMTP 端到端：魔法登录 blog 模式。
//
// 通过 QQ SMTP 真发魔法登录邮件到 REAL_SEND_TO；落 redis 后用同一次发送
// 写下的 hex 调 AuthenticateMagicLogin 验整条 round-trip：
//
//  1. SendMagicLoginEmail(email, "blog") 写 redis key
//     magiclogintoken:<64-hex>:blog → email
//  2. 邮件走 QQ SMTP 真发出去（plain body 含完整链接，HTML 里在 CTA 按钮）
//  3. 从 redis 拿到 hex，按 "<hex>:blog" 拼回 token 形态
//  4. AuthenticateMagicLogin 接受、消费、删除 key
//  5. 重复 AuthenticateMagicLogin 同一 token 被拒
//
// 主要防回归：之前 cache key 只有 <hex> 没分段，blog/nomu 撞同 hex
// 互相串；本次加 mode 段后，链接里 mode 必须和 redis key 里 mode 一致。
func TestMagicLogin_RealSend_BlogMode(t *testing.T) {
	if os.Getenv("REAL_SEND") != "1" {
		t.Skip("set REAL_SEND=1 to actually send mail via QQ SMTP")
	}
	target := os.Getenv("REAL_SEND_TO")
	if target == "" {
		t.Skip("set REAL_SEND_TO=<your-email> to choose the recipient")
	}

	cfg := loadConfigForRealtest(t)

	rdb, err := redisFromCfg(cfg)
	if err != nil {
		t.Skipf("redis 不可用，跳过真实发送测试：%v", err)
	}
	t.Cleanup(func() { _ = rdb.Close() })

	// Mail config 切到真实 QQ SMTP。frontendURLs 注入 blog host（service
	// 拼链接 host 必需），nomu 这里不关心，留空。
	prevCfg := config.Cfg
	config.Cfg = cfg
	t.Cleanup(func() { config.Cfg = prevCfg })

	// MagicLogin 要求"邮箱已注册"才真发（未注册静默吞掉防枚举）。mock
	// 任意一个 user：username = target 即可。
	repo := &mockUserRepo{
		getByEmailFn: func(ctx context.Context, email string) (*model.User, *model.Profile, error) {
			if email != target {
				return nil, nil, nil
			}
			uid := uint(1)
			em := email
			return &model.User{Model: gormModel(uid), Username: "alice"},
				&model.Profile{Email: &em},
				nil
		},
	}
	svc := NewUserService(repo, rdb, nil, map[string]string{
		"blog": "https://kanocifer.chat",
	})

	t.Logf(">>> 真发魔法登录邮件（blog 模式）到 %s，请查收", target)
	if !svc.SendMagicLoginEmail(context.Background(), target, "blog", "") {
		t.Fatal("SendMagicLoginEmail returned false：QQ SMTP 发送失败")
	}

	// 找出刚写下的 key：magiclogintoken:<hex>:blog
	pattern := "magiclogintoken:*:blog"
	keys, err := rdb.Keys(context.Background(), pattern).Result()
	if err != nil {
		t.Fatalf("redis KEYS %s: %v", pattern, err)
	}
	var (
		matchedKey string
		matchedVal string
	)
	for _, k := range keys {
		v, _ := rdb.Get(context.Background(), k).Result()
		if v == target {
			matchedKey = k
			matchedVal = v
			break
		}
	}
	if matchedKey == "" {
		t.Fatalf("redis 没找到对应 %s 的 magic login key，已扫到的 keys=%v", target, keys)
	}
	t.Cleanup(func() { _ = rdb.Del(context.Background(), matchedKey).Err() })

	// 从 key 拼回 token 形态："magiclogintoken:<hex>:blog" → "<hex>:blog"
	// 即 consume 端实际拿到的字符串（邮件里 link 末段就是这个）。
	hex := strings.TrimPrefix(matchedKey, "magiclogintoken:")
	hex = strings.TrimSuffix(hex, ":blog")
	if len(hex) != magicLoginTokenHex {
		t.Fatalf("hex part 长度 = %d，want %d（key=%q）", len(hex), magicLoginTokenHex, matchedKey)
	}
	token := hex + ":blog"
	t.Logf(">>> redis %s = %q（10min TTL），token = %s", matchedKey, matchedVal, token)

	// consume 接受
	u, p, err := svc.AuthenticateMagicLogin(context.Background(), token)
	if err != nil {
		t.Fatalf("AuthenticateMagicLogin 拒绝刚 send 出的 token：%v", err)
	}
	if u == nil || u.Username != "alice" {
		t.Errorf("AuthenticateMagicLogin 返回 user = %v, want alice", u)
	}
	if p == nil || p.Email == nil || *p.Email != target {
		t.Errorf("AuthenticateMagicLogin 返回 profile.email = %v, want %s", p, target)
	}
	t.Logf(">>> consume 成功：user=%s, email=%s", u.Username, *p.Email)

	// 重复消费被拒（一次性）
	if _, _, err := svc.AuthenticateMagicLogin(context.Background(), token); !errors.Is(err, usererrs.ErrInvalidMagicToken) {
		t.Errorf("重复 consume 应该 ErrInvalidMagicToken，实得 %v", err)
	}

	// 跨 mode 隔离：把 token 切成 nomu mode 应该查不到（key 不存在）
	if _, _, err := svc.AuthenticateMagicLogin(context.Background(), hex+":nomu"); !errors.Is(err, usererrs.ErrInvalidMagicToken) {
		t.Errorf("跨 mode（blog→nomu）应该被拒，实得 %v", err)
	}
}
