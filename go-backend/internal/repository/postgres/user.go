package postgres

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

type UserRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) GetByID(ctx context.Context, id uint) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Preload("Profile").Preload("PasskeyCredential").First(&u, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	// Preload 没找到关联时 Profile 保持 nil（指针类型）
	return &u, nil
}

func (r *UserRepo) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Preload("Profile").Preload("PasskeyCredential").Where("username = ?", username).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*model.User, *model.Profile, error) {
	var p model.Profile
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	u, err := r.GetByID(ctx, p.UserID)
	if err != nil {
		return nil, nil, err
	}
	return u, &p, nil
}

func (r *UserRepo) GetByGithubID(ctx context.Context, githubID int) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Preload("Profile").Where("github_id = ?", githubID).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) SetGithubID(ctx context.Context, userID uint, githubID int) error {
	return r.db.WithContext(ctx).Model(&model.User{}).
		Where("id = ?", userID).
		Update("github_id", githubID).Error
}

func (r *UserRepo) ClearGithubID(ctx context.Context, userID uint) error {
	return r.db.WithContext(ctx).Model(&model.User{}).
		Where("id = ?", userID).
		Update("github_id", nil).Error
}

func (r *UserRepo) UsernameExists(ctx context.Context, username string) bool {
	var count int64
	r.db.WithContext(ctx).Model(&model.User{}).Where("username = ?", username).Count(&count)
	return count > 0
}

func (r *UserRepo) EmailExists(ctx context.Context, email string) bool {
	var count int64
	r.db.WithContext(ctx).Model(&model.Profile{}).Where("email = ?", email).Count(&count)
	return count > 0
}

// ListUsersWithLoginRecords 返回有登录记录的用户（login_count > 0），按 id 倒序。
//
// 时间窗过滤不在 repo 层做，与 Python monitor_repo 对齐：Python
// list_users_with_login_records 只过滤 login_count > 0，然后由
// MonitorService.GetUserLogins 在内存中按 current_login_at /
// last_login_at 时间窗二次筛选并分页。
func (r *UserRepo) ListUsersWithLoginRecords(ctx context.Context) ([]model.User, error) {
	var users []model.User
	err := r.db.WithContext(ctx).
		Where("login_count > 0").
		Order("id desc").
		Find(&users).
		Error
	return users, err
}

func (r *UserRepo) Create(ctx context.Context, user *model.User, profile *model.Profile) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}
		if profile != nil {
			profile.UserID = user.ID
			if err := tx.Create(profile).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *UserRepo) Update(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *UserRepo) UpdateProfile(ctx context.Context, profile *model.Profile) error {
	return r.db.WithContext(ctx).Save(profile).Error
}

// GetProfile 按 userID 查单个 profile，不存在返回 nil, nil。
func (r *UserRepo) GetProfile(ctx context.Context, userID uint) (*model.Profile, error) {
	var p model.Profile
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// CreateProfile 为指定 user 新建 profile 并返回。
func (r *UserRepo) CreateProfile(ctx context.Context, userID uint) (*model.Profile, error) {
	p := &model.Profile{UserID: userID}
	if err := r.db.WithContext(ctx).Create(p).Error; err != nil {
		return nil, err
	}
	return p, nil
}

func (r *UserRepo) Delete(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Delete(user).Error
}
