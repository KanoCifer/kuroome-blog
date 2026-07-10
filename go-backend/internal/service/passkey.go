package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

const (
	challengeTTL            = 5 * time.Minute
	registrationKeyPrefix   = "passkey:registration:challenge:"
	authenticationKeyPrefix = "passkey:authentication:challenge:"
)

// passkeyUser 实现 webauthn.User 接口。credentials 在 discoverable login 时由 handler 填充。
type passkeyUser struct {
	userID      uint
	username    string
	credentials []webauthn.Credential
}

func (u passkeyUser) WebAuthnID() []byte {
	return []byte(fmt.Sprintf("%d", u.userID))
}

func (u passkeyUser) WebAuthnName() string {
	return u.username
}

func (u passkeyUser) WebAuthnDisplayName() string {
	return u.username
}

func (u passkeyUser) WebAuthnCredentials() []webauthn.Credential {
	return u.credentials
}

// PasskeyService 编排 WebAuthn 注册 / 认证流程，challenge 存 Redis。
type PasskeyService struct {
	webauthn    *webauthn.WebAuthn
	redis       *redis.Client
	passkeyRepo *postgres.PasskeyRepo
	userRepo    *postgres.UserRepo
}

func NewPasskeyService(
	wa *webauthn.WebAuthn,
	redis *redis.Client,
	passkeyRepo *postgres.PasskeyRepo,
	userRepo *postgres.UserRepo,
) *PasskeyService {
	return &PasskeyService{
		webauthn:    wa,
		redis:       redis,
		passkeyRepo: passkeyRepo,
		userRepo:    userRepo,
	}
}

// NewWebAuthn 构造 WebAuthn 实例。rpID / rpOrigin 由调用方从 config 注入，
// 避免本包直接读取全局 config.Cfg。
func NewWebAuthn(rpID, rpOrigin string) (*webauthn.WebAuthn, error) {
	return webauthn.New(&webauthn.Config{
		RPID:                  rpID,
		RPDisplayName:         "Kuroome's Blog",
		RPOrigins:             []string{rpOrigin},
		AttestationPreference: protocol.PreferNoAttestation,
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			UserVerification: protocol.VerificationPreferred,
		},
	})
}

// ---------- 注册 ----------

// HasPasskey 检查用户是否已注册 Passkey。
func (s *PasskeyService) HasPasskey(userID uint) bool {
	cred, err := s.passkeyRepo.GetByUserID(userID)
	return err == nil && cred != nil
}

// BeginRegistration 生成注册选项，challenge 存 Redis（以 userID 为 key）。
func (s *PasskeyService) BeginRegistration(userID uint) (map[string]any, error) {
	if s.HasPasskey(userID) {
		return nil, errs.ErrPasskeyExists
	}

	dbUser, err := s.userRepo.GetByID(userID)
	if err != nil || dbUser == nil {
		return nil, errs.ErrUserNotFound
	}

	user := passkeyUser{userID: userID, username: dbUser.Username}
	creation, session, err := s.webauthn.BeginRegistration(user)
	if err != nil {
		return nil, fmt.Errorf("begin registration: %w", err)
	}

	s.storeRegistrationSession(userID, session)

	// 序列化 creation.Response 而非 creation：go-webauthn 的 CredentialCreation 会
	// 多包一层 {"publicKey": {...}}，而前端 @simplewebauthn/browser 的
	// startRegistration 需要的是内层未拆封的 PublicKeyCredentialCreationOptionsJSON。
	raw, _ := json.Marshal(creation.Response)
	var m map[string]any
	_ = json.Unmarshal(raw, &m)
	return m, nil
}

// FinishRegistration 验证注册响应并存储凭证。
func (s *PasskeyService) FinishRegistration(userID uint, response map[string]any) error {
	session, err := s.getRegistrationSession(userID)
	if err != nil {
		return err
	}
	s.deleteRegistrationSession(userID)

	body, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("marshal response: %w", err)
	}

	parsed, err := protocol.ParseCredentialCreationResponseBody(strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("%w: %v", errs.ErrInvalidPasskey, err)
	}

	credential, err := s.webauthn.CreateCredential(passkeyUser{userID: userID}, *session, parsed)
	if err != nil {
		return fmt.Errorf("%w: %v", errs.ErrInvalidPasskey, err)
	}

	cred := &model.PasskeyCredential{
		UserID:            userID,
		CredentialID:      protocol.URLEncodedBase64(credential.ID).String(),
		PublicKey:         protocol.URLEncodedBase64(credential.PublicKey).String(),
		SignCount:         int(credential.Authenticator.SignCount),
		AttestationFormat: credential.AttestationFormat,
		BackupEligible:    credential.Flags.BackupEligible,
		BackupState:       credential.Flags.BackupState,
	}
	if err := s.passkeyRepo.Create(cred); err != nil {
		return fmt.Errorf("create credential: %w", err)
	}
	return nil
}

// ---------- 认证 ----------

// BeginLogin 生成 discoverable 认证选项，challenge 存 Redis（以 challenge 为 key）。
func (s *PasskeyService) BeginLogin() (map[string]any, error) {
	assertion, session, err := s.webauthn.BeginDiscoverableLogin()
	if err != nil {
		return nil, fmt.Errorf("begin login: %w", err)
	}

	s.storeAuthenticationSession(session.Challenge, session)

	// 同 BeginRegistration：CredentialAssertion 会多包一层 {"publicKey": {...}}，
	// 前端 startAuthentication 需要的是内层未拆封的 PublicKeyCredentialRequestOptionsJSON。
	raw, _ := json.Marshal(assertion.Response)
	var m map[string]any
	_ = json.Unmarshal(raw, &m)
	return m, nil
}

// FinishLogin 验证认证响应，返回登录用户。
func (s *PasskeyService) FinishLogin(response map[string]any) (*model.User, error) {
	credentialID, err := extractCredentialID(response)
	if err != nil {
		return nil, err
	}

	cred, err := s.passkeyRepo.GetByCredentialID(credentialID)
	if err != nil || cred == nil {
		return nil, errs.ErrPasskeyNotFound
	}

	// 解析响应以获取 challenge（与 Python 从 clientDataJSON 解析 challenge 对齐）。
	body, err := json.Marshal(response)
	if err != nil {
		return nil, fmt.Errorf("marshal response: %w", err)
	}
	parsed, err := protocol.ParseCredentialRequestResponseBody(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", errs.ErrInvalidPasskey, err)
	}
	challenge := parsed.Response.CollectedClientData.Challenge

	// 取 Redis 中的 session（以 challenge 为 key），校验后消费。
	session, err := s.getAuthenticationSession(challenge)
	if err != nil {
		return nil, err
	}
	s.deleteAuthenticationSession(challenge)

	// 将已查出的凭证传入 handler,避免 ValidatePasskeyLogin 回调内重复查询。
	_, _, err = s.webauthn.ValidatePasskeyLogin(s.discoverableHandler(cred), *session, parsed)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", errs.ErrInvalidPasskey, err)
	}

	// 更新 sign count
	if err := s.passkeyRepo.UpdateSignCount(cred, int(parsed.Response.AuthenticatorData.Counter)); err != nil {
		return nil, fmt.Errorf("update sign count: %w", err)
	}

	if cred.User == nil {
		return nil, errs.ErrUserNotFound
	}
	return cred.User, nil
}

// DeletePasskey 删除用户 Passkey 凭证。
func (s *PasskeyService) DeletePasskey(userID uint) error {
	cred, err := s.passkeyRepo.GetByUserID(userID)
	if err != nil || cred == nil {
		return errs.ErrPasskeyNotFound
	}
	return s.passkeyRepo.Delete(cred)
}

// discoverableHandler 提供 discoverable login 的用户查找回调。
// 注意：ValidatePasskeyLogin 要求返回的 user.WebAuthnCredentials() 包含匹配的凭证。
// cred 为 FinishLogin 已预加载的凭证,避免回调内重复查询 DB。
func (s *PasskeyService) discoverableHandler(cred *model.PasskeyCredential) webauthn.DiscoverableUserHandler {
	return func(rawID, userHandle []byte) (webauthn.User, error) {
		username := ""
		if cred.User != nil {
			username = cred.User.Username
		}
		return passkeyUser{
			userID:      cred.UserID,
			username:    username,
			credentials: []webauthn.Credential{ToWebAuthnCredential(cred)},
		}, nil
	}
}

// ---------- Redis 操作 ----------

func (s *PasskeyService) storeRegistrationSession(userID uint, session *webauthn.SessionData) {
	if s.redis == nil {
		return
	}
	data, _ := json.Marshal(session)
	s.redis.Set(context.Background(), registrationKeyPrefix+fmt.Sprintf("%d", userID), data, challengeTTL)
}

func (s *PasskeyService) getRegistrationSession(userID uint) (*webauthn.SessionData, error) {
	if s.redis == nil {
		return nil, errs.ErrInvalidPasskey
	}
	data, err := s.redis.Get(context.Background(), registrationKeyPrefix+fmt.Sprintf("%d", userID)).Bytes()
	if err != nil {
		return nil, errs.ErrInvalidPasskey
	}
	var session webauthn.SessionData
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("unmarshal session: %w", err)
	}
	return &session, nil
}

func (s *PasskeyService) deleteRegistrationSession(userID uint) {
	if s.redis == nil {
		return
	}
	s.redis.Del(context.Background(), registrationKeyPrefix+fmt.Sprintf("%d", userID))
}

func (s *PasskeyService) storeAuthenticationSession(challenge string, session *webauthn.SessionData) {
	if s.redis == nil {
		return
	}
	data, _ := json.Marshal(session)
	s.redis.Set(context.Background(), authenticationKeyPrefix+challenge, data, challengeTTL)
}

func (s *PasskeyService) getAuthenticationSession(challenge string) (*webauthn.SessionData, error) {
	if s.redis == nil {
		return nil, errs.ErrInvalidPasskey
	}
	data, err := s.redis.Get(context.Background(), authenticationKeyPrefix+challenge).Bytes()
	if err != nil {
		return nil, errs.ErrInvalidPasskey
	}
	var session webauthn.SessionData
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("unmarshal session: %w", err)
	}
	return &session, nil
}

func (s *PasskeyService) deleteAuthenticationSession(challenge string) {
	if s.redis == nil {
		return
	}
	s.redis.Del(context.Background(), authenticationKeyPrefix+challenge)
}

// ---------- 辅助 ----------

func extractCredentialID(response map[string]any) (string, error) {
	id, ok := response["id"].(string)
	if !ok || id == "" {
		return "", errs.ErrInvalidPasskey
	}
	return id, nil
}

// ToWebAuthnCredential 将存储的 model.PasskeyCredential 还原为 webauthn.Credential。
func ToWebAuthnCredential(c *model.PasskeyCredential) webauthn.Credential {
	rawID, _ := base64.RawURLEncoding.DecodeString(c.CredentialID)
	rawKey, _ := base64.RawURLEncoding.DecodeString(c.PublicKey)

	return webauthn.Credential{
		ID:                rawID,
		PublicKey:         rawKey,
		AttestationFormat: c.AttestationFormat,
		Flags: webauthn.CredentialFlags{
			BackupEligible: c.BackupEligible,
			BackupState:    c.BackupState,
		},
		Authenticator: webauthn.Authenticator{
			SignCount: uint32(c.SignCount),
		},
	}
}
