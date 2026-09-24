package upload

import (
	"bytes"
	"context"
	"errors"
	"image"
	_ "image/jpeg"
	"os"
	"path/filepath"
	"strings"
	"testing"

	uploaderrs "github.com/KanoCifer/kuroome-blog/internal/domain/upload/errs"
	usererrs "github.com/KanoCifer/kuroome-blog/internal/domain/user/errs"
	"github.com/KanoCifer/kuroome-blog/internal/model"
)

type mockProfileStore struct {
	user          *model.User
	profile       *model.Profile
	getByIDErr    error
	getProfileErr error
	createErr     error
	updateErr     error
	created       bool
	updated       bool
}

func (m *mockProfileStore) GetByID(context.Context, uint) (*model.User, error) {
	return m.user, m.getByIDErr
}
func (m *mockProfileStore) GetProfile(context.Context, uint) (*model.Profile, error) {
	return m.profile, m.getProfileErr
}
func (m *mockProfileStore) CreateProfile(_ context.Context, userID uint) (*model.Profile, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	m.created = true
	m.profile = &model.Profile{UserID: userID}
	return m.profile, nil
}
func (m *mockProfileStore) UpdateProfile(_ context.Context, profile *model.Profile) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	m.updated = true
	m.profile = profile
	return nil
}

func newAvatarService(t *testing.T, store ProfileStore) (*AvatarService, string) {
	t.Helper()
	cfg := testUploadConfig(t, 10)
	return NewAvatarService(store, cfg), cfg.UploadDir
}

func TestAvatarServiceSuccessExistingProfile(t *testing.T) {
	profile := &model.Profile{UserID: 3, Photo: "old.jpg"}
	store := &mockProfileStore{user: &model.User{Profile: profile}}
	svc, uploadDir := newAvatarService(t, store)

	rel, err := svc.UploadAvatar(context.Background(), 3, "ignored.png", "image/png", bytes.NewReader(testPNG(t)))
	if err != nil {
		t.Fatalf("UploadAvatar: %v", err)
	}
	if !strings.HasPrefix(rel, "pics/3/") || !strings.HasSuffix(rel, "-256.jpg") {
		t.Fatalf("unexpected avatar path %q", rel)
	}
	if profile.Photo != rel || !store.updated {
		t.Fatalf("profile photo = %q, updated = %v", profile.Photo, store.updated)
	}

	data, err := os.ReadFile(filepath.Join(uploadDir, rel))
	if err != nil {
		t.Fatalf("read thumbnail: %v", err)
	}
	img, format, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("decode thumbnail: %v", err)
	}
	if format != "jpeg" {
		t.Fatalf("thumbnail format = %q, want jpeg", format)
	}
	if got := img.Bounds().Size(); got.X != 256 || got.Y != 170 {
		t.Fatalf("thumbnail size = %v, want 256x256", got)
	}
}

func TestAvatarServiceSuccessCreatesProfile(t *testing.T) {
	store := &mockProfileStore{user: &model.User{}}
	svc, _ := newAvatarService(t, store)

	rel, err := svc.UploadAvatar(context.Background(), 5, "a.png", "image/png", bytes.NewReader(testPNG(t)))
	if err != nil {
		t.Fatalf("UploadAvatar: %v", err)
	}
	if !store.created || !store.updated || store.profile == nil || store.profile.Photo != rel {
		t.Fatalf("profile was not created and updated: %+v", store)
	}
}

func TestAvatarServiceRejectsInvalidUploads(t *testing.T) {
	store := &mockProfileStore{user: &model.User{}}
	svc, _ := newAvatarService(t, store)
	ctx := context.Background()

	tests := []struct {
		name        string
		contentType string
		data        []byte
		want        error
	}{
		{name: "unsupported MIME", contentType: "text/plain", data: []byte("x"), want: uploaderrs.ErrUnsupportedImageType},
		{name: "invalid image", contentType: "image/png", data: []byte("not an image"), want: uploaderrs.ErrInvalidImageData},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.UploadAvatar(ctx, 1, "a", tt.contentType, bytes.NewReader(tt.data))
			if !errors.Is(err, tt.want) {
				t.Fatalf("error = %v, want %v", err, tt.want)
			}
		})
	}

	_, err := svc.UploadAvatar(ctx, 1, "a.png", "image/png", &sizedZeroReader{remaining: 10<<20 + 1})
	if !errors.Is(err, uploaderrs.ErrImageTooLarge) {
		t.Fatalf("oversize error = %v, want ErrImageTooLarge", err)
	}
}

func TestAvatarServiceUserNotFound(t *testing.T) {
	svc, _ := newAvatarService(t, &mockProfileStore{})
	_, err := svc.UploadAvatar(context.Background(), 99, "a.png", "image/png", bytes.NewReader(testPNG(t)))
	if !errors.Is(err, usererrs.ErrUserNotFound) {
		t.Fatalf("error = %v, want ErrUserNotFound", err)
	}
}

func TestAvatarServiceProfileStoreErrors(t *testing.T) {
	storeErr := errors.New("store failed")
	tests := []struct {
		name  string
		store *mockProfileStore
	}{
		{name: "GetByID", store: &mockProfileStore{getByIDErr: storeErr}},
		{name: "GetProfile", store: &mockProfileStore{user: &model.User{}, getProfileErr: storeErr}},
		{name: "CreateProfile", store: &mockProfileStore{user: &model.User{}, createErr: storeErr}},
		{name: "UpdateProfile", store: &mockProfileStore{user: &model.User{}, updateErr: storeErr}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, _ := newAvatarService(t, tt.store)
			_, err := svc.UploadAvatar(context.Background(), 1, "a.png", "image/png", bytes.NewReader(testPNG(t)))
			if !errors.Is(err, storeErr) {
				t.Fatalf("error = %v, want %v", err, storeErr)
			}
		})
	}
}
