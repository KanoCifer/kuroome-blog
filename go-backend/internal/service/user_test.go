package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/emailtemplates"
)

func TestCheckPassword_Correct(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash error: %v", err)
	}
	svc := &userService{}
	u := &model.User{PasswordHash: string(hash)}
	if !svc.CheckPassword(u, "secret123") {
		t.Error("CheckPassword should return true for correct password")
	}
}

func TestCheckPassword_Wrong(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash error: %v", err)
	}
	svc := &userService{}
	u := &model.User{PasswordHash: string(hash)}
	if svc.CheckPassword(u, "wrong") {
		t.Error("CheckPassword should return false for wrong password")
	}
}

func TestCheckPassword_EmptyHash(t *testing.T) {
	svc := &userService{}
	u := &model.User{PasswordHash: ""}
	if svc.CheckPassword(u, "anything") {
		t.Error("CheckPassword should return false when hash is empty")
	}
}

func TestBoolToInt_Helper(t *testing.T) {
	// 复用 service.boolToInt 目前在 admin_test.go 未覆盖，此处顺手测。
	// 注意 boolToInt 为包内小写，需在 package service 内测试。
	tests := []struct {
		in   bool
		want int
	}{
		{true, 1},
		{false, 0},
	}
	for _, tt := range tests {
		if got := boolToInt(tt.in); got != tt.want {
			t.Errorf("boolToInt(%v) = %d, want %d", tt.in, got, tt.want)
		}
	}
}

// ---------- IsAdmin ----------

func TestIsAdmin_InList(t *testing.T) {
	svc := &userService{adminUserIDs: []int{1, 42, 99}}
	u := &model.User{Model: gormModel(42)}
	if !svc.IsAdmin(u) {
		t.Error("IsAdmin should return true for user in adminUserIDs")
	}
}

func TestIsAdmin_NotInList(t *testing.T) {
	svc := &userService{adminUserIDs: []int{1, 42, 99}}
	u := &model.User{Model: gormModel(7)}
	if svc.IsAdmin(u) {
		t.Error("IsAdmin should return false for user not in adminUserIDs")
	}
}

func TestIsAdmin_EmptyList(t *testing.T) {
	svc := &userService{adminUserIDs: []int{}}
	u := &model.User{Model: gormModel(1)}
	if svc.IsAdmin(u) {
		t.Error("IsAdmin should return false when adminUserIDs is empty")
	}
}

// ---------- UserToDict ----------

func TestUserToDict_BasicFields(t *testing.T) {
	svc := &userService{adminUserIDs: []int{1}}
	email := "test@example.com"
	profile := &model.Profile{ID: 1, Email: &email}
	u := &model.User{
		Model:             gormModel(1),
		Username:          "alice",
		Name:              "Alice",
		LoginCount:        5,
		Active:            true,
		PasskeyCredential: &model.PasskeyCredential{},
	}

	d := svc.UserToDict(u, profile)

	if d["id"] != uint(1) {
		t.Errorf("id = %v, want 1", d["id"])
	}
	if d["username"] != "alice" {
		t.Errorf("username = %v, want alice", d["username"])
	}
	if d["is_admin"] != true {
		t.Errorf("is_admin = %v, want true", d["is_admin"])
	}
	if d["has_passkey"] != true {
		t.Errorf("has_passkey = %v, want true", d["has_passkey"])
	}
	if d["email"] != "test@example.com" {
		t.Errorf("email = %v, want test@example.com", d["email"])
	}
}

func TestUserToDict_GitHubBound(t *testing.T) {
	svc := &userService{adminUserIDs: []int{}}
	githubID := 12345
	u := &model.User{
		Model:    gormModel(2),
		Username: "bob",
		GithubID: &githubID,
	}

	d := svc.UserToDict(u, nil)

	if d["github_bound"] != true {
		t.Errorf("github_bound = %v, want true", d["github_bound"])
	}
	if d["github_id"] != 12345 {
		t.Errorf("github_id = %v, want 12345", d["github_id"])
	}
}

func TestUserToDict_NilProfileOmitsFields(t *testing.T) {
	svc := &userService{adminUserIDs: []int{}}
	u := &model.User{Model: gormModel(3), Username: "carol"}

	d := svc.UserToDict(u, nil)

	if _, ok := d["email"]; ok {
		t.Error("email should not be present when profile is nil")
	}
	if _, ok := d["photo"]; ok {
		t.Error("photo should not be present when profile is nil")
	}
}

func TestUserToDict_ProfileWithZeroID(t *testing.T) {
	// profile.ID == 0 视为"无有效 profile"，不输出 profile 字段
	svc := &userService{adminUserIDs: []int{}}
	email := "x@test.com"
	u := &model.User{Model: gormModel(4), Username: "dave"}
	p := &model.Profile{ID: 0, Email: &email}

	d := svc.UserToDict(u, p)

	if _, ok := d["email"]; ok {
		t.Error("email should not be present when profile.ID == 0")
	}
}

// ---------- GetByID ----------

// mockUserRepo 为 GetByID / Authenticate 测试提供最小 UserRepositoryer 实现。
type mockUserRepo struct {
	getByIDFn       func(ctx context.Context, id uint) (*model.User, error)
	getByUsernameFn func(ctx context.Context, username string) (*model.User, error)
	getByEmailFn    func(ctx context.Context, email string) (*model.User, *model.Profile, error)
	usernameExists  bool
	emailExists     bool
}

func (m *mockUserRepo) Create(ctx context.Context, user *model.User, profile *model.Profile) error {
	return nil
}

func (m *mockUserRepo) GetByID(ctx context.Context, id uint) (*model.User, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockUserRepo) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	if m.getByUsernameFn != nil {
		return m.getByUsernameFn(ctx, username)
	}
	return nil, nil
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*model.User, *model.Profile, error) {
	if m.getByEmailFn != nil {
		return m.getByEmailFn(ctx, email)
	}
	return nil, nil, nil
}

func (m *mockUserRepo) GetByGithubID(ctx context.Context, githubID int) (*model.User, error) {
	return nil, nil
}

func (m *mockUserRepo) SetGithubID(ctx context.Context, userID uint, githubID int) error {
	return nil
}

func (m *mockUserRepo) ClearGithubID(ctx context.Context, userID uint) error {
	return nil
}

func (m *mockUserRepo) UsernameExists(ctx context.Context, username string) bool {
	return m.usernameExists
}

func (m *mockUserRepo) EmailExists(ctx context.Context, email string) bool {
	return m.emailExists
}

func (m *mockUserRepo) ListUsersWithLoginRecords(ctx context.Context) ([]model.User, error) {
	return nil, nil
}

func (m *mockUserRepo) Update(ctx context.Context, user *model.User) error {
	return nil
}

func (m *mockUserRepo) UpdateProfile(ctx context.Context, profile *model.Profile) error {
	return nil
}

func (m *mockUserRepo) GetProfile(ctx context.Context, userID uint) (*model.Profile, error) {
	return nil, nil
}

func (m *mockUserRepo) CreateProfile(ctx context.Context, userID uint) (*model.Profile, error) {
	return &model.Profile{UserID: userID}, nil
}

func (m *mockUserRepo) Delete(ctx context.Context, user *model.User) error {
	return nil
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mockUserRepo{
		getByIDFn: func(ctx context.Context, id uint) (*model.User, error) { return nil, nil },
	}
	svc := NewUserService(repo, nil, nil, nil)

	_, _, err := svc.GetByID(context.Background(), 999)
	if !errors.Is(err, usererrs.ErrUserNotFound) {
		t.Errorf("err = %v, want ErrUserNotFound", err)
	}
}

func TestGetByID_RepoError(t *testing.T) {
	repo := &mockUserRepo{
		getByIDFn: func(ctx context.Context, id uint) (*model.User, error) {
			return nil, errors.New("db error")
		},
	}
	svc := NewUserService(repo, nil, nil, nil)

	_, _, err := svc.GetByID(context.Background(), 1)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestGetByID_Success(t *testing.T) {
	repo := &mockUserRepo{
		getByIDFn: func(ctx context.Context, id uint) (*model.User, error) {
			return &model.User{Model: gormModel(id), Username: "alice"}, nil
		},
	}
	svc := NewUserService(repo, nil, nil, nil)

	u, p, err := svc.GetByID(context.Background(), uint(1))
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if u.Username != "alice" {
		t.Errorf("username = %q, want alice", u.Username)
	}
	if p != nil {
		t.Errorf("profile = %v, want nil (no preloaded profile)", p)
	}
}

// ---------- Authenticate ----------

func TestAuthenticate_UserNotFound(t *testing.T) {
	repo := &mockUserRepo{
		getByUsernameFn: func(ctx context.Context, username string) (*model.User, error) {
			return nil, nil
		},
	}
	svc := NewUserService(repo, nil, nil, nil)

	_, err := svc.Authenticate(context.Background(), "ghost", "pass")
	if !errors.Is(err, usererrs.ErrInvalidCredentials) {
		t.Errorf("err = %v, want ErrInvalidCredentials", err)
	}
}

func TestAuthenticate_WrongPassword(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("correct"), bcrypt.DefaultCost)
	repo := &mockUserRepo{
		getByUsernameFn: func(ctx context.Context, username string) (*model.User, error) {
			return &model.User{Model: gormModel(1), PasswordHash: string(hash)}, nil
		},
	}
	svc := NewUserService(repo, nil, nil, nil)

	_, err := svc.Authenticate(context.Background(), "alice", "wrong")
	if !errors.Is(err, usererrs.ErrInvalidCredentials) {
		t.Errorf("err = %v, want ErrInvalidCredentials", err)
	}
}

func TestAuthenticate_Success(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.DefaultCost)
	repo := &mockUserRepo{
		getByUsernameFn: func(ctx context.Context, username string) (*model.User, error) {
			return &model.User{Model: gormModel(1), Username: "alice", PasswordHash: string(hash)}, nil
		},
	}
	svc := NewUserService(repo, nil, nil, nil)

	u, err := svc.Authenticate(context.Background(), "alice", "secret")
	if err != nil {
		t.Fatalf("Authenticate: %v", err)
	}
	if u.Username != "alice" {
		t.Errorf("username = %q, want alice", u.Username)
	}
}

// TestAuthenticate_LogPropagatesTraceID 验证 service 层 INFO 日志在 §5
// 新规则下也保持 trace_id 串联。这是「INFO 在 service」契约的模板测试。
// 复制到其它 service（auth / moment / fish / upload / ws）的对应业务
// 事件即可。
func TestAuthenticate_LogPropagatesTraceID(t *testing.T) {
	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(logger.NewTestHandler(&buf, slog.LevelDebug))
	t.Cleanup(func() { slog.SetDefault(prev) })

	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.DefaultCost)
	repo := &mockUserRepo{
		getByUsernameFn: func(ctx context.Context, username string) (*model.User, error) {
			return &model.User{Model: gormModel(1), Username: "alice", PasswordHash: string(hash)}, nil
		},
	}
	svc := NewUserService(repo, nil, nil, nil)

	ctx := logger.WithTraceID(context.Background(), "trace-xyz")
	if _, err := svc.Authenticate(ctx, "alice", "secret"); err != nil {
		t.Fatalf("Authenticate: %v", err)
	}

	rec := map[string]any{}
	if err := json.Unmarshal(bytes.TrimSpace(buf.Bytes()), &rec); err != nil {
		t.Fatalf("unmarshal slog record: %v\nraw: %s", err, buf.String())
	}
	if rec["trace_id"] != "trace-xyz" {
		t.Errorf("trace_id = %v, want trace-xyz; record: %v", rec["trace_id"], rec)
	}
	if rec["level"] != "INFO" {
		t.Errorf("level = %v, want INFO (service §5 contract)", rec["level"])
	}
	if rec["msg"] != "user login" {
		t.Errorf("msg = %v, want 'user login'", rec["msg"])
	}
}

// ---------- Logout ----------

func TestLogout_NilRedis(t *testing.T) {
	// redis 为 nil 时不应 panic
	svc := &userService{redis: nil}
	svc.Logout(context.Background(), 1) // should not panic
}

func TestLogout_WithRedis(t *testing.T) {
	// 用真实 redis 客户端验证 Logout 调用 Del（需要 redis 可用，这里仅验证不 panic）
	// 完整集成测试留到 e2e；此处验证 nil 安全与接口签名
	var r *redis.Client
	svc := &userService{redis: r}
	svc.Logout(context.Background(), 1)
}

// ---------- VerifyEmailCode ----------

func TestVerifyEmailCode_NilRedis(t *testing.T) {
	svc := &userService{redis: nil}
	if svc.verifyEmailCode(context.Background(), "a@b.com", "123456", modeBlog) {
		t.Error("verifyEmailCode should return false when redis is nil")
	}
}

func TestVerifyEmailCode_EmptyEmail(t *testing.T) {
	svc := &userService{redis: nil}
	if svc.verifyEmailCode(context.Background(), "", "123456", modeBlog) {
		t.Error("verifyEmailCode should return false when email is empty")
	}
}

func TestEmailCode_SendAndVerifyShareKeyNamespace(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	svc := &userService{redis: rdb}
	const email = "alice@example.com"
	const code = "654321"

	// 模拟 SendEmailCode 写 key 的形态（blog 模式）
	key := emailCodeKey(email, modeBlog)
	if err := rdb.Set(context.Background(), key, code, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed: %v", err)
	}

	if !svc.verifyEmailCode(context.Background(), email, code, modeBlog) {
		t.Fatal("verifyEmailCode should accept the code written under the same mode namespace")
	}
	// 消费后 key 被删除
	if mr.Exists(key) {
		t.Error("email code key should be deleted after successful verify")
	}
}

// TestEmailCode_CrossModeIsolation 同邮箱下 blog 验证码不应被 nomu 消费。
//
// 锁住 handoff §4.3 同款契约：redis key 按 mode 分段，跨 mode 互不串。
// 这条契约之前只在 magic login 上验证过；email code 加 mode 后必须延续。
func TestEmailCode_CrossModeIsolation(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	svc := &userService{redis: rdb}
	const email = "alice@example.com"
	const code = "111222"

	blogKey := emailCodeKey(email, modeBlog)
	nomuKey := emailCodeKey(email, modeNomu)

	// 只写 blog 模式
	if err := rdb.Set(context.Background(), blogKey, code, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed blog: %v", err)
	}

	// 拿 nomu 模式来消费 blog 验证码 → 应当被拒
	if svc.verifyEmailCode(context.Background(), email, code, modeNomu) {
		t.Error("nomu mode consumed blog key — cross-mode isolation broken")
	}
	// blog 那份还在（没被 nomu 误删）
	if !mr.Exists(blogKey) {
		t.Error("blog key was wrongly consumed by nomu verify")
	}

	// blog 模式消费自己的 key → 应当成功
	if !svc.verifyEmailCode(context.Background(), email, code, modeBlog) {
		t.Error("blog mode should consume its own key")
	}
	if mr.Exists(blogKey) {
		t.Error("blog key should be deleted after successful verify")
	}
	_ = nomuKey // nomu 这条 key 本测试不写，仅作占位以防后续加断言
}

// ---------- MagicLogin ----------

// TestSendMagicLoginEmail_EmailNotRegistered 邮箱未注册时静默 true，
// 防止枚举；不调用 redis。
func TestSendMagicLoginEmail_EmailNotRegistered(t *testing.T) {
	repo := &mockUserRepo{emailExists: false}
	svc := NewUserService(repo, nil, nil, nil)

	if !svc.SendMagicLoginEmail(context.Background(), "ghost@example.com", "blog", "") {
		t.Error("SendMagicLoginEmail should return true (silent success) for unregistered email")
	}
}

// TestAuthenticateMagicLogin_NilRedis 无 redis 直接 401 等价。
func TestAuthenticateMagicLogin_NilRedis(t *testing.T) {
	svc := NewUserService(&mockUserRepo{}, nil, nil, nil)
	_, _, err := svc.AuthenticateMagicLogin(context.Background(), "any-token:blog")
	if !errors.Is(err, usererrs.ErrInvalidMagicToken) {
		t.Errorf("err = %v, want ErrInvalidMagicToken", err)
	}
}

// TestAuthenticateMagicLogin_BadLengthToken 长度不符直接拒绝，避免污染 key。
// 缺冒号、缺 mode 段、hex 长度不对都视为非法 token。
func TestAuthenticateMagicLogin_BadLengthToken(t *testing.T) {
	svc := NewUserService(&mockUserRepo{}, redis.NewClient(&redis.Options{}), nil, nil)
	bad := []string{
		"short",                           // 无冒号、无 mode
		"short:blog",                      // hex 段太短
		strings.Repeat("a", 64),           // 缺冒号、缺 mode
		strings.Repeat("a", 64) + ":",     // mode 为空
		strings.Repeat("a", 64) + ":h5",   // mode 非法
		strings.Repeat("a", 63) + ":blog", // hex 长度 63
		strings.Repeat("a", 65) + ":blog", // hex 长度 65
	}
	for _, tok := range bad {
		_, _, err := svc.AuthenticateMagicLogin(context.Background(), tok)
		if !errors.Is(err, usererrs.ErrInvalidMagicToken) {
			t.Errorf("token %q: err = %v, want ErrInvalidMagicToken", tok, err)
		}
	}
}

// TestAuthenticateMagicLogin_EmptyToken 空 token 立即拒绝。
func TestAuthenticateMagicLogin_EmptyToken(t *testing.T) {
	svc := NewUserService(&mockUserRepo{}, redis.NewClient(&redis.Options{}), nil, nil)
	_, _, err := svc.AuthenticateMagicLogin(context.Background(), "")
	if !errors.Is(err, usererrs.ErrInvalidMagicToken) {
		t.Errorf("err = %v, want ErrInvalidMagicToken", err)
	}
}

// ---------- mode 路由（blog / nomu）----------

// TestMagicLoginLinkPathFor 锁定两个 mode 对应的路径模板。
// nomu 走 hash 路由，所以 path 必须含 "#"；blog 走普通 SPA 路由。
func TestMagicLoginLinkPathFor(t *testing.T) {
	cases := []struct {
		mode     string
		wantPath string
	}{
		{"blog", "/auth/magic?token=%s"},
		{"nomu", "/options.html#/login/magic?token=%s"},
	}
	for _, c := range cases {
		got := magicLoginLinkPathFor(c.mode)
		if got != c.wantPath {
			t.Errorf("magicLoginLinkPathFor(%q) = %q, want %q", c.mode, got, c.wantPath)
		}
	}
}

// TestSplitMagicLoginToken 锁定 token 解析的合法 / 非法边界。
func TestSplitMagicLoginToken(t *testing.T) {
	hex := strings.Repeat("a", 64)
	cases := []struct {
		tok     string
		wantOk  bool
		wantHex string
		wantMod string
	}{
		{hex + ":blog", true, hex, "blog"},
		{hex + ":nomu", true, hex, "nomu"},
		{"short", false, "", ""},
		{hex, false, "", ""},
		{hex + ":", false, "", ""},
		{hex + ":h5", false, "", ""},
		{strings.Repeat("a", 63) + ":blog", false, "", ""},
		{strings.Repeat("a", 65) + ":blog", false, "", ""},
	}
	for _, c := range cases {
		gotHex, gotMod, gotOk := splitMagicLoginToken(c.tok)
		if gotOk != c.wantOk {
			t.Errorf("splitMagicLoginToken(%q) ok = %v, want %v", c.tok, gotOk, c.wantOk)
			continue
		}
		if gotOk && (gotHex != c.wantHex || gotMod != c.wantMod) {
			t.Errorf("splitMagicLoginToken(%q) = (%q,%q), want (%q,%q)",
				c.tok, gotHex, gotMod, c.wantHex, c.wantMod)
		}
	}
}

// TestMagicLoginLink_BlogHost 校验 blog mode 拼出的链接：
// <blogHost>/auth/magic?token=<token>。
func TestMagicLoginLink_BlogHost(t *testing.T) {
	svc := &userService{frontendURLs: map[string]string{
		"blog": "https://kanocifer.chat",
		"nomu": "chrome-extension://abcdef",
	}}
	link := svc.magicLoginLink("deadbeef:blog", "blog")
	want := "https://kanocifer.chat/auth/magic?token=deadbeef:blog"
	if link != want {
		t.Errorf("blog link = %q, want %q", link, want)
	}
}

// TestMagicLoginLink_NomuHost 校验 nomu mode 拼出的链接：
// <nomuHost>/options.html#/login/magic?token=<token>。# 必须保留。
func TestMagicLoginLink_NomuHost(t *testing.T) {
	svc := &userService{frontendURLs: map[string]string{
		"blog": "https://kanocifer.chat",
		"nomu": "chrome-extension://abcdef",
	}}
	link := svc.magicLoginLink("deadbeef:nomu", "nomu")
	want := "chrome-extension://abcdef/options.html#/login/magic?token=deadbeef:nomu"
	if link != want {
		t.Errorf("nomu link = %q, want %q", link, want)
	}
}

// TestMagicLoginLink_HostMissing 未注入对应 mode 的 host 时回退为相对路径，
// 方便 dev / 配置漂移时排查。
func TestMagicLoginLink_HostMissing(t *testing.T) {
	svc := &userService{frontendURLs: map[string]string{}}
	if got := svc.magicLoginLink("h:blog", "blog"); got != "/auth/magic?token=h:blog" {
		t.Errorf("missing host blog = %q", got)
	}
	if got := svc.magicLoginLink("h:nomu", "nomu"); got != "/options.html#/login/magic?token=h:nomu" {
		t.Errorf("missing host nomu = %q", got)
	}
}

// TestMagicLoginLink_HostTrailingSlash host 末尾的 "/" 应被 TrimRight 掉，
// 避免 chrome-extension://id//options.html 这种双斜杠。
func TestMagicLoginLink_HostTrailingSlash(t *testing.T) {
	svc := NewUserService(&mockUserRepo{}, nil, nil, map[string]string{
		"nomu": "chrome-extension://abcdef/",
	})
	link := svc.magicLoginLink("h:nomu", "nomu")
	if strings.Contains(link, "//options.html") {
		t.Errorf("double slash detected: %q", link)
	}
}

// TestAuthenticateMagicLogin_CrossModeIsolation 跨 mode 隔离是 handoff §4.3
// 的核心契约：blog 写入 magiclogintoken:<hex>:blog，nomu 拿同样 hex 消费
// 必须 401；反过来也成立。这是 redis key 按 mode 分段的目的。
func TestAuthenticateMagicLogin_CrossModeIsolation(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	repo := &mockUserRepo{
		getByEmailFn: func(ctx context.Context, email string) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(1), Username: "alice"}, nil, nil
		},
	}
	svc := NewUserService(repo, rdb, nil, nil)

	const hex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	emailKey := "magiclogintoken:" + hex + ":blog"
	if err := rdb.Set(context.Background(), emailKey, "alice@example.com", 0).Err(); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// 1) nomu 模式拿这个 hex 来消费 —— 应当 401（不是 ErrInvalidMagicToken 就是 redis.Nil 链回 401）。
	if _, _, err := svc.AuthenticateMagicLogin(context.Background(), hex+":nomu"); !errors.Is(err, usererrs.ErrInvalidMagicToken) {
		t.Errorf("nomu consuming blog key: err = %v, want ErrInvalidMagicToken", err)
	}
	// 验证 blog 那份还在（没被 nomu 误删）。
	if mr.Exists(emailKey) == false {
		t.Error("blog key was wrongly consumed by nomu request")
	}

	// 2) blog 模式拿自己的 hex 来消费 —— 必须成功。
	u, _, err := svc.AuthenticateMagicLogin(context.Background(), hex+":blog")
	if err != nil {
		t.Fatalf("blog consuming blog key: %v", err)
	}
	if u == nil || u.Username != "alice" {
		t.Errorf("user = %v, want alice", u)
	}
	// blog 那份已被 GETDEL 删掉。
	if mr.Exists(emailKey) {
		t.Error("blog key should be deleted after successful consumption")
	}
}

// TestPollNomuLogin_DoneAfterConfirm 验证 nomu 接法 B 的核心契约：
// AuthenticateMagicLogin 消费 nomu token 后，把登录结果写回 device_id 槽位，
// PollNomuLogin 轮询该 device_id 应取到 done + 一对 token + 用户信息。
func TestPollNomuLogin_DoneAfterConfirm(t *testing.T) {
	// finishNomuLogin 内部 CreateTokens 需要 config.Cfg.Security.SecretKey。
	// 仅在此用例注入最小占位 cfg，避免全局 config.Cfg 为 nil 时 jwt 签名 panic。
	prevCfg := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret"}}
	t.Cleanup(func() { config.Cfg = prevCfg })

	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	repo := &mockUserRepo{
		getByEmailFn: func(ctx context.Context, email string) (*model.User, *model.Profile, error) {
			return &model.User{Model: gormModel(1), Username: "alice"}, nil, nil
		},
	}
	svc := NewUserService(repo, rdb, nil, nil)

	const hex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	const deviceID = "nomu-device-abc"
	// 模拟 SendMagicLoginEmail 落下的 redis：token 段 + hex→device 反向映射。
	emailKey := "magiclogintoken:" + hex + ":nomu"
	if err := rdb.Set(context.Background(), emailKey, "alice@example.com", 0).Err(); err != nil {
		t.Fatalf("seed email key: %v", err)
	}
	if err := rdb.Set(context.Background(), "nomulogin:hex:"+hex, deviceID, 0).Err(); err != nil {
		t.Fatalf("seed hex→device: %v", err)
	}

	// 消费 token → 写槽位
	if _, _, err := svc.AuthenticateMagicLogin(context.Background(), hex+":nomu"); err != nil {
		t.Fatalf("AuthenticateMagicLogin(nomu): %v", err)
	}

	// 轮询 device_id → done
	st, err := svc.PollNomuLogin(context.Background(), deviceID)
	if err != nil {
		t.Fatalf("PollNomuLogin: %v", err)
	}
	if st.Status != "done" {
		t.Errorf("status = %q, want done", st.Status)
	}
	if st.AccessToken == "" || st.RefreshToken == "" {
		t.Errorf("expected tokens in done state, got %+v", st)
	}
	if st.User == nil {
		t.Error("expected user in done state")
	}
	// 反向映射用完即删
	if mr.Exists("nomulogin:hex:" + hex) {
		t.Error("hex→device mapping should be deleted after confirm")
	}
}

// TestPollNomuLogin_PendingWhenMissing 槽位不存在 / 未确认应返回 pending 而非错误，
// 让扩展可放心持续轮询而不会因抢跑收到 4xx。
func TestPollNomuLogin_PendingWhenMissing(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	svc := NewUserService(&mockUserRepo{}, rdb, nil, nil)
	st, err := svc.PollNomuLogin(context.Background(), "no-such-device")
	if err != nil {
		t.Fatalf("PollNomuLogin: %v", err)
	}
	if st.Status != "pending" {
		t.Errorf("status = %q, want pending for missing slot", st.Status)
	}
}

// TestPollNomuLogin_PendingWhenNilRedis redis 未配置同样回 pending，禁止 500。
func TestPollNomuLogin_PendingWhenNilRedis(t *testing.T) {
	svc := NewUserService(&mockUserRepo{}, nil, nil, nil)
	st, err := svc.PollNomuLogin(context.Background(), "dev")
	if err != nil {
		t.Fatalf("PollNomuLogin: %v", err)
	}
	if st.Status != "pending" {
		t.Errorf("status = %q, want pending", st.Status)
	}
}

// ---------- HTML 模板：mode 路由 ----------

// TestRenderVerificationHTML_BlogVsNomu 锁住两套 HTML 的关键差异：
// nomu 必须带 logo URL + "Nomu" 副标 + "代发" 页脚；blog 都不带。
// 这是品牌认知 + 防回归的最小断言，足够发现未来改坏一边的设计。
func TestRenderVerificationHTML_BlogVsNomu(t *testing.T) {
	code := "123456"

	blog := emailtemplates.RenderVerificationHTML(code, modeBlog)
	nomu := emailtemplates.RenderVerificationHTML(code, modeNomu)

	// blog 特征：含 "kanocifer.chat" wordmark + "注册验证码" 副标；
	// 不应含 logo URL 也不应含 "Nomu" 品牌。
	if !strings.Contains(blog, "kanocifer.chat") {
		t.Error("blog html should mention kanocifer.chat wordmark")
	}
	if strings.Contains(blog, emailtemplates.NomuLogoURL) {
		t.Error("blog html should NOT embed nomu logo")
	}
	if strings.Contains(blog, "Nomu") {
		t.Error("blog html should NOT mention Nomu")
	}
	if !strings.Contains(blog, code) {
		t.Error("blog html should embed the code")
	}

	// nomu 特征：含 logo URL + "Nomu" 副标 + "代发" 页脚。
	if !strings.Contains(nomu, emailtemplates.NomuLogoURL) {
		t.Error("nomu html should embed nomu logo")
	}
	if !strings.Contains(nomu, "Nomu") {
		t.Error("nomu html should mention Nomu")
	}
	if !strings.Contains(nomu, "代 Nomu 发送") {
		t.Error("nomu html should have '代 Nomu 发送' footer")
	}
	if !strings.Contains(nomu, code) {
		t.Error("nomu html should embed the code")
	}
}

func TestRenderMagicLoginHTML_BlogVsNomu(t *testing.T) {
	link := "https://example.com/auth/magic?token=deadbeef"

	blog := emailtemplates.RenderMagicLoginHTML(link, modeBlog)
	nomu := emailtemplates.RenderMagicLoginHTML(link, modeNomu)

	// blog 不带 logo / Nomu
	if strings.Contains(blog, emailtemplates.NomuLogoURL) {
		t.Error("blog magic-login html should NOT embed nomu logo")
	}
	if strings.Contains(blog, "Nomu") {
		t.Error("blog magic-login html should NOT mention Nomu")
	}
	// CTA 文案
	if !strings.Contains(blog, "登录 kanocifer.chat") {
		t.Error("blog magic-login button should say 登录 kanocifer.chat")
	}
	if !strings.Contains(blog, link) {
		t.Error("blog magic-login should embed the link")
	}

	// nomu 带 logo + Nomu + "完成 Nomu 登录" CTA
	if !strings.Contains(nomu, emailtemplates.NomuLogoURL) {
		t.Error("nomu magic-login html should embed nomu logo")
	}
	if !strings.Contains(nomu, "完成 Nomu 登录") {
		t.Error("nomu magic-login button should say 完成 Nomu 登录")
	}
	if !strings.Contains(nomu, link) {
		t.Error("nomu magic-login should embed the link")
	}
}

// TestNormalizeMode 兜底非法 mode 为 blog。空 / 未知值都走 blog。
func TestNormalizeMode(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"", modeBlog},
		{"blog", modeBlog},
		{"nomu", modeNomu},
		{"h5", modeBlog},
		{"BLOG", modeBlog}, // 大小写敏感：BLOG 不算合法，走 blog 兜底
	}
	for _, c := range cases {
		if got := normalizeMode(c.in); got != c.want {
			t.Errorf("normalizeMode(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

// TestBuildVerificationEmail_Title 锁住 mode 决定邮件标题。
func TestBuildVerificationEmail_Title(t *testing.T) {
	blog := emailtemplates.VerificationEmail("123456", modeBlog)
	nomu := emailtemplates.VerificationEmail("123456", modeNomu)
	if blog.Title != "kanocifer.chat 注册验证码" {
		t.Errorf("blog title = %q", blog.Title)
	}
	if nomu.Title != "Nomu 注册验证码" {
		t.Errorf("nomu title = %q", nomu.Title)
	}
}

func TestBuildMagicLoginEmail_Title(t *testing.T) {
	blog := emailtemplates.MagicLoginEmail("https://x", modeBlog)
	nomu := emailtemplates.MagicLoginEmail("https://x", modeNomu)
	if blog.Title != "kanocifer.chat 登录链接" {
		t.Errorf("blog title = %q", blog.Title)
	}
	if nomu.Title != "Nomu 登录链接" {
		t.Errorf("nomu title = %q", nomu.Title)
	}
}
