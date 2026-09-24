package monitor

import (
	"context"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

type VisitorAnalytics struct {
	visitor *postgres.VisitorRepo
}

func NewVisitorAnalytics(visitor *postgres.VisitorRepo) *VisitorAnalytics {
	return &VisitorAnalytics{visitor: visitor}
}

func (s *VisitorAnalytics) GetOverview(ctx context.Context, days int) (dto.OverviewResponse, error) {
	startTime := time.Now().UTC().AddDate(0, 0, -days)
	totalVisits, err := s.visitor.CountVisitsSince(ctx, startTime)
	if err != nil {
		return dto.OverviewResponse{}, err
	}
	uniqueVisitors, err := s.visitor.CountUniqueVisitorsSince(ctx, startTime)
	if err != nil {
		return dto.OverviewResponse{}, err
	}
	uniqueVisitorIDs, err := s.visitor.CountUniqueVisitorIDsSince(ctx, startTime)
	if err != nil {
		return dto.OverviewResponse{}, err
	}
	topPages, err := s.visitor.GetTopPagesSince(ctx, startTime, 10)
	if err != nil {
		return dto.OverviewResponse{}, err
	}
	browserStats, err := s.visitor.GetBrowserStatsSince(ctx, startTime)
	if err != nil {
		return dto.OverviewResponse{}, err
	}
	osStats, err := s.visitor.GetOSSStatsSince(ctx, startTime)
	if err != nil {
		return dto.OverviewResponse{}, err
	}
	dailyTrend, err := s.visitor.GetDailyTrendSince(ctx, startTime)
	if err != nil {
		return dto.OverviewResponse{}, err
	}
	return dto.OverviewResponse{
		TotalVisits: totalVisits, UniqueVisitors: uniqueVisitors, UniqueVisitorIDs: uniqueVisitorIDs,
		TopPages: topPages, BrowserStats: browserStats, OSSStats: osStats, DailyTrend: dailyTrend, PeriodDays: days,
	}, nil
}

func (s *VisitorAnalytics) GetVisitors(ctx context.Context, days, page, pageSize int) (dto.VisitorListResponse, error) {
	startTime := time.Now().UTC().AddDate(0, 0, -days)
	total, err := s.visitor.CountVisitsSince(ctx, startTime)
	if err != nil {
		return dto.VisitorListResponse{}, err
	}
	offset := (page - 1) * pageSize
	tracks, err := s.visitor.ListVisitorsSince(ctx, startTime, offset, pageSize)
	if err != nil {
		return dto.VisitorListResponse{}, err
	}
	list := make([]dto.VisitorItem, 0, len(tracks))
	for _, v := range tracks {
		list = append(list, dto.VisitorItem{ID: v.ID, VisitorID: v.VisitorID, PageURL: v.PageURL, PagePath: v.PagePath,
			Referrer: v.Referrer, Browser: v.Browser, ScreenResolution: v.ScreenResolution, Language: v.Language,
			IPAddress: v.IPAddress, VisitTime: &v.VisitTime})
	}
	return dto.VisitorListResponse{List: list, Pagination: pagination(page, pageSize, total)}, nil
}
