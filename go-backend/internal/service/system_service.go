package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/repository/postgres"
)

//EventRepository 定义 SystemService 依赖的持久层能力集合。
// 由 postgres.EventRepo 实现；service 仅依赖此接口，便于测试替换。
type EventRepository interface {
	Count(ctx context.Context, f postgres.EventFilter) (int, error)
	List(ctx context.Context, f postgres.EventFilter, offset, limit int) ([]model.Event, error)
}

// SystemService 承载 system 端点的业务逻辑（事件分页查询）。
// 对齐 Python backend/app/services/system 的 SystemService.list_events。
type SystemService struct {
	repo EventRepository
}

func NewSystemService(repo EventRepository) *SystemService {
	return &SystemService{repo: repo}
}

// ListEvents 分页查询事件（按时间倒序），组装 DTO 与分页元数据。
//
// per_page  clamped to [1, 200]、page clamped to >= 1，对齐 Python 端的入参校验。
func (s *SystemService) ListEvents(
	ctx context.Context,
	page, perPage int,
	eventType *string,
	start, end *time.Time,
) (dto.Events, error) {
	perPage = clamp(perPage, 1, 200)
	if perPage == 0 {
		perPage = 10 // 默认 10 条，对齐 Python
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * perPage

	filter := postgres.EventFilter{Type: eventType, Start: start, End: end}

	total, err := s.repo.Count(ctx, filter)
	if err != nil {
		return dto.Events{}, err
	}
	events, err := s.repo.List(ctx, filter, offset, perPage)
	if err != nil {
		return dto.Events{}, err
	}

	items := make([]dto.Event, 0, len(events))
	for _, e := range events {
		items = append(items, toEventDTO(e))
	}

	pages := 0
	if total > 0 {
		pages = (total + perPage - 1) / perPage
	}
	pagination := dto.Pagination{
		Page:    page,
		PerPage: perPage,
		Total:   total,
		Pages:   pages,
		HasPrev: page > 1,
		HasNext: page < pages,
	}
	if page > 1 {
		v := page - 1
		pagination.PrevNum = &v
	}
	if page < pages {
		v := page + 1
		pagination.NextNum = &v
	}

	return dto.Events{Items: items, Pagination: pagination}, nil
}

// toEventDTO 把持久层 model.Event 转为对外 dto.Event。
// extra 列是 jsonb，datatypes.JSON 需反序列化为 map 以匹配 Python EventResponse.extra: dict。
func toEventDTO(e model.Event) dto.Event {
	var extra map[string]any
	if len(e.Extra) > 0 {
		_ = json.Unmarshal([]byte(e.Extra), &extra)
	}
	return dto.Event{
		ID:        e.ID,
		Timestamp: e.Timestamp,
		Type:      e.Type,
		Source:    e.Source,
		Title:     e.Title,
		Message:   e.Message,
		Extra:     extra,
	}
}

// clamp 把 x 限制在 [lo, hi] 内；x == 0 时原样返回，由调用方解释为"未传"。
func clamp(x, lo, hi int) int {
	if x == 0 {
		return x
	}
	if x < lo {
		return lo
	}
	if x > hi {
		return hi
	}
	return x
}
