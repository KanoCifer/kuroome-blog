package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/emailtemplates"
	jwtpkg "github.com/KanoCifer/kuroome-blog/pkg/jwt"
)

func TestCheckPassword_Correct(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash error: %v", err)
	}
	svc := &UserService{}
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
	svc := &UserService{}
	u := &model.User{PasswordHash: string(hash)}
	if svc.CheckPassword(u, "wrong") {
		t.Error("CheckPassword should return false for wrong password")
	}
}

func TestCheckPassword_EmptyHash(t *testing.T) {
	svc := &UserService{}
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
	svc := &UserService{adminUserIDs: []int{1, 42, 99}}
	u := &model.User{Model: gormModel(42)}
	if !svc.IsAdmin(u) {
		t.Error("IsAdmin should return true for user in adminUserIDs")
	}
}

func TestIsAdmin_NotInList(t *testing.T) {
	svc := &UserService{adminUserIDs: []int{1, 42, 99}}
	u := &model.User{Model: gormModel(7)}
	if svc.IsAdmin(u) {
		t.Error("IsAdmin should return false for user not in adminUserIDs")
	}
}

func TestIsAdmin_EmptyList(t *testing.T) {
	svc := &UserService{adminUserIDs: []int{}}
	u := &model.User{Model: gormModel(1)}
	if svc.IsAdmin(u) {
		t.Error("IsAdmin should return false when adminUserIDs is empty")
	}
}

// ---------- UserToDict ----------

func TestUserToDict_BasicFields(t *testing.T) {
	svc := &UserService{adminUserIDs: []int{1}}
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
	svc := &UserService{adminUserIDs: []int{}}
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
	svc := &UserService{adminUserIDs: []int{}}
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
	svc := &UserService{adminUserIDs: []int{}}
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
	svc := NewUserService(repo, nil, nil, nil, 0, nil, nil)

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
	svc := NewUserService(repo, nil, nil, nil, 0, nil, nil)

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
	svc := NewUserService(repo, nil, nil, nil, 0, nil, nil)

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
	svc := NewUserService(repo, nil, nil, nil, 0, nil, nil)

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
	svc := NewUserService(repo, nil, nil, nil, 0, nil, nil)

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
	svc := NewUserService(repo, nil, nil, nil, 0, nil, nil)

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
	svc := NewUserService(repo, nil, nil, nil, 0, nil, nil)

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

// ---------- CreateTokens (multi-device Hash) ----------

func TestCreateTokens_NilRedis(t *testing.T) {
	prevCfg := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret"}}
	t.Cleanup(func() { config.Cfg = prevCfg })

	svc := &UserService{redis: nil, maxDevices: 5}
	u := &model.User{Model: gormModel(1)}
	toks, err := svc.CreateTokens(context.Background(), u)
	if err != nil {
		t.Fatalf("CreateTokens with nil redis: %v", err)
	}
	if toks.AccessToken == "" || toks.RefreshToken == "" {
		t.Error("expected non-empty tokens with nil redis")
	}
}

func TestCreateTokens_MultiDeviceHash_EvictOldest(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	prevCfg := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret"}}
	t.Cleanup(func() { config.Cfg = prevCfg })

	svc := &UserService{redis: rdb, maxDevices: 3}
	u := &model.User{Model: gormModel(10)}

	// 记录第 1 个 jti（最早）
	tokens := make([]string, 0, 4)
	// 错开 1s 确保 iat 递增
	for i := range 4 {
		if i > 0 {
			time.Sleep(1100 * time.Millisecond)
		}
		toks, err := svc.CreateTokens(context.Background(), u)
		if err != nil {
			t.Fatalf("CreateTokens #%d: %v", i, err)
		}
		tokens = append(tokens, toks.RefreshToken)
	}

	firstJTI := jwtpkg.MustParseID(tokens[0])

	// Hash field 数应被驱逐到 ≤ 3
	n, err := rdb.HLen(context.Background(), "refresh:10").Result()
	if err != nil {
		t.Fatalf("HLen: %v", err)
	}
	if n != 3 {
		t.Errorf("HLen = %d, want 3 (evicted oldest)", n)
	}

	// 最早写入的 jti 必须已被驱逐
	if rdb.HExists(context.Background(), "refresh:10", firstJTI).Val() {
		t.Error("first (oldest) jti should be evicted, but still exists in hash")
	}

	// 最近 3 个 jti 必须都还在
	for _, tok := range tokens[1:] {
		jti := jwtpkg.MustParseID(tok)
		if !rdb.HExists(context.Background(), "refresh:10", jti).Val() {
			t.Errorf("jti %s should still exist after eviction", jti)
		}
	}
}

func TestCreateTokens_NoLimitWhenMaxDevicesZero(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	prevCfg := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret"}}
	t.Cleanup(func() { config.Cfg = prevCfg })

	svc := &UserService{redis: rdb, maxDevices: 0}
	u := &model.User{Model: gormModel(20)}

	for i := range 10 {
		if _, err := svc.CreateTokens(context.Background(), u); err != nil {
			t.Fatalf("CreateTokens #%d: %v", i, err)
		}
	}
	n, err := rdb.HLen(context.Background(), "refresh:20").Result()
	if err != nil {
		t.Fatalf("HLen: %v", err)
	}
	if n != 10 {
		t.Errorf("HLen = %d, want 10 (maxDevices=0 means unlimited)", n)
	}
}

// ---------- RefreshTokens (Hash field 校验 + 轮换) ----------

func TestRefreshTokens_HashFieldMatch(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	prevCfg := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret"}}
	t.Cleanup(func() { config.Cfg = prevCfg })

	svc := &UserService{redis: rdb, maxDevices: 5}
	u := &model.User{Model: gormModel(1)}

	// 设备 A 登录，记录旧 token
	old, err := svc.CreateTokens(context.Background(), u)
	if err != nil {
		t.Fatalf("CreateTokens: %v", err)
	}

	// 设备 B 登录（不应覆盖 A 的 field）
	tokB, err := svc.CreateTokens(context.Background(), u)
	if err != nil {
		t.Fatalf("CreateTokens device B: %v", err)
	}
	jtiB := jwtpkg.MustParseID(tokB.RefreshToken)

	// 设备 A 用旧 token 刷新 → 应成功
	newTokens, err := svc.RefreshTokens(context.Background(), old.RefreshToken)
	if err != nil {
		t.Fatalf("RefreshTokens with valid token: %v", err)
	}
	if newTokens.RefreshToken == old.RefreshToken {
		t.Error("expected rotated refresh token, got same as old")
	}

	// 设备 B 的 field 仍存在（多设备隔离）
	if !rdb.HExists(context.Background(), "refresh:1", jtiB).Val() {
		t.Error("device B field should remain after device A refresh")
	}
}

func TestRefreshTokens_StaleJTIRejected(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	prevCfg := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret"}}
	t.Cleanup(func() { config.Cfg = prevCfg })

	svc := &UserService{redis: rdb, maxDevices: 5}
	u := &model.User{Model: gormModel(1)}

	old, err := svc.CreateTokens(context.Background(), u)
	if err != nil {
		t.Fatalf("CreateTokens: %v", err)
	}

	// 手动删掉旧 jti field（模拟被盗用后用户登出该设备）
	claims, _ := jwtpkg.ParseToken(old.RefreshToken)
	rdb.HDel(context.Background(), "refresh:1", claims.ID)

	// 用已删 jti 的 token 刷新 → 应 401
	if _, err := svc.RefreshTokens(context.Background(), old.RefreshToken); !errors.Is(err, usererrs.ErrInvalidToken) {
		t.Errorf("RefreshTokens with stale jti: err = %v, want ErrInvalidToken", err)
	}
}

func TestRefreshTokens_RotationSwapsField(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	prevCfg := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret"}}
	t.Cleanup(func() { config.Cfg = prevCfg })

	svc := &UserService{redis: rdb, maxDevices: 5}
	u := &model.User{Model: gormModel(1)}

	old, err := svc.CreateTokens(context.Background(), u)
	if err != nil {
		t.Fatalf("CreateTokens: %v", err)
	}
	oldClaims, _ := jwtpkg.ParseToken(old.RefreshToken)

	newTokens, err := svc.RefreshTokens(context.Background(), old.RefreshToken)
	if err != nil {
		t.Fatalf("RefreshTokens: %v", err)
	}
	newClaims, _ := jwtpkg.ParseToken(newTokens.RefreshToken)

	// 旧 field 已删
	if rdb.HExists(context.Background(), "refresh:1", oldClaims.ID).Val() {
		t.Error("old jti field should be deleted after rotation")
	}
	// 新 field 已写
	if !rdb.HExists(context.Background(), "refresh:1", newClaims.ID).Val() {
		t.Error("new jti field should exist after rotation")
	}
}

// ---------- Logout ----------

func TestLogout_NilRedis(t *testing.T) {
	// redis 为 nil 时不应 panic
	svc := &UserService{redis: nil}
	svc.Logout(context.Background(), 1, "jti-old") // should not panic
}

func TestLogout_WithRedis(t *testing.T) {
	// 用真实 redis 客户端验证 Logout 调用 HDel（需要 redis 可用，这里仅验证不 panic）
	// 完整集成测试留到 e2e；此处验证 nil 安全与接口签名
	var r *redis.Client
	svc := &UserService{redis: r}
	svc.Logout(context.Background(), 1, "jti-old")
}

func TestLogout_OnlyDeletesOwnDevice(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	prevCfg := config.Cfg
	config.Cfg = &config.Config{Security: config.SecurityConfig{SecretKey: "test-secret"}}
	t.Cleanup(func() { config.Cfg = prevCfg })

	svc := &UserService{redis: rdb, maxDevices: 5}
	u := &model.User{Model: gormModel(1)}

	tokA, err := svc.CreateTokens(context.Background(), u)
	if err != nil {
		t.Fatalf("CreateTokens A: %v", err)
	}
	tokB, err := svc.CreateTokens(context.Background(), u)
	if err != nil {
		t.Fatalf("CreateTokens B: %v", err)
	}

	claimsA, _ := jwtpkg.ParseToken(tokA.RefreshToken)
	claimsB, _ := jwtpkg.ParseToken(tokB.RefreshToken)

	svc.Logout(context.Background(), 1, claimsA.ID)

	// A 的 field 被删
	if rdb.HExists(context.Background(), "refresh:1", claimsA.ID).Val() {
		t.Error("device A field should be deleted after logout")
	}
	// B 的 field 仍在
	if !rdb.HExists(context.Background(), "refresh:1", claimsB.ID).Val() {
		t.Error("device B field should remain after device A logout")
	}
}

// ---------- VerifyEmailCode ----------

func TestVerifyEmailCode_NilRedis(t *testing.T) {
	svc := &UserService{redis: nil}
	if svc.verifyEmailCode(context.Background(), "a@b.com", "123456", modeBlog) {
		t.Error("verifyEmailCode should return false when redis is nil")
	}
}

func TestVerifyEmailCode_EmptyEmail(t *testing.T) {
	svc := &UserService{redis: nil}
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

	svc := &UserService{redis: rdb}
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

	svc := &UserService{redis: rdb}
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
	svc := NewUserService(repo, nil, nil, nil, 0, nil, nil)

	if !svc.SendMagicLoginEmail(context.Background(), "ghost@example.com", "blog", "") {
		t.Error("SendMagicLoginEmail should return true (silent success) for unregistered email")
	}
}

// TestAuthenticateMagicLogin_NilRedis 无 redis 直接 401 等价。
func TestAuthenticateMagicLogin_NilRedis(t *testing.T) {
	svc := NewUserService(&mockUserRepo{}, nil, nil, nil, 0, nil, nil)
	_, _, err := svc.AuthenticateMagicLogin(context.Background(), "any-token:blog")
	if !errors.Is(err, usererrs.ErrInvalidMagicToken) {
		t.Errorf("err = %v, want ErrInvalidMagicToken", err)
	}
}

// TestAuthenticateMagicLogin_BadLengthToken 长度不符直接拒绝，避免污染 key。
// 缺冒号、缺 mode 段、hex 长度不对都视为非法 token。
func TestAuthenticateMagicLogin_BadLengthToken(t *testing.T) {
	svc := NewUserService(&mockUserRepo{}, redis.NewClient(&redis.Options{}), nil, nil, 0, nil, nil)
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
	svc := NewUserService(&mockUserRepo{}, redis.NewClient(&redis.Options{}), nil, nil, 0, nil, nil)
	_, _, err := svc.AuthenticateMagicLogin(context.Background(), "")
	if !errors.Is(err, usererrs.ErrInvalidMagicToken) {
		t.Errorf("err = %v, want ErrInvalidMagicToken", err)
	}
}

// ---------- mode 路由（blog / nomu）----------

// TestMagicLoginLinkPathFor 锁定两个 mode 对应的路径模板。
// 两者都是 web SPA 路由（blog → /auth/magic，nomu → /nomu/login）。
func TestMagicLoginLinkPathFor(t *testing.T) {
	cases := []struct {
		mode     string
		wantPath string
	}{
		{"blog", "/auth/magic?token=%s"},
		{"nomu", "/nomu/login?token=%s"},
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
	svc := &UserService{frontendURLs: map[string]string{
		"blog": "https://kanocifer.chat",
		"nomu": "https://nomu.kanocifer.chat",
	}}
	link := svc.magicLoginLink("deadbeef:blog", "blog")
	want := "https://kanocifer.chat/auth/magic?token=deadbeef:blog"
	if link != want {
		t.Errorf("blog link = %q, want %q", link, want)
	}
}

// TestMagicLoginLink_NomuHost 校验 nomu mode 拼出的链接：
// <nomuHost>/nomu/login?token=<token>。nomu 回调页部署在独立的
// nomu.kanocifer.chat 落地页站点上。
func TestMagicLoginLink_NomuHost(t *testing.T) {
	svc := &UserService{frontendURLs: map[string]string{
		"blog": "https://kanocifer.chat",
		"nomu": "https://nomu.kanocifer.chat",
	}}
	link := svc.magicLoginLink("deadbeef:nomu", "nomu")
	want := "https://nomu.kanocifer.chat/nomu/login?token=deadbeef:nomu"
	if link != want {
		t.Errorf("nomu link = %q, want %q", link, want)
	}
}

// TestMagicLoginLink_HostMissing 未注入对应 mode 的 host 时回退为相对路径，
// 方便 dev / 配置漂移时排查。
func TestMagicLoginLink_HostMissing(t *testing.T) {
	svc := &UserService{frontendURLs: map[string]string{}}
	if got := svc.magicLoginLink("h:blog", "blog"); got != "/auth/magic?token=h:blog" {
		t.Errorf("missing host blog = %q", got)
	}
	if got := svc.magicLoginLink("h:nomu", "nomu"); got != "/nomu/login?token=h:nomu" {
		t.Errorf("missing host nomu = %q", got)
	}
}

// TestMagicLoginLink_HostTrailingSlash host 末尾的 "/" 应被 TrimRight 掉，
// 避免 https://nomu.kanocifer.chat//nomu/login 这种双斜杠。
func TestMagicLoginLink_HostTrailingSlash(t *testing.T) {
	svc := NewUserService(&mockUserRepo{}, nil, nil, map[string]string{
		"nomu": "https://nomu.kanocifer.chat/",
	}, 0, nil, nil)
	link := svc.magicLoginLink("h:nomu", "nomu")
	if strings.Contains(link, "//nomu/login") {
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
	svc := NewUserService(repo, rdb, nil, nil, 0, nil, nil)

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
	svc := NewUserService(repo, rdb, nil, nil, 0, nil, nil)

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

	svc := NewUserService(&mockUserRepo{}, rdb, nil, nil, 0, nil, nil)
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
	svc := NewUserService(&mockUserRepo{}, nil, nil, nil, 0, nil, nil)
	st, err := svc.PollNomuLogin(context.Background(), "dev")
	if err != nil {
		t.Fatalf("PollNomuLogin: %v", err)
	}
	if st.Status != "pending" {
		t.Errorf("status = %q, want pending", st.Status)
	}
}

// ---------- HTML 模板：mode 路由 ----------

// TestRenderVerificationHTML_NomuStyle 注册验证码邮件已统一为 Nomu 样式：
// 无论 mode 如何，都带 logo URL + "Nomu" 副标 + "代发" 页脚。
// 这是品牌认知 + 防回归的最小断言，足够发现未来改坏模板的设计。
func TestRenderVerificationHTML_NomuStyle(t *testing.T) {
	code := "123456"

	for _, mode := range []string{modeBlog, modeNomu} {
		got := emailtemplates.RenderVerificationHTML(code)

		if !strings.Contains(got, emailtemplates.NomuLogoURL) {
			t.Errorf("mode %s: html should embed nomu logo", mode)
		}
		if !strings.Contains(got, "Nomu") {
			t.Errorf("mode %s: html should mention Nomu", mode)
		}
		if !strings.Contains(got, "代 Nomu 发送") {
			t.Errorf("mode %s: html should have '代 Nomu 发送' footer", mode)
		}
		if !strings.Contains(got, code) {
			t.Errorf("mode %s: html should embed the code", mode)
		}
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

// TestBuildVerificationEmail_Title 注册验证码邮件标题已统一为 Nomu。
func TestBuildVerificationEmail_Title(t *testing.T) {
	got := emailtemplates.VerificationEmail("123456")
	if got.Title != "Nomu 注册验证码" {
		t.Errorf("title = %q", got.Title)
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

// ---------- Pillow Scenario 隔离 ----------

// TestScenarios_KindAndTitle 三种场景的 Kind + Title 互不混淆：
// 防止有人把"找回密码"误填了"注册"的文案，或者反过来。
func TestScenarios_KindAndTitle(t *testing.T) {
	cases := []struct {
		build func(string) emailtemplates.Scenario
		kind  emailtemplates.Kind
		title string
	}{
		{emailtemplates.RegisterScenario, emailtemplates.KindRegister, "Nomu 注册验证码"},
		{emailtemplates.PasswordResetScenario, emailtemplates.KindPasswordReset, "Nomu 找回密码"},
		{emailtemplates.EmailCodeLoginScenario, emailtemplates.KindEmailCodeLogin, "Nomu 登录验证码"},
	}
	for _, c := range cases {
		s := c.build("123456")
		if s.Kind != c.kind {
			t.Errorf("%s: kind = %q, want %q", c.title, s.Kind, c.kind)
		}
		if s.Title != c.title {
			t.Errorf("title = %q, want %q", s.Title, c.title)
		}
		if s.Action.Label != "123456" {
			t.Errorf("code not propagated: %q", s.Action.Label)
		}
	}
}

// TestScenarios_HeadingIsolation 每个场景的 H1 必须是自己的，
// 不能因为 Pillow 模板共享而误用别家文案。
func TestScenarios_HeadingIsolation(t *testing.T) {
	reg := emailtemplates.RegisterScenario("000000")
	pwd := emailtemplates.PasswordResetScenario("000000")
	login := emailtemplates.EmailCodeLoginScenario("000000")

	if reg.Heading == pwd.Heading || reg.Heading == login.Heading {
		t.Errorf("register heading leaks into others: %q", reg.Heading)
	}
	if pwd.Heading == login.Heading {
		t.Errorf("password_reset and email_code_login share heading: %q", pwd.Heading)
	}
}

// TestRenderScenarioHTML_PillowBrand 任意 Scenario 走 Pillow 模板都带
// 品牌元素（Nomu logo / "Nomu" wordmark / 代发页脚），同时渲染自己场景的标题。
func TestRenderScenarioHTML_PillowBrand(t *testing.T) {
	cases := []struct {
		build func(string) emailtemplates.Scenario
		title string
	}{
		{emailtemplates.RegisterScenario, "Nomu 注册验证码"},
		{emailtemplates.PasswordResetScenario, "Nomu 找回密码"},
		{emailtemplates.EmailCodeLoginScenario, "Nomu 登录验证码"},
	}
	for _, c := range cases {
		got := emailtemplates.RenderScenarioHTML(c.build("482913"))

		// Pillow 品牌元素：所有场景共享。
		if !strings.Contains(got, emailtemplates.NomuLogoURL) {
			t.Errorf("%s: should embed nomu logo", c.title)
		}
		if !strings.Contains(got, "Nomu") {
			t.Errorf("%s: should mention Nomu brand", c.title)
		}
		if !strings.Contains(got, "代 Nomu 发送") {
			t.Errorf("%s: should have '代 Nomu 发送' footer", c.title)
		}
		// Pillow 视觉标记：圆角 22 + 等宽字号 + 中性背景。
		if !strings.Contains(got, "border-radius:22px") {
			t.Errorf("%s: pillow card missing 22px rounded card", c.title)
		}
		if !strings.Contains(got, "background:#F5F5F7") {
			t.Errorf("%s: pillow code pill missing #F5F5F7", c.title)
		}
		// 场景标题与验证码嵌入。
		if !strings.Contains(got, c.title) {
			t.Errorf("%s: should embed its own Title in <title>", c.title)
		}
		if !strings.Contains(got, "482913") {
			t.Errorf("%s: should embed the code", c.title)
		}
	}
}

// TestBuildScenarioEmail_PlainTextFallback Body 必须是纯文本 fallback，
// 兼容屏蔽 HTML 的客户端（mail 客户端默认 + 部分安全网关）。
func TestBuildScenarioEmail_PlainTextFallback(t *testing.T) {
	msg := emailtemplates.BuildScenarioEmail(emailtemplates.PasswordResetScenario("654321"))
	if msg.Title != "Nomu 找回密码" {
		t.Errorf("title = %q", msg.Title)
	}
	if !strings.Contains(msg.Body, "654321") {
		t.Errorf("body should embed code as plain text, got %q", msg.Body)
	}
	if msg.Body == msg.HTML {
		t.Error("body must be plain text fallback, not the HTML")
	}
	if !strings.Contains(msg.HTML, "654321") {
		t.Error("html should embed code")
	}
}

// TestRegisterScenario_HTMLEscapesCode 防御 XSS：code 含 <>&" 时必须 escape。
func TestRegisterScenario_HTMLEscapesCode(t *testing.T) {
	s := emailtemplates.RegisterScenario(`<img src=x onerror="1">`)
	if strings.Contains(s.Action.Label, "<img") {
		t.Errorf("code should be HTML-escaped, got %q", s.Action.Label)
	}
}

// TestRenderScenarioHTML_NoFmtErrors Pillow 模板里没有任何 fmt.Sprintf
// 失败标记（%!s(BADINDEX) / %!(EXTRA ...)）。防止将来占位符与 fmt 参数
// 不一致时把错误内容直接渲染到用户邮箱里。
func TestRenderScenarioHTML_NoFmtErrors(t *testing.T) {
	scenarios := []emailtemplates.Scenario{
		emailtemplates.RegisterScenario("123456"),
		emailtemplates.PasswordResetScenario("123456"),
		emailtemplates.EmailCodeLoginScenario("123456"),
		emailtemplates.MagicLoginBlogScenario("https://x?token=t"),
		emailtemplates.MagicLoginNomuScenario("https://x?token=t"),
	}
	for _, s := range scenarios {
		got := emailtemplates.RenderScenarioHTML(s)
		for _, marker := range []string{"%!s", "%!(", "%!("} {
			if strings.Contains(got, marker) {
				t.Errorf("%s: html contains fmt error marker %q\n---\n%s", s.Kind, marker, got)
			}
		}
	}
}

// 22px 大卡 + kanocifer 品牌 + BlogLogoURL + 蓝色 CTA + 单行页脚（无"代发"行）。
func TestMagicLoginBlogScenario_Pillow(t *testing.T) {
	link := "https://kanocifer.chat/auth/magic?token=deadbeef&exp=1737350400"
	s := emailtemplates.MagicLoginBlogScenario(link)

	if s.Kind != emailtemplates.KindMagicLoginBlog {
		t.Errorf("kind = %q", s.Kind)
	}
	if s.Brand != "kanocifer.chat" {
		t.Errorf("brand = %q", s.Brand)
	}
	if s.LogoURL == emailtemplates.NomuLogoURL {
		t.Error("blog should not use Nomu logo")
	}
	if s.Action.Kind != emailtemplates.ActionButton {
		t.Errorf("action kind = %q", s.Action.Kind)
	}
	if s.Action.Label != "登录 kanocifer.chat" {
		t.Errorf("button label = %q", s.Action.Label)
	}
	if s.Action.URL == "" {
		t.Error("button url empty")
	}
	if s.FooterBy != "" {
		t.Errorf("blog should skip '代发' footer, got FooterBy=%q", s.FooterBy)
	}

	html := emailtemplates.RenderScenarioHTML(s)
	for _, want := range []string{
		"border-radius:22px",    // Pillow 大卡
		"background:#007AFF",    // Pillow 蓝色 CTA
		"登录 kanocifer.chat",     // 按钮文案
		"token=deadbeef",        // URL 包含原 token
		"kanocifer.chat · 魔法登录", // 单行页脚
	} {
		if !strings.Contains(html, want) {
			t.Errorf("html missing %q", want)
		}
	}
	if strings.Contains(html, "代 Nomu 发送") {
		t.Error("blog magic-login should NOT have '代 Nomu 发送' footer")
	}
}

// TestMagicLoginNomuScenario_Pillow 魔法登录 nomu 走 Pillow：
// 22px 大卡 + Nomu 品牌 + NomuLogoURL + 蓝色 CTA + 代发页脚。
func TestMagicLoginNomuScenario_Pillow(t *testing.T) {
	link := "https://kanocifer.chat/nomu/login?token=deadbeef"
	s := emailtemplates.MagicLoginNomuScenario(link)

	if s.Kind != emailtemplates.KindMagicLoginNomu {
		t.Errorf("kind = %q", s.Kind)
	}
	if s.Brand != "Nomu" {
		t.Errorf("brand = %q", s.Brand)
	}
	if s.LogoURL != emailtemplates.NomuLogoURL {
		t.Error("nomu should use Nomu logo")
	}
	if s.Action.Label != "完成 Nomu 登录" {
		t.Errorf("button label = %q", s.Action.Label)
	}
	if s.FooterBy != "kanocifer.chat" {
		t.Errorf("nomu FooterBy = %q, want kanocifer.chat", s.FooterBy)
	}

	html := emailtemplates.RenderScenarioHTML(s)
	for _, want := range []string{
		"border-radius:22px", // Pillow 大卡
		"background:#007AFF", // Pillow 蓝色 CTA
		"完成 Nomu 登录",         // 按钮文案
		"token=deadbeef",     // URL 包含原 token
		"代 Nomu 发送",          // 代发页脚
		"Nomu · 魔法登录",        // FooterLine
	} {
		if !strings.Contains(html, want) {
			t.Errorf("html missing %q", want)
		}
	}
}

// TestMagicLoginScenarios_URLHTMLEscaped 防御 XSS：link 含 <>&" 时必须 escape，
// 防止恶意 link 注入 HTML。
func TestMagicLoginScenarios_URLHTMLEscaped(t *testing.T) {
	link := `https://x?x="><script>alert(1)</script>`
	blog := emailtemplates.MagicLoginBlogScenario(link)
	nomu := emailtemplates.MagicLoginNomuScenario(link)

	if strings.Contains(blog.Action.URL, "<script>") {
		t.Error("blog action URL should be HTML-escaped")
	}
	if strings.Contains(nomu.Action.URL, "<script>") {
		t.Error("nomu action URL should be HTML-escaped")
	}

	// 渲染出来的 HTML 不应含未 escape 的 <script>。
	for name, html := range map[string]string{
		"blog": emailtemplates.RenderScenarioHTML(blog),
		"nomu": emailtemplates.RenderScenarioHTML(nomu),
	} {
		if strings.Contains(html, "<script>alert(1)</script>") {
			t.Errorf("%s html should not embed raw <script>", name)
		}
	}
}
