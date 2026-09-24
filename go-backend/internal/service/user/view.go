package user

import (
	"slices"

	"github.com/KanoCifer/kuroome-blog/internal/model"
)

// UserView 负责把用户模型转换为 HTTP 响应需要的字段集合。
type UserView struct {
	adminUserIDs []int
}

func NewUserView(adminUserIDs []int) UserView {
	return UserView{adminUserIDs: slices.Clone(adminUserIDs)}
}

func (v UserView) IsAdmin(u *model.User) bool {
	return slices.Contains(v.adminUserIDs, int(u.ID))
}

func (v UserView) Render(u *model.User, p *model.Profile) map[string]any {
	d := map[string]any{
		"id":           u.ID,
		"username":     u.Username,
		"name":         u.Name,
		"is_admin":     v.IsAdmin(u),
		"login_count":  u.LoginCount,
		"active":       u.Active,
		"has_passkey":  u.PasskeyCredential != nil,
		"github_bound": u.GithubID != nil,
	}
	if u.GithubID != nil {
		d["github_id"] = *u.GithubID
	}
	if p != nil && p.ID != 0 {
		if p.Email != nil {
			d["email"] = *p.Email
		}
		if p.Gender != nil {
			d["gender"] = *p.Gender
		}
		if p.Mobile != nil {
			d["mobile"] = *p.Mobile
		}
		if p.Photo != "" {
			d["photo"] = p.Photo
		}
	}
	return d
}
