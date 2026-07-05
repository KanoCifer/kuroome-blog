package postgres

import (
	"errors"

	"gorm.io/gorm"

	"app/internal/model"
)

type UserRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) GetByID(id uint) (*model.User, error) {
	var u model.User
	err := r.db.Preload("Profile").First(&u, id).Error
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
	err := r.db.Preload("Profile").Where("username = ?", username).First(&u).Error
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
