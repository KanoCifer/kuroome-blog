package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/KanoCifer/kuroome-blog/internal/apierr"
	"github.com/KanoCifer/kuroome-blog/internal/config"
	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/logger"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/pkg/emailtemplates"
	jwtpkg "github.com/KanoCifer/kuroome-blog/pkg/jwt"
	"github.com/KanoCifer/kuroome-blog/pkg/notification"
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
	updateFn        func(ctx context.Context, user *model.User) error
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
	if m.updateFn != nil {
		return m.updateFn(ctx, user)
	}
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
	if svc.verifyEmailCode(context.Background(), "a@b.com", "123456", modeBlog, false) {
		t.Error("verifyEmailCode should return false when redis is nil")
	}
}

func TestVerifyEmailCode_EmptyEmail(t *testing.T) {
	svc := &UserService{redis: nil}
	if svc.verifyEmailCode(context.Background(), "", "123456", modeBlog, false) {
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
	key := emailCodeKey(email, modeBlog, false)
	if err := rdb.Set(context.Background(), key, code, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed: %v", err)
	}

	if !svc.verifyEmailCode(context.Background(), email, code, modeBlog, false) {
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

	blogKey := emailCodeKey(email, modeBlog, false)
	nomuKey := emailCodeKey(email, modeNomu, false)

	// 只写 blog 模式
	if err := rdb.Set(context.Background(), blogKey, code, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed blog: %v", err)
	}

	// 拿 nomu 模式来消费 blog 验证码 → 应当被拒
	if svc.verifyEmailCode(context.Background(), email, code, modeNomu, false) {
		t.Error("nomu mode consumed blog key — cross-mode isolation broken")
	}
	// blog 那份还在（没被 nomu 误删）
	if !mr.Exists(blogKey) {
		t.Error("blog key was wrongly consumed by nomu verify")
	}

	// blog 模式消费自己的 key → 应当成功
	if !svc.verifyEmailCode(context.Background(), email, code, modeBlog, false) {
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

// ---------- ConfirmPasswordReset（核心流程接线）----------

// TestConfirmPasswordReset_Success 端到端：写 reset 验证码到 redis，
// 用合法 code + 新密码调 ConfirmPasswordReset，应当：
//  1. 校验通过、不返回 error
//  2. Update 被调用一次
//  3. 写入 user.PasswordHash 是新密码的合法 bcrypt 哈希（cost=12 写在 hash 头）
//  4. reset key 被一次性消费（删除）
func TestConfirmPasswordReset_Success(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	const (
		email       = "alice@example.com"
		oldPassword = "oldPass1"
		newPassword = "newPass2"
		code        = "888111"
	)
	oldHash, err := bcrypt.GenerateFromPassword([]byte(oldPassword), bcryptCost)
	if err != nil {
		t.Fatalf("seed old hash: %v", err)
	}
	u := &model.User{Model: gormModel(42), PasswordHash: string(oldHash)}

	var updated *model.User
	updateCalls := 0
	repo := &mockUserRepo{
		getByEmailFn: func(ctx context.Context, e string) (*model.User, *model.Profile, error) {
			if e != email {
				return nil, nil, nil
			}
			return u, &model.Profile{UserID: u.ID, Email: ptr(email)}, nil
		},
		updateFn: func(ctx context.Context, target *model.User) error {
			updateCalls++
			updated = target
			return nil
		},
	}
	svc := &UserService{repo: repo, redis: rdb}

	// 模拟 sendPasswordReset 写 reset 验证码 + challenge（两个独立 key）
	key := emailCodeKey(email, modeBlog, true)
	if err := rdb.Set(context.Background(), key, code, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed reset key: %v", err)
	}
	const challenge = "f00dbabe00000000f00dbabe00000000f00dbabe00000000f00dbabe00000000"
	chKey := fmt.Sprintf(emailResetChallengeCacheKeyFmt, email, modeBlog)
	if err := rdb.Set(context.Background(), chKey, challenge, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed challenge key: %v", err)
	}

	if err := svc.ConfirmPasswordReset(context.Background(), email, code, newPassword, modeBlog, challenge); err != nil {
		t.Fatalf("ConfirmPasswordReset: %v", err)
	}
	if updateCalls != 1 {
		t.Errorf("Update calls = %d, want 1", updateCalls)
	}
	if updated == nil || updated.PasswordHash == string(oldHash) {
		t.Errorf("PasswordHash should be rewritten, got %q", updated.PasswordHash)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(updated.PasswordHash), []byte(newPassword)); err != nil {
		t.Errorf("new hash should verify against new password: %v", err)
	}
	// hash 字符串以 $2a$12$ 开头表示 cost=12 实际生效（避免回归到 DefaultCost=10）
	if len(updated.PasswordHash) < 7 || updated.PasswordHash[:7] != "$2a$12$" {
		t.Errorf("password hash should use bcryptCost=12, got prefix %q", updated.PasswordHash[:min(7, len(updated.PasswordHash))])
	}
	if mr.Exists(key) {
		t.Error("reset key should be deleted after successful consume")
	}
	if mr.Exists(chKey) {
		t.Error("challenge key should be deleted after successful consume")
	}
}

// TestConfirmPasswordReset_RejectsSamePassword 锁死"新密码 = 旧密码"的拒绝路径。
// 锁的是接口契约 ResetPasswordConfirmRequest 不会自动检查，必须靠 service 拦。
func TestConfirmPasswordReset_RejectsSamePassword(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	const (
		email = "bob@example.com"
		pwd   = "samePass1"
		code  = "555000"
	)
	hash, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcryptCost)
	u := &model.User{Model: gormModel(7), PasswordHash: string(hash)}

	updateCalls := 0
	repo := &mockUserRepo{
		getByEmailFn: func(ctx context.Context, e string) (*model.User, *model.Profile, error) {
			return u, &model.Profile{UserID: u.ID, Email: ptr(email)}, nil
		},
		updateFn: func(ctx context.Context, _ *model.User) error {
			updateCalls++
			return nil
		},
	}
	svc := &UserService{repo: repo, redis: rdb}
	key := emailCodeKey(email, modeBlog, true)
	if err := rdb.Set(context.Background(), key, code, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed reset key: %v", err)
	}
	if !mr.Exists(key) {
		t.Fatalf("seed: key not present right after Set — miniredis bug?")
	}
	// 同密码路径在 challenge 校验之后才走，所以这里也要 seed 一个合法 challenge
	const challenge = "deadbeefcafebabe000000000000000000000000000000000000000000000000"
	chKey := fmt.Sprintf(emailResetChallengeCacheKeyFmt, email, modeBlog)
	if err := rdb.Set(context.Background(), chKey, challenge, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed challenge key: %v", err)
	}

	err = svc.ConfirmPasswordReset(context.Background(), email, code, pwd, modeBlog, challenge)
	if err != usererrs.ErrPasswordHashExists {
		t.Errorf("err = %v, want ErrPasswordHashExists", err)
	}
	if updateCalls != 0 {
		t.Errorf("Update should NOT be called when rejected (got %d)", updateCalls)
	}
	if !mr.Exists(key) {
		t.Error("email code key should NOT be consumed on validation failure")
	}
	// 关键点：密码重复被拒时 challenge 必须仍在！用户改正密码再提交还能复用，
	// 否则会撞 ErrInvalidToken、得重新申请重置邮件。
	if !mr.Exists(chKey) {
		t.Error("challenge key MUST still exist after password rejection — user can retry with a different new password")
	}
}

// TestConfirmPasswordReset_WrongCodeDoesNotBurnChallenge 锁死对称的契约：
// email code 错误被拒时，challenge 必须仍在。前端展示"验证码错误，请重新输入"
// 后用户改正 code 再提交，仍可复用 challenge 直到 5min TTL 或写库成功。
func TestConfirmPasswordReset_WrongCodeDoesNotBurnChallenge(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	const (
		email     = "carol@example.com"
		rightCode = "111111"
		wrongCode = "222222"
		newPwd    = "freshPass9"
		challenge = "f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1"
	)
	oldHash, _ := bcrypt.GenerateFromPassword([]byte("old"), bcryptCost)
	u := &model.User{Model: gormModel(9), PasswordHash: string(oldHash)}

	repo := &mockUserRepo{
		getByEmailFn: func(ctx context.Context, e string) (*model.User, *model.Profile, error) {
			return u, &model.Profile{UserID: u.ID, Email: ptr(email)}, nil
		},
	}
	svc := &UserService{repo: repo, redis: rdb}

	// 写 rightCode 入 redis（不是 wrongCode）
	key := emailCodeKey(email, modeBlog, true)
	if err := rdb.Set(context.Background(), key, rightCode, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed code key: %v", err)
	}
	chKey := fmt.Sprintf(emailResetChallengeCacheKeyFmt, email, modeBlog)
	if err := rdb.Set(context.Background(), chKey, challenge, emailCodeExpire).Err(); err != nil {
		t.Fatalf("seed challenge key: %v", err)
	}

	got := svc.ConfirmPasswordReset(context.Background(), email, wrongCode, newPwd, modeBlog, challenge)
	if got != usererrs.ErrInvalidEmailCode {
		t.Fatalf("err = %v, want ErrInvalidEmailCode", got)
	}
	if !mr.Exists(key) {
		t.Error("email code key should still exist (code consume is success-only) — wrong code shouldn't burn it")
	}
	if !mr.Exists(chKey) {
		t.Error("challenge key MUST still exist after wrong-code rejection — symmetric to same-password case")
	}

	// 用对的 code 改一下 newPwd 重新提交（业务逻辑视角：用户改了"验证码"输入），应当通过
	if err := svc.ConfirmPasswordReset(context.Background(), email, rightCode, newPwd, modeBlog, challenge); err != nil {
		t.Errorf("retry with corrected code should succeed, got %v", err)
	}
}

// TestConfirmPasswordReset_EmailNotRegisteredNoEnumeration 锁死"邮箱是否注册"
// 不暴露给攻击者。challenge + code 都正确但邮箱未注册时，响应必须与
// "验证码无效"完全一致（同 message + 同 HTTP code = 400），让攻击者无法用
// HTTP code 把"邮箱未注册"和"验证码错"区分开。
func TestConfirmPasswordReset_EmailNotRegisteredNoEnumeration(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	const (
		email  = "ghost@example.com"
		code   = "111000"
		chal   = "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd"
		newPwd = "anyNew123"
	)
	repo := &mockUserRepo{
		getByEmailFn: func(ctx context.Context, e string) (*model.User, *model.Profile, error) {
			return nil, nil, nil // 邮箱未注册
		},
	}
	svc := &UserService{repo: repo, redis: rdb}
	key := emailCodeKey(email, modeBlog, true)
	_ = rdb.Set(context.Background(), key, code, emailCodeExpire).Err()
	chKey := fmt.Sprintf(emailResetChallengeCacheKeyFmt, email, modeBlog)
	_ = rdb.Set(context.Background(), chKey, chal, emailCodeExpire).Err()

	got := svc.ConfirmPasswordReset(context.Background(), email, code, newPwd, modeBlog, chal)
	if got != usererrs.ErrInvalidEmailCode {
		t.Errorf("err = %v, want ErrInvalidEmailCode (must NOT be ErrUserNotFound)", got)
	}
	// status code 必须一致：ErrInvalidEmailCode 和 ErrUserNotFound 的 HTTP code 必须相同，
	// 即都是 400 —— 否则前端/攻击者一眼看穿。这里通过 apierr.Error.Status() 显式断言。
	if codeA := got.(*apierr.Error).Status(); codeA != 400 {
		t.Errorf("http status = %d, want 400 (same as ErrInvalidEmailCode)", codeA)
	}
}

// ---------- Nomu 邮箱验证码登录 ----------

// fakeChannel 测试替身：可注入 SendEmailCodeLogin 的"成功 / 失败"语义，
// 并通过 sendCount 统计调用次数。
type fakeChannel struct {
	ok        bool32 // atomic access via ok.Load()/Store()
	sendCount atomic.Int32
	lastEmail atomic.Value // string
}

func (f *fakeChannel) Name() string { return "fake" }
func (f *fakeChannel) Send(_ context.Context, _ notification.Message, nc notification.NotificationContext) bool {
	f.sendCount.Add(1)
	if nc.Email != "" {
		f.lastEmail.Store(nc.Email)
	}
	return f.ok.Load()
}

// okLoad / okStore 对 atomic.Bool 的小封装，避免在测试中反复写.Load/.Store。
type bool32 struct{ v atomic.Bool }

func (b *bool32) Load() bool   { return b.v.Load() }
func (b *bool32) Store(v bool) { b.v.Store(v) }

// newLoginCodeSvc 构造一个跑得起来的 UserService：miniredis + 一个 fake 邮件 channel + 注入 mockUserRepo。
//
// 返回 (svc, miniredis, redis.Client, fakeChannel) —— redis 客户端和 fakeChannel 都
// 暴露给测试，便于直接断言 key 状态 / 计数。
func newLoginCodeSvc(t *testing.T, repo *mockUserRepo, mailOK bool) (*UserService, *miniredis.Miniredis, *redis.Client, *fakeChannel) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	ch := &fakeChannel{}
	ch.ok.Store(mailOK)
	mailer := emailtemplates.NewMailerWithChannel(ch)

	svc := &UserService{
		repo:       repo,
		redis:      rdb,
		mailer:     mailer,
		maxDevices: 5,
	}
	return svc, mr, rdb, ch
}

// registeredRepo 构造一个"邮箱已注册"的 repo，未注册的邮箱由 mockUserRepo 默认 nil。
func registeredRepo(email string, userID uint) *mockUserRepo {
	return &mockUserRepo{
		getByEmailFn: func(_ context.Context, e string) (*model.User, *model.Profile, error) {
			if e == email {
				return &model.User{Model: gormModel(userID), Username: "alice"}, &model.Profile{}, nil
			}
			return nil, nil, nil
		},
	}
}

// seedLoginCode 直接在 redis 写 code + 清空 attempts，方便在测试里跳过发送环节
// 直接测验证逻辑。
func seedLoginCode(t *testing.T, mr *miniredis.Miniredis, rdb *redis.Client, email, code string) {
	t.Helper()
	if err := mr.Set(emailLoginKey(email), code); err != nil {
		t.Fatalf("seed code: %v", err)
	}
	// 同步 attempts TTL 到 code（用相同 TTL 5min）
	mr.SetTTL(emailLoginKey(email), emailCodeExpire)
	mr.SetTTL(emailLoginAttemptsKey(email), emailCodeExpire)
}

// ---------- SendLoginEmailCode ----------

// TestSendLoginEmailCode_NilRedisFailClosed 无 redis → 拒绝（fail closed）。
func TestSendLoginEmailCode_NilRedisFailClosed(t *testing.T) {
	svc := &UserService{redis: nil, mailer: &emailtemplates.Mailer{}}
	if svc.SendLoginEmailCode(context.Background(), "x@y.com") {
		t.Error("SendLoginEmailCode should return false when redis is nil")
	}
}

// TestSendLoginEmailCode_EmailNotRegisteredSilent 未知邮箱静默成功 + 不写 redis。
func TestSendLoginEmailCode_EmailNotRegisteredSilent(t *testing.T) {
	svc, mr, _, ch := newLoginCodeSvc(t, &mockUserRepo{
		getByEmailFn: func(_ context.Context, _ string) (*model.User, *model.Profile, error) { return nil, nil, nil },
	}, true)

	if !svc.SendLoginEmailCode(context.Background(), "ghost@example.com") {
		t.Error("should return true (silent success) for unregistered email")
	}
	if got := ch.sendCount.Load(); got != 0 {
		t.Errorf("mailer.sendCount = %d, want 0 (no mail for unknown email)", got)
	}
	if mr.Exists(emailLoginKey("ghost@example.com")) {
		t.Error("redis code key should NOT be written for unknown email")
	}
	if mr.Exists(emailLoginCooldownKey("ghost@example.com")) {
		t.Error("redis cooldown key should NOT be written for unknown email")
	}
}

// TestSendLoginEmailCode_WritesCodeAndSendsMail 已注册账户：写 redis + 发邮件。
func TestSendLoginEmailCode_WritesCodeAndSendsMail(t *testing.T) {
	svc, mr, _, ch := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), true)

	if !svc.SendLoginEmailCode(context.Background(), "alice@example.com") {
		t.Fatal("SendLoginEmailCode should return true for registered email + mailer ok")
	}
	if !mr.Exists(emailLoginKey("alice@example.com")) {
		t.Error("code key should be set")
	}
	if !mr.Exists(emailLoginCooldownKey("alice@example.com")) {
		t.Error("cooldown key should be set")
	}
	if got := ch.sendCount.Load(); got != 1 {
		t.Errorf("mailer.sendCount = %d, want 1", got)
	}
	if mr.TTL(emailLoginKey("alice@example.com")) <= 0 {
		t.Error("code key should have a positive TTL")
	}
}

// TestSendLoginEmailCode_MailFailCleansRedis 邮件发送失败 → 清掉 redis key。
// 守护契约：发码失败不留可登录凭证。
func TestSendLoginEmailCode_MailFailCleansRedis(t *testing.T) {
	svc, mr, _, _ := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), false)

	if svc.SendLoginEmailCode(context.Background(), "alice@example.com") {
		t.Error("SendLoginEmailCode should return false when mailer fails")
	}
	if mr.Exists(emailLoginKey("alice@example.com")) {
		t.Error("code key should be cleaned on mail failure")
	}
	if mr.Exists(emailLoginCooldownKey("alice@example.com")) {
		t.Error("cooldown key should be cleaned on mail failure")
	}
}

// TestSendLoginEmailCode_CooldownSkipsResend 冷却中同邮箱二次申请不发新码。
func TestSendLoginEmailCode_CooldownSkipsResend(t *testing.T) {
	svc, mr, _, ch := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), true)
	ctx := context.Background()

	if !svc.SendLoginEmailCode(ctx, "alice@example.com") {
		t.Fatal("first send should succeed")
	}
	first, err := mr.Get(emailLoginKey("alice@example.com"))
	if err != nil {
		t.Fatalf("first code missing: %v", err)
	}

	if !svc.SendLoginEmailCode(ctx, "alice@example.com") {
		t.Error("second send during cooldown should still return true (silent)")
	}
	second, _ := mr.Get(emailLoginKey("alice@example.com"))
	if first != second {
		t.Errorf("cooldown should NOT overwrite code: first=%q second=%q", first, second)
	}
	if got := ch.sendCount.Load(); got != 1 {
		t.Errorf("mailer.sendCount = %d, want 1 (cooldown skipped)", got)
	}
}

// ---------- AuthenticateEmailCode ----------

// TestAuthenticateEmailCode_NilRedisFailClosed 无 redis → 一律拒绝，不签发登录态。
func TestAuthenticateEmailCode_NilRedisFailClosed(t *testing.T) {
	svc := &UserService{redis: nil, repo: registeredRepo("alice@example.com", 1)}
	_, _, err := svc.AuthenticateEmailCode(context.Background(), "alice@example.com", "123456")
	if !errors.Is(err, usererrs.ErrInvalidEmailCode) {
		t.Errorf("err = %v, want ErrInvalidEmailCode (fail closed when redis nil)", err)
	}
}

// TestAuthenticateEmailCode_EmptyParamsFail 直接校验空入参。
func TestAuthenticateEmailCode_EmptyParamsFail(t *testing.T) {
	mr, _ := miniredis.Run()
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	svc := &UserService{redis: rdb, repo: registeredRepo("alice@example.com", 1)}

	cases := []struct{ email, code string }{
		{"", "123456"},
		{"alice@example.com", ""},
	}
	for _, c := range cases {
		if _, _, err := svc.AuthenticateEmailCode(context.Background(), c.email, c.code); !errors.Is(err, usererrs.ErrInvalidEmailCode) {
			t.Errorf("(%q,%q) err = %v, want ErrInvalidEmailCode", c.email, c.code, err)
		}
	}
}

// TestAuthenticateEmailCode_BadCodeLengthBadLength 不是 6 位直接拒绝，不走 lua。
func TestAuthenticateEmailCode_BadCodeLength(t *testing.T) {
	mr, _ := miniredis.Run()
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	svc := &UserService{redis: rdb, repo: registeredRepo("alice@example.com", 1)}

	badCodes := []string{"12345", "1234567", "abcdef", "  123456  "}
	for _, c := range badCodes {
		_, _, err := svc.AuthenticateEmailCode(context.Background(), "alice@example.com", c)
		if !errors.Is(err, usererrs.ErrInvalidEmailCode) {
			t.Errorf("code=%q err = %v, want ErrInvalidEmailCode", c, err)
		}
	}
}

// TestAuthenticateEmailCode_UnknownEmailHideExistence 未注册邮箱 → ErrInvalidEmailCode，
// 与错码同响应，隐藏账户存在性。
func TestAuthenticateEmailCode_UnknownEmailHideExistence(t *testing.T) {
	mr, _ := miniredis.Run()
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	repo := &mockUserRepo{
		getByEmailFn: func(_ context.Context, _ string) (*model.User, *model.Profile, error) { return nil, nil, nil },
	}
	svc := &UserService{redis: rdb, repo: repo}

	_, _, err := svc.AuthenticateEmailCode(context.Background(), "ghost@example.com", "123456")
	if !errors.Is(err, usererrs.ErrInvalidEmailCode) {
		t.Errorf("err = %v, want ErrInvalidEmailCode", err)
	}
	if status := err.(*apierr.Error).Status(); status != 400 {
		t.Errorf("status = %d, want 400 (same as wrong code)", status)
	}
}

// TestAuthenticateEmailCode_RepoErrorSurfaceInternalErr 仓库故障保留内部错误语义，
// 不能因为"防枚举"把所有错误都映射到 ErrInvalidEmailCode —— 否则 DB 挂时排查困难。
func TestAuthenticateEmailCode_RepoErrorSurfaceInternalErr(t *testing.T) {
	mr, _ := miniredis.Run()
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	dbErr := errors.New("db conn lost")
	repo := &mockUserRepo{
		getByEmailFn: func(_ context.Context, _ string) (*model.User, *model.Profile, error) { return nil, nil, dbErr },
	}
	svc := &UserService{redis: rdb, repo: repo}

	_, _, err := svc.AuthenticateEmailCode(context.Background(), "alice@example.com", "123456")
	if !errors.Is(err, dbErr) {
		t.Errorf("err = %v, want original dbErr (preserve internal error)", err)
	}
}

// TestAuthenticateEmailCode_SuccessConsumesCode 正确码命中 → 一次性消费 → 返回 user/profile。
func TestAuthenticateEmailCode_SuccessConsumesCode(t *testing.T) {
	svc, mr, _, _ := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), true)
	const code = "654321"
	seedLoginCode(t, mr, nil, "alice@example.com", code)

	u, p, err := svc.AuthenticateEmailCode(context.Background(), "alice@example.com", code)
	if err != nil {
		t.Fatalf("AuthenticateEmailCode: %v", err)
	}
	if u == nil || u.ID != 42 {
		t.Errorf("user = %v, want id=42", u)
	}
	if p == nil {
		t.Error("profile should be returned on success")
	}
	// 一次性消费：code + attempts 必须被清。
	if mr.Exists(emailLoginKey("alice@example.com")) {
		t.Error("code key should be deleted after successful consume")
	}
	if mr.Exists(emailLoginAttemptsKey("alice@example.com")) {
		t.Error("attempts key should be deleted after successful consume")
	}
}

// TestAuthenticateEmailCode_WrongCodeIncrementsAttempts 错码 → INCR attempts，不动 code。
func TestAuthenticateEmailCode_WrongCodeIncrementsAttempts(t *testing.T) {
	svc, mr, rdb, _ := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), true)
	const good = "654321"
	seedLoginCode(t, mr, nil, "alice@example.com", good)
	ctx := context.Background()

	for i := 1; i <= 3; i++ {
		_, _, err := svc.AuthenticateEmailCode(ctx, "alice@example.com", "000000")
		if !errors.Is(err, usererrs.ErrInvalidEmailCode) {
			t.Errorf("attempt %d: err = %v, want ErrInvalidEmailCode", i, err)
		}
	}
	// attempts 累到 3
	got, _ := rdb.Get(ctx, emailLoginAttemptsKey("alice@example.com")).Int()
	if got != 3 {
		t.Errorf("attempts = %d, want 3", got)
	}
	// code 还在（未达上限）
	if !mr.Exists(emailLoginKey("alice@example.com")) {
		t.Error("code key should still exist when attempts below cap")
	}
	// 紧接着用正确码仍能登录（前面错误没把 code 误删）
	if _, _, err := svc.AuthenticateEmailCode(ctx, "alice@example.com", good); err != nil {
		t.Errorf("correct code after wrong attempts should succeed: %v", err)
	}
}

// TestAuthenticateEmailCode_AttemptsCapEvictsCode 5 次错码 → code 被清。
func TestAuthenticateEmailCode_AttemptsCapEvictsCode(t *testing.T) {
	svc, mr, _, _ := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), true)
	seedLoginCode(t, mr, nil, "alice@example.com", "654321")
	ctx := context.Background()

	for i := 1; i <= 5; i++ {
		_, _, err := svc.AuthenticateEmailCode(ctx, "alice@example.com", "000000")
		if !errors.Is(err, usererrs.ErrInvalidEmailCode) {
			t.Errorf("attempt %d: err = %v, want ErrInvalidEmailCode", i, err)
		}
	}
	// 达到上限 → code 与 attempts 都应被清
	if mr.Exists(emailLoginKey("alice@example.com")) {
		t.Error("code key should be deleted after attempts cap")
	}
	if mr.Exists(emailLoginAttemptsKey("alice@example.com")) {
		t.Error("attempts key should be deleted after cap")
	}
	// 即使给回正确码也不能登录（code 已蒸发）
	if _, _, err := svc.AuthenticateEmailCode(ctx, "alice@example.com", "654321"); !errors.Is(err, usererrs.ErrInvalidEmailCode) {
		t.Errorf("after cap, correct code should still be rejected (code evicted): err = %v", err)
	}
}

// TestAuthenticateEmailCode_RejectsDifferentModeCode 同邮箱下 blog 注册码 / 重置码不能
// 拿来登录。即使攻击者撞对 6 位数也过不了。
func TestAuthenticateEmailCode_RejectsCrossPurposeCodes(t *testing.T) {
	mr, _ := miniredis.Run()
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	svc := &UserService{
		redis: rdb,
		repo:  registeredRepo("alice@example.com", 42),
	}
	const code = "654321"
	ctx := context.Background()

	// 写一个 blog 注册码（命名空间 email_code:<email>:blog）
	blogKey := emailCodeKey("alice@example.com", modeBlog, false)
	if err := mr.Set(blogKey, code); err != nil {
		t.Fatalf("seed blog code: %v", err)
	}
	// 写一个重置码（命名空间 email_reset:<email>:blog）
	resetKey := emailCodeKey("alice@example.com", modeBlog, true)
	if err := mr.Set(resetKey, code); err != nil {
		t.Fatalf("seed reset code: %v", err)
	}

	_, _, err := svc.AuthenticateEmailCode(ctx, "alice@example.com", code)
	if !errors.Is(err, usererrs.ErrInvalidEmailCode) {
		t.Errorf("err = %v, want ErrInvalidEmailCode (cross-purpose code must not login)", err)
	}
	// blog / reset 的 key 必须未被脚本误删（隔离守护）
	if !mr.Exists(blogKey) {
		t.Error("blog code key was wrongly consumed by login script")
	}
	if !mr.Exists(resetKey) {
		t.Error("reset code key was wrongly consumed by login script")
	}
}

// TestAuthenticateEmailCode_ConcurrentSameCorrectCodeOnlyOnce 并发提交同一正确码：
// 至多一个成功，其它都收 ErrInvalidEmailCode（不变量）。
func TestAuthenticateEmailCode_ConcurrentSameCorrectCodeOnlyOnce(t *testing.T) {
	svc, mr, _, _ := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), true)
	const code = "654321"
	seedLoginCode(t, mr, nil, "alice@example.com", code)

	const N = 16
	var success atomic.Int32
	var invalid atomic.Int32
	var other atomic.Int32
	var wg sync.WaitGroup
	wg.Add(N)
	for i := 0; i < N; i++ {
		go func() {
			defer wg.Done()
			_, _, err := svc.AuthenticateEmailCode(context.Background(), "alice@example.com", code)
			switch {
			case err == nil:
				success.Add(1)
			case errors.Is(err, usererrs.ErrInvalidEmailCode):
				invalid.Add(1)
			default:
				other.Add(1)
			}
		}()
	}
	wg.Wait()
	if success.Load() != 1 {
		t.Errorf("successes = %d, want exactly 1", success.Load())
	}
	if other.Load() != 0 {
		t.Errorf("other errors = %d, want 0", other.Load())
	}
	if invalid.Load() != int32(N-1) {
		t.Errorf("invalid count = %d, want %d", invalid.Load(), N-1)
	}
}

// TestAuthenticateEmailCode_RejectsExpiredCode 5 分钟 TTL 到期 → 视为无效码。
func TestAuthenticateEmailCode_RejectsExpiredCode(t *testing.T) {
	svc, mr, _, _ := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), true)
	seedLoginCode(t, mr, nil, "alice@example.com", "654321")
	// miniredis 快进时间到 TTL 之后
	mr.FastForward(emailCodeExpire + time.Second)

	_, _, err := svc.AuthenticateEmailCode(context.Background(), "alice@example.com", "654321")
	if !errors.Is(err, usererrs.ErrInvalidEmailCode) {
		t.Errorf("err = %v, want ErrInvalidEmailCode (expired)", err)
	}
}

// TestAuthenticateEmailCode_CleansCooldownOnSuccess 登录成功后清掉 cooldown，
// 防止"刚登录又被限频发码"误伤正常用户。
func TestAuthenticateEmailCode_CleansCooldownOnSuccess(t *testing.T) {
	svc, mr, _, _ := newLoginCodeSvc(t, registeredRepo("alice@example.com", 42), true)
	if err := mr.Set(emailLoginCooldownKey("alice@example.com"), "1"); err != nil {
		t.Fatalf("seed cooldown: %v", err)
	}
	seedLoginCode(t, mr, nil, "alice@example.com", "654321")

	if _, _, err := svc.AuthenticateEmailCode(context.Background(), "alice@example.com", "654321"); err != nil {
		t.Fatalf("login should succeed: %v", err)
	}
	if mr.Exists(emailLoginCooldownKey("alice@example.com")) {
		t.Error("cooldown key should be deleted after successful login")
	}
}

// TestSendLoginEmailCode_KeyIsolation 登录码 key 与注册 / 重置 / magic login key 完全独立。
func TestSendLoginEmailCode_KeyIsolation(t *testing.T) {
	mr, _ := miniredis.Run()
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	const email = "alice@example.com"

	// 写其他用途的码
	for _, k := range []string{
		emailCodeKey(email, modeBlog, false),                       // 注册
		emailCodeKey(email, modeNomu, false),                       // 注册 nomu
		emailCodeKey(email, modeBlog, true),                        // 重置 blog
		fmt.Sprintf("magiclogintoken:%s:%s", "deadbeef", modeNomu), // 魔法登录
	} {
		if err := mr.Set(k, "111111"); err != nil {
			t.Fatalf("seed %s: %v", k, err)
		}
	}

	ch := &fakeChannel{}
	ch.ok.Store(true)
	svc := &UserService{
		redis:  rdb,
		repo:   registeredRepo(email, 42),
		mailer: emailtemplates.NewMailerWithChannel(ch),
	}
	if !svc.SendLoginEmailCode(context.Background(), email) {
		t.Fatal("SendLoginEmailCode should succeed")
	}

	// 登录码已写
	if !mr.Exists(emailLoginKey(email)) {
		t.Error("login code key should be written")
	}
	// 其他用途的码必须原样保留
	if got, _ := mr.Get(emailCodeKey(email, modeBlog, false)); got != "111111" {
		t.Errorf("blog register code was disturbed: got %q", got)
	}
	if got, _ := mr.Get(emailCodeKey(email, modeNomu, false)); got != "111111" {
		t.Errorf("nomu register code was disturbed: got %q", got)
	}
	if got, _ := mr.Get(emailCodeKey(email, modeBlog, true)); got != "111111" {
		t.Errorf("reset code was disturbed: got %q", got)
	}
}

// TestSendLoginEmailCode_NoMailer 当 mailer 未装配时静默返回 false，
// handler 不区分原因（对外统一成功响应防枚举）。
func TestSendLoginEmailCode_NoMailer(t *testing.T) {
	mr, _ := miniredis.Run()
	t.Cleanup(mr.Close)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	svc := &UserService{
		redis:  rdb,
		repo:   registeredRepo("alice@example.com", 42),
		mailer: nil,
	}
	if svc.SendLoginEmailCode(context.Background(), "alice@example.com") {
		t.Error("should return false when mailer is nil")
	}
}
