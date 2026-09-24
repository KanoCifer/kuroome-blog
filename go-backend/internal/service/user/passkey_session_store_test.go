package user

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/redis/go-redis/v9"

	passkeyerrs "github.com/KanoCifer/kuroome-blog/internal/domain/passkey/errs"
)

func newPasskeySessionStoreTest(t *testing.T) (*RedisSessionStore, *miniredis.Miniredis, *redis.Client) {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() {
		_ = rdb.Close()
		mr.Close()
	})
	return NewRedisSessionStore(rdb), mr, rdb
}

func testSessionData() *webauthn.SessionData {
	return &webauthn.SessionData{
		Challenge:            "challenge",
		RelyingPartyID:       "example.com",
		Origin:               "https://example.com",
		UserID:               []byte("user-1"),
		AllowedCredentialIDs: [][]byte{[]byte("credential-1")},
		Expires:              time.Now().UTC().Truncate(time.Second),
	}
}

func TestRedisSessionStoreRoundTrip(t *testing.T) {
	store, _, _ := newPasskeySessionStoreTest(t)
	want := testSessionData()

	if err := store.SaveRegistration(context.Background(), 42, want); err != nil {
		t.Fatalf("SaveRegistration: %v", err)
	}
	got, err := store.LoadRegistration(context.Background(), 42)
	if err != nil {
		t.Fatalf("LoadRegistration: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("round trip = %#v, want %#v", got, want)
	}

	if err := store.DeleteRegistration(context.Background(), 42); err != nil {
		t.Fatalf("DeleteRegistration: %v", err)
	}
	if _, err := store.LoadRegistration(context.Background(), 42); !errors.Is(err, passkeyerrs.ErrInvalidPasskey) {
		t.Fatalf("LoadRegistration after delete error = %v, want ErrInvalidPasskey", err)
	}

	wantAuth := testSessionData()
	wantAuth.Challenge = "authentication-round-trip"
	if err := store.SaveAuthentication(context.Background(), wantAuth.Challenge, wantAuth); err != nil {
		t.Fatalf("SaveAuthentication: %v", err)
	}
	gotAuth, err := store.LoadAuthentication(context.Background(), wantAuth.Challenge)
	if err != nil {
		t.Fatalf("LoadAuthentication: %v", err)
	}
	if !reflect.DeepEqual(gotAuth, wantAuth) {
		t.Fatalf("authentication round trip = %#v, want %#v", gotAuth, wantAuth)
	}
	if err := store.DeleteAuthentication(context.Background(), wantAuth.Challenge); err != nil {
		t.Fatalf("DeleteAuthentication: %v", err)
	}
	if _, err := store.LoadAuthentication(context.Background(), wantAuth.Challenge); !errors.Is(err, passkeyerrs.ErrInvalidPasskey) {
		t.Fatalf("LoadAuthentication after delete error = %v, want ErrInvalidPasskey", err)
	}
}

func TestRedisSessionStoreNamespaces(t *testing.T) {
	store, mr, _ := newPasskeySessionStoreTest(t)
	ctx := context.Background()
	registrationChallenge := "challenge"
	authenticationChallenge := "authentication-challenge"
	registration := testSessionData()
	authentication := testSessionData()
	authentication.Challenge = authenticationChallenge

	if err := store.SaveRegistration(ctx, 7, registration); err != nil {
		t.Fatalf("SaveRegistration: %v", err)
	}
	if err := store.SaveAuthentication(ctx, "7", authentication); err != nil {
		t.Fatalf("SaveAuthentication: %v", err)
	}
	if !mr.Exists(registrationKeyPrefix + "7") {
		t.Fatal("registration key was not stored")
	}
	if !mr.Exists(authenticationKeyPrefix + "7") {
		t.Fatal("authentication key was not stored")
	}
	gotRegistration, err := store.LoadRegistration(ctx, 7)
	if err != nil {
		t.Fatalf("LoadRegistration: %v", err)
	}
	if gotRegistration.Challenge != registrationChallenge {
		t.Fatalf("registration challenge = %q, want %q", gotRegistration.Challenge, registrationChallenge)
	}
	gotAuthentication, err := store.LoadAuthentication(ctx, "7")
	if err != nil {
		t.Fatalf("LoadAuthentication: %v", err)
	}
	if gotAuthentication.Challenge != authenticationChallenge {
		t.Fatalf("authentication challenge = %q, want %q", gotAuthentication.Challenge, authenticationChallenge)
	}
}

func TestRedisSessionStoreTTL(t *testing.T) {
	store, mr, _ := newPasskeySessionStoreTest(t)
	if err := store.SaveAuthentication(context.Background(), "ttl", testSessionData()); err != nil {
		t.Fatalf("SaveAuthentication: %v", err)
	}
	if got := mr.TTL(authenticationKeyPrefix + "ttl"); got != challengeTTL {
		t.Fatalf("TTL = %s, want %s", got, challengeTTL)
	}
}

func TestRedisSessionStoreMissingAndInvalidJSON(t *testing.T) {
	store, mr, _ := newPasskeySessionStoreTest(t)
	ctx := context.Background()

	if _, err := store.LoadRegistration(ctx, 99); !errors.Is(err, passkeyerrs.ErrInvalidPasskey) {
		t.Fatalf("missing key error = %v, want ErrInvalidPasskey", err)
	}
	if err := mr.Set(registrationKeyPrefix+"99", "{"); err != nil {
		t.Fatalf("seed invalid JSON: %v", err)
	}
	if _, err := store.LoadRegistration(ctx, 99); err == nil || !strings.HasPrefix(err.Error(), "unmarshal session:") {
		t.Fatalf("invalid JSON error = %v, want unmarshal session prefix", err)
	}
}

func TestRedisSessionStoreNilRedis(t *testing.T) {
	store := NewRedisSessionStore(nil)
	ctx := context.Background()
	if err := store.SaveRegistration(ctx, 1, testSessionData()); err != nil {
		t.Fatalf("SaveRegistration: %v", err)
	}
	if err := store.SaveAuthentication(ctx, "challenge", testSessionData()); err != nil {
		t.Fatalf("SaveAuthentication: %v", err)
	}
	if err := store.DeleteRegistration(ctx, 1); err != nil {
		t.Fatalf("DeleteRegistration: %v", err)
	}
	if err := store.DeleteAuthentication(ctx, "challenge"); err != nil {
		t.Fatalf("DeleteAuthentication: %v", err)
	}
	if _, err := store.LoadRegistration(ctx, 1); !errors.Is(err, passkeyerrs.ErrInvalidPasskey) {
		t.Fatalf("LoadRegistration error = %v, want ErrInvalidPasskey", err)
	}
	if _, err := store.LoadAuthentication(ctx, "challenge"); !errors.Is(err, passkeyerrs.ErrInvalidPasskey) {
		t.Fatalf("LoadAuthentication error = %v, want ErrInvalidPasskey", err)
	}
}

func TestRedisSessionStoreClosedRedis(t *testing.T) {
	store, _, rdb := newPasskeySessionStoreTest(t)
	if err := rdb.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	ctx := context.Background()
	if err := store.SaveRegistration(ctx, 1, testSessionData()); err == nil {
		t.Fatal("SaveRegistration error = nil, want Redis error")
	}
	if err := store.SaveAuthentication(ctx, "challenge", testSessionData()); err == nil {
		t.Fatal("SaveAuthentication error = nil, want Redis error")
	}
	if err := store.DeleteRegistration(ctx, 1); err == nil {
		t.Fatal("DeleteRegistration error = nil, want Redis error")
	}
	if err := store.DeleteAuthentication(ctx, "challenge"); err == nil {
		t.Fatal("DeleteAuthentication error = nil, want Redis error")
	}
	if _, err := store.LoadRegistration(ctx, 1); !errors.Is(err, passkeyerrs.ErrInvalidPasskey) {
		t.Fatalf("LoadRegistration error = %v, want ErrInvalidPasskey", err)
	}
	if _, err := store.LoadAuthentication(ctx, "challenge"); !errors.Is(err, passkeyerrs.ErrInvalidPasskey) {
		t.Fatalf("LoadAuthentication error = %v, want ErrInvalidPasskey", err)
	}
}
