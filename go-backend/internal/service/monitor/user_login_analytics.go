package monitor

import (
	"context"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

type UserLoginAnalytics struct{ user *postgres.UserRepo }

func NewUserLoginAnalytics(user *postgres.UserRepo) *UserLoginAnalytics {
	return &UserLoginAnalytics{user: user}
}

func (s *UserLoginAnalytics) GetUserLogins(ctx context.Context, days, page, pageSize int) (dto.UserLoginsResponse, error) {
	startTime := time.Now().UTC().AddDate(0, 0, -days)
	users, err := s.user.ListUsersWithLoginRecords(ctx)
	if err != nil {
		return dto.UserLoginsResponse{}, err
	}
	logins := make([]dto.UserLoginItem, 0, len(users))
	for _, u := range users {
		if !hasRecentLogin(u, startTime) {
			continue
		}
		logins = append(logins, dto.UserLoginItem{UserID: int(u.ID), Username: u.Username, Name: u.Name,
			LoginCount: u.LoginCount, LastLoginAt: isoPtr(u.LastLoginAt), CurrentLoginAt: isoPtr(u.CurrentLoginAt),
			LastLoginIP: u.LastLoginIP, CurrentLoginIP: u.CurrentLoginIP, Active: u.Active})
	}
	total := len(logins)
	offset := (page - 1) * pageSize
	end := min(offset+pageSize, total)
	if offset > total {
		offset = total
	}
	return dto.UserLoginsResponse{List: logins[offset:end], Pagination: pagination(page, pageSize, total)}, nil
}

func hasRecentLogin(u model.User, start time.Time) bool {
	return (u.CurrentLoginAt != nil && !u.CurrentLoginAt.Before(start)) || (u.LastLoginAt != nil && !u.LastLoginAt.Before(start))
}

func isoPtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.UTC().Format(time.RFC3339)
	return &s
}
