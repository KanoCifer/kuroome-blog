package postgres

import (
	"gorm.io/gorm"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// PasskeyRepo 持有 PasskeyCredential 表的 GORM 查询。
type PasskeyRepo struct {
	db *gorm.DB
}

func NewPasskeyRepo(db *gorm.DB) *PasskeyRepo {
	return &PasskeyRepo{db: db}
}

// GetByUserID 根据用户 ID 查询 Passkey 凭证。
func (r *PasskeyRepo) GetByUserID(userID uint) (*model.PasskeyCredential, error) {
	var cred model.PasskeyCredential
	err := r.db.Where("user_id = ?", userID).First(&cred).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &cred, err
}

// GetByCredentialID 根据凭证 ID 查询 Passkey，预加载 User 和 Profile。
func (r *PasskeyRepo) GetByCredentialID(credentialID string) (*model.PasskeyCredential, error) {
	var cred model.PasskeyCredential
	err := r.db.
		Preload("User.Profile").
		Where("credential_id = ?", credentialID).
		First(&cred).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &cred, err
}

// Create 创建 Passkey 凭证。
func (r *PasskeyRepo) Create(cred *model.PasskeyCredential) error {
	return r.db.Create(cred).Error
}

// UpdateSignCount 更新签名计数器。
func (r *PasskeyRepo) UpdateSignCount(cred *model.PasskeyCredential, signCount int) error {
	cred.SignCount = signCount
	return r.db.Save(cred).Error
}

// Delete 删除 Passkey 凭证。
func (r *PasskeyRepo) Delete(cred *model.PasskeyCredential) error {
	return r.db.Delete(cred).Error
}
