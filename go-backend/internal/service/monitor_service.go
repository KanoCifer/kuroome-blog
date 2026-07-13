package service

import (
	"context"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

// MonitorService 实现 monitor 端点的业务逻辑（overview / visitors / user-logins）。
//
// server/status + stream 在 task-7 中追加，复用同一个 service 实例。
type MonitorService struct {
	visitor *postgres.VisitorRepo
	user    *postgres.UserRepo
}

func NewMonitorService(visitor *postgres.VisitorRepo, user *postgres.UserRepo) *MonitorService {
	return &MonitorService{visitor: visitor, user: user}
}

// GetOverview 返回 days 天内的访客总览统计，对齐 Python MonitorService.get_overview。
func (s *MonitorService) GetOverview(ctx context.Context, days int) (dto.Overview, error) {
	endTime := time.Now().UTC()
	startTime := endTime.AddDate(0, 0, -days)

	totalVisits, err := s.visitor.CountVisitsSince(ctx, startTime)
	if err != nil {
		return dto.Overview{}, err
	}
	uniqueVisitors, err := s.visitor.CountUniqueVisitorsSince(ctx, startTime)
	if err != nil {
		return dto.Overview{}, err
	}
	uniqueVisitorIDs, err := s.visitor.CountUniqueVisitorIDsSince(ctx, startTime)
	if err != nil {
		return dto.Overview{}, err
	}
	topPages, err := s.visitor.GetTopPagesSince(ctx, startTime, 10)
	if err != nil {
		return dto.Overview{}, err
	}
	browserStats, err := s.visitor.GetBrowserStatsSince(ctx, startTime)
	if err != nil {
		return dto.Overview{}, err
	}
	osStats, err := s.visitor.GetOSSStatsSince(ctx, startTime)
	if err != nil {
		return dto.Overview{}, err
	}
	dailyTrend, err := s.visitor.GetDailyTrendSince(ctx, startTime)
	if err != nil {
		return dto.Overview{}, err
	}

	return dto.Overview{
		TotalVisits:      totalVisits,
		UniqueVisitors:   uniqueVisitors,
		UniqueVisitorIDs: uniqueVisitorIDs,
		TopPages:         topPages,
		BrowserStats:     browserStats,
		OSSStats:         osStats,
		DailyTrend:       dailyTrend,
		PeriodDays:       days,
	}, nil
}

// GetVisitors 返回 days 天内的访客分页列表，对齐 Python MonitorService.get_visitors。
func (s *MonitorService) GetVisitors(ctx context.Context, days, page, pageSize int) (dto.Visitors, error) {
	endTime := time.Now().UTC()
	startTime := endTime.AddDate(0, 0, -days)

	total, err := s.visitor.CountVisitsSince(ctx, startTime)
	if err != nil {
		return dto.Visitors{}, err
	}

	offset := (page - 1) * pageSize
	tracks, err := s.visitor.ListVisitorsSince(ctx, startTime, offset, pageSize)
	if err != nil {
		return dto.Visitors{}, err
	}

	list := make([]dto.VisitorItem, 0, len(tracks))
	for _, v := range tracks {
		list = append(list, dto.VisitorItem{
			ID:               v.ID,
			VisitorID:        v.VisitorID,
			PageURL:          v.PageURL,
			PagePath:         v.PagePath,
			Referrer:         v.Referrer,
			Browser:          v.Browser,
			ScreenResolution: v.ScreenResolution,
			Language:         v.Language,
			IPAddress:        v.IPAddress,
			VisitTime:        &v.VisitTime,
		})
	}

	return dto.Visitors{
		List:       list,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: (total + pageSize - 1) / pageSize,
	}, nil
}

// GetUserLogins 返回 days 天内有登录记录的用户分页列表，对齐 Python MonitorService.get_user_logins。
func (s *MonitorService) GetUserLogins(ctx context.Context, days, page, pageSize int) (dto.UserLogins, error) {
	endTime := time.Now().UTC()
	startTime := endTime.AddDate(0, 0, -days)

	users, err := s.user.ListUsersWithLoginRecords(ctx)
	if err != nil {
		return dto.UserLogins{}, err
	}

	logins := make([]dto.UserLoginItem, 0, len(users))
	for _, u := range users {
		if !hasRecentLogin(u, startTime) {
			continue
		}
		logins = append(logins, dto.UserLoginItem{
			UserID:         int(u.ID),
			Username:       u.Username,
			Name:           u.Name,
			LoginCount:     u.LoginCount,
			LastLoginAt:    isoPtr(u.LastLoginAt),
			CurrentLoginAt: isoPtr(u.CurrentLoginAt),
			LastLoginIP:    u.LastLoginIP,
			CurrentLoginIP: u.CurrentLoginIP,
			Active:         u.Active,
		})
	}

	total := len(logins)
	offset := (page - 1) * pageSize
	end := offset + pageSize
	if end > total {
		end = total
	}
	if offset > total {
		offset = total
	}
	paginated := logins[offset:end]

	return dto.UserLogins{
		List:       paginated,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: (total + pageSize - 1) / pageSize,
	}, nil
}

// hasRecentLogin 判断用户是否在时间窗内有登录记录（对齐 Python 同级逻辑）。
func hasRecentLogin(u model.User, start time.Time) bool {
	if u.CurrentLoginAt != nil && !u.CurrentLoginAt.Before(start) {
		return true
	}
	if u.LastLoginAt != nil && !u.LastLoginAt.Before(start) {
		return true
	}
	return false
}

// isoPtr 将 time.Time 转为 ISO 字符串指针，nil 则返回 nil（对齐 Python .isoformat() 语义）。
func isoPtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.UTC().Format(time.RFC3339)
	return &s
}
