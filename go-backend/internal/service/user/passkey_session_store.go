package user

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/redis/go-redis/v9"

	passkeyerrs "github.com/KanoCifer/kuroome-blog/internal/domain/passkey/errs"
)

const (
	challengeTTL            = 5 * time.Minute
	registrationKeyPrefix   = "passkey:registration:challenge:"
	authenticationKeyPrefix = "passkey:authentication:challenge:"
)

// SessionStore 定义 Passkey ceremony session 的持久化能力。
type SessionStore interface {
	SaveRegistration(ctx context.Context, userID uint, session *webauthn.SessionData) error
	LoadRegistration(ctx context.Context, userID uint) (*webauthn.SessionData, error)
	DeleteRegistration(ctx context.Context, userID uint) error
	SaveAuthentication(ctx context.Context, challenge string, session *webauthn.SessionData) error
	LoadAuthentication(ctx context.Context, challenge string) (*webauthn.SessionData, error)
	DeleteAuthentication(ctx context.Context, challenge string) error
}

// RedisSessionStore 使用 Redis 保存 Passkey ceremony session。
type RedisSessionStore struct {
	redis *redis.Client
}

func NewRedisSessionStore(rdb *redis.Client) *RedisSessionStore {
	return &RedisSessionStore{redis: rdb}
}

func (s *RedisSessionStore) SaveRegistration(ctx context.Context, userID uint, session *webauthn.SessionData) error {
	if s.redis == nil {
		return nil
	}
	data, err := json.Marshal(session)
	if err != nil {
		return err
	}
	return s.redis.Set(ctx, registrationKeyPrefix+fmt.Sprintf("%d", userID), data, challengeTTL).Err()
}

func (s *RedisSessionStore) LoadRegistration(ctx context.Context, userID uint) (*webauthn.SessionData, error) {
	if s.redis == nil {
		return nil, passkeyerrs.ErrInvalidPasskey
	}
	data, err := s.redis.Get(ctx, registrationKeyPrefix+fmt.Sprintf("%d", userID)).Bytes()
	if err != nil {
		return nil, passkeyerrs.ErrInvalidPasskey
	}
	return unmarshalSession(data)
}

func (s *RedisSessionStore) DeleteRegistration(ctx context.Context, userID uint) error {
	if s.redis == nil {
		return nil
	}
	return s.redis.Del(ctx, registrationKeyPrefix+fmt.Sprintf("%d", userID)).Err()
}

func (s *RedisSessionStore) SaveAuthentication(ctx context.Context, challenge string, session *webauthn.SessionData) error {
	if s.redis == nil {
		return nil
	}
	data, err := json.Marshal(session)
	if err != nil {
		return err
	}
	return s.redis.Set(ctx, authenticationKeyPrefix+challenge, data, challengeTTL).Err()
}

func (s *RedisSessionStore) LoadAuthentication(ctx context.Context, challenge string) (*webauthn.SessionData, error) {
	if s.redis == nil {
		return nil, passkeyerrs.ErrInvalidPasskey
	}
	data, err := s.redis.Get(ctx, authenticationKeyPrefix+challenge).Bytes()
	if err != nil {
		return nil, passkeyerrs.ErrInvalidPasskey
	}
	return unmarshalSession(data)
}

func (s *RedisSessionStore) DeleteAuthentication(ctx context.Context, challenge string) error {
	if s.redis == nil {
		return nil
	}
	return s.redis.Del(ctx, authenticationKeyPrefix+challenge).Err()
}

func unmarshalSession(data []byte) (*webauthn.SessionData, error) {
	var session webauthn.SessionData
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("unmarshal session: %w", err)
	}
	return &session, nil
}
