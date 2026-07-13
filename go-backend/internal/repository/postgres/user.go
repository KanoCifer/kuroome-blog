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

func (r *UserRepo) GetByID(id uint) (*model.User, error) {
	var u model.User
	err := r.db.Preload("Profile").Preload("PasskeyCredential").First(&u, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	// Preload 没找到关联时 Profile 保持 nil（指针类型）
	return &u, nil
}

func (r *UserRepo) GetByUsername(username string) (*model.User, error) {
	var u model.User
	err := r.db.Preload("Profile").Preload("PasskeyCredential").Where("username = ?", username).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByEmail(email string) (*model.User, *model.Profile, error) {
	var p model.Profile
	err := r.db.Where("email = ?", email).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	u, err := r.GetByID(p.UserID)
	if err != nil {
		return nil, nil, err
	}
	return u, &p, nil
}

func (r *UserRepo) GetByGithubID(githubID int) (*model.User, error) {
	var u model.User
	err := r.db.Preload("Profile").Where("github_id = ?", githubID).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) SetGithubID(userID uint, githubID int) error {
	return r.db.Model(&model.User{}).
		Where("id = ?", userID).
		Update("github_id", githubID).Error
}

func (r *UserRepo) ClearGithubID(userID uint) error {
	return r.db.Model(&model.User{}).
		Where("id = ?", userID).
		Update("github_id", nil).Error
}

func (r *UserRepo) UsernameExists(username string) bool {
	var count int64
	r.db.Model(&model.User{}).Where("username = ?", username).Count(&count)
	return count > 0
}

func (r *UserRepo) EmailExists(email string) bool {
	var count int64
	r.db.Model(&model.Profile{}).Where("email = ?", email).Count(&count)
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

func (r *UserRepo) Create(user *model.User, profile *model.Profile) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
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

func (r *UserRepo) Update(user *model.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepo) UpdateProfile(profile *model.Profile) error {
	return r.db.Save(profile).Error
}

func (r *UserRepo) Delete(user *model.User) error {
	return r.db.Delete(user).Error
}
