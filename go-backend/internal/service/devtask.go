package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/errs"
	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
	"github.com/KanoCifer/kuroome-blog/internal/repository/mongodb"
)

// DevTaskRepository devtask 持久层接口 —— service 依赖接口，便于 mock 测试。
type DevTaskRepository interface {
	Create(ctx context.Context, task *document.DevTask) error
	GetByID(ctx context.Context, id string) (*document.DevTask, error)
	GetBySlug(ctx context.Context, slug string) (*document.DevTask, error)
	List(ctx context.Context, filter mongodb.ListFilter, page, perPage int) ([]document.DevTask, int64, error)
	Update(ctx context.Context, id string, fields bson.M) error
	SoftDelete(ctx context.Context, id string) error
	HardDelete(ctx context.Context, id string) error
	ArchiveDoneTasks(ctx context.Context) (int64, error)
	FindFrontier(ctx context.Context, limit int) ([]document.DevTask, error)
	NextSlugSeq(ctx context.Context) (int, error)
}

type DevTaskService struct {
	repo DevTaskRepository
}

func NewDevTaskService(db *mongo.Database) *DevTaskService {
	return &DevTaskService{repo: mongodb.NewDevTaskRepository(db)}
}

// blockedByOrEmpty 把 nil slice 归一化为空数组，避免 omitempty 在 Mongo 里丢字段。
// 落库的 blocked_by 始终是 [] 而不是 missing/null，这样 FindFrontier 的 $size:0
// 查询才能稳定命中。
func blockedByOrEmpty(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// serializeTask 将文档转为输出 DTO。
func serializeTask(t document.DevTask) dto.DevTaskOut {
	return dto.DevTaskOut{
		ID:          t.ID,
		UserID:      t.UserID,
		Title:       t.Title,
		Description: t.Description,
		Detail:      t.Detail,
		Type:        t.Type,
		Priority:    t.Priority,
		Scope:       t.Scope,
		Status:      t.Status,
		SortOrder:   t.SortOrder,
		DueDate:     t.DueDate,
		IsDeleted:   t.IsDeleted,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
		AcceptanceCriteria: t.AcceptanceCriteria,
		Constraints:        t.Constraints,
		ContextPointers:    t.ContextPointers,
		ForAgent:  t.ForAgent,
		BlockedBy: t.BlockedBy,
		Slug:      t.Slug,
	}
}

// serializeTasks 批量序列化，nil/空切片统一为空数组。
func serializeTasks(tasks []document.DevTask) []dto.DevTaskOut {
	if len(tasks) == 0 {
		return []dto.DevTaskOut{}
	}
	out := make([]dto.DevTaskOut, 0, len(tasks))
	for _, t := range tasks {
		out = append(out, serializeTask(t))
	}
	return out
}

// Create 创建任务。
func (s *DevTaskService) Create(ctx context.Context, userID int, req dto.DevTaskCreate) (*dto.DevTaskOut, error) {
	// 自增生成 slug —— counters 集合单文档 $inc 保证原子性，并发安全。
	seq, err := s.repo.NextSlugSeq(ctx)
	if err != nil {
		slog.Error("next slug seq", "error", err)
		return nil, err
	}
	slug := fmt.Sprintf("task-%d", seq)

	now := time.Now()
	task := &document.DevTask{
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		Detail:      req.Detail,
		Type:        req.Type,
		Priority:    req.Priority,
		Scope:       req.Scope,
		Status:      document.StatusTriage,
		DueDate:     req.DueDate,
		CreatedAt:   now,
		UpdatedAt:   now,
		AcceptanceCriteria: req.AcceptanceCriteria,
		Constraints:        req.Constraints,
		ContextPointers:    req.ContextPointers,
		ForAgent:  req.ForAgent,
		BlockedBy: blockedByOrEmpty(req.BlockedBy),
		Slug:      slug,
	}

	if err := s.repo.Create(ctx, task); err != nil {
		slog.Error("create dev task", "error", err, "user_id", userID)
		return nil, err
	}

	out := serializeTask(*task)
	return &out, nil
}

// GetByID 按 ID 获取单条任务。
func (s *DevTaskService) GetByID(ctx context.Context, id string) (*dto.DevTaskOut, error) {
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return nil, errs.ErrInvalidTaskID
	}

	task, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errs.ErrTaskNotFound
		}
		slog.Error("get dev task", "error", err, "id", id)
		return nil, err
	}

	out := serializeTask(*task)
	return &out, nil
}

// List 分页列出任务，支持过滤。
func (s *DevTaskService) List(
	ctx context.Context,
	filter mongodb.ListFilter,
	page, perPage int,
) (*dto.DevTaskListOut, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}

	tasks, total, err := s.repo.List(ctx, filter, page, perPage)
	if err != nil {
		slog.Error("list dev tasks", "error", err)
		return nil, err
	}

	return &dto.DevTaskListOut{
		Tasks:      serializeTasks(tasks),
		Pagination: pagination(page, perPage, int(total)),
	}, nil
}

// Update 部分更新任务。
func (s *DevTaskService) Update(ctx context.Context, id string, req dto.DevTaskUpdate) error {
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return errs.ErrInvalidTaskID
	}

	fields := bson.M{}
	if req.Title != nil {
		fields["title"] = *req.Title
	}
	if req.Description != nil {
		fields["description"] = *req.Description
	}
	if req.Detail != nil {
		fields["detail"] = *req.Detail
	}
	if req.Type != nil {
		fields["type"] = *req.Type
	}
	if req.Priority != nil {
		fields["priority"] = *req.Priority
	}
	if req.Scope != nil {
		fields["scope"] = *req.Scope
	}
	if req.Status != nil {
		fields["status"] = *req.Status
	}
	if req.SortOrder != nil {
		fields["sort_order"] = *req.SortOrder
	}
	if req.DueDate != nil {
		fields["due_date"] = *req.DueDate
	}
	if req.AcceptanceCriteria != nil {
		fields["acceptance_criteria"] = *req.AcceptanceCriteria
	}
	if req.Constraints != nil {
		fields["constraints"] = *req.Constraints
	}
	if req.ContextPointers != nil {
		fields["context_pointers"] = *req.ContextPointers
	}
	if req.ForAgent != nil {
		fields["for_agent"] = *req.ForAgent
	}
	if req.BlockedBy != nil {
		fields["blocked_by"] = blockedByOrEmpty(*req.BlockedBy)
	}

	if len(fields) == 0 {
		return nil
	}

	// updated_at 总由 service 层刷新（与 blog service touch() 一致），
	// 确保"仅仅调了 Update"也能推进时间戳。
	fields["updated_at"] = time.Now()

	if err := s.repo.Update(ctx, id, fields); err != nil {
		slog.Error("update dev task", "error", err, "id", id)
		return err
	}
	return nil
}

// SoftDelete 逻辑删除。
func (s *DevTaskService) SoftDelete(ctx context.Context, id string) error {
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return errs.ErrInvalidTaskID
	}
	if err := s.repo.SoftDelete(ctx, id); err != nil {
		slog.Error("soft delete dev task", "error", err, "id", id)
		return err
	}
	return nil
}

// HardDelete 物理删除。
func (s *DevTaskService) HardDelete(ctx context.Context, id string) error {
	if _, err := bson.ObjectIDFromHex(id); err != nil {
		return errs.ErrInvalidTaskID
	}
	if err := s.repo.HardDelete(ctx, id); err != nil {
		slog.Error("hard delete dev task", "error", err, "id", id)
		return err
	}
	return nil
}

// ArchiveDoneTasks 将所有"已完成"任务批量归档（逻辑删除）。
// 用于定期清理看板。
func (s *DevTaskService) ArchiveDoneTasks(ctx context.Context) (int64, error) {
	n, err := s.repo.ArchiveDoneTasks(ctx)
	if err != nil {
		slog.Error("archive done tasks", "error", err)
		return 0, err
	}
	return n, nil
}

// GetBySlug 按 slug 查单条任务（slug 用 task-N 格式）。
func (s *DevTaskService) GetBySlug(ctx context.Context, slug string) (*dto.DevTaskOut, error) {
	if slug == "" {
		return nil, errs.ErrTaskNotFound
	}
	task, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errs.ErrTaskNotFound
		}
		slog.Error("get dev task by slug", "error", err, "slug", slug)
		return nil, err
	}
	out := serializeTask(*task)
	return &out, nil
}

// FindFrontier 返回 agent 当前可认领的任务列表 —— Pocock 的 frontier 概念。
// = for_agent=true + status=待排期 + blocked_by=空 + is_deleted=false，按当前排序规则。
func (s *DevTaskService) FindFrontier(ctx context.Context, limit int) ([]dto.DevTaskOut, error) {
	if limit < 1 {
		limit = 10
	}
	tasks, err := s.repo.FindFrontier(ctx, limit)
	if err != nil {
		slog.Error("find frontier tasks", "error", err)
		return nil, err
	}
	return serializeTasks(tasks), nil
}
