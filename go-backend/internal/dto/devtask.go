package dto

import (
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/mongo/document"
)

// DevTaskCreate 创建任务请求
type DevTaskCreate struct {
	Title       string                 `json:"title" binding:"required"`
	Description *string                `json:"description"`
	Detail      *string                `json:"detail"`
	Type        document.DevTaskType   `json:"type" binding:"required"`
	Priority    document.DevTaskPriority `json:"priority" binding:"required"`
	Scope       document.DevTaskScope  `json:"scope" binding:"required"`
	DueDate     *time.Time             `json:"due_date"`
	// Slug 由后端自增生成的 task-N，客户端无需传。
	// 如需支持自定义 slug 可开放字段。
	// Spec
	AcceptanceCriteria *string `json:"acceptance_criteria"`
	Constraints        *string `json:"constraints"`
	ContextPointers    *string `json:"context_pointers"`
	// Who: true = agent 可认领；false = 人做（默认）。
	ForAgent bool `json:"for_agent"`
	// Dependencies: 必须在哪些任务完成后才能开始。
	BlockedBy []string `json:"blocked_by"`
	// Kind: spec（默认）或 subtask。零值 = spec。
	Kind document.TaskKind `json:"kind"`
	// ParentSlug: 子任务归属的 spec slug。nil = 无归属。
	ParentSlug *string `json:"parent_slug"`
}

// DevTaskUpdate 更新任务请求（全字段可选，有值才更新）
type DevTaskUpdate struct {
	Title       *string                 `json:"title"`
	Description *string                 `json:"description"`
	Detail      *string                 `json:"detail"`
	Type        *document.DevTaskType   `json:"type"`
	Priority    *document.DevTaskPriority `json:"priority"`
	Scope       *document.DevTaskScope  `json:"scope"`
	Status      *document.DevTaskStatus `json:"status"`
	SortOrder   *int                    `json:"sort_order"`
	DueDate     *time.Time              `json:"due_date"`
	// Spec
	AcceptanceCriteria *string `json:"acceptance_criteria"`
	Constraints        *string `json:"constraints"`
	ContextPointers    *string `json:"context_pointers"`
	// Who
	ForAgent *bool `json:"for_agent"`
	// Dependencies: 传了覆盖，不传不动。
	BlockedBy *[]string `json:"blocked_by"`
	// Kind: 传了覆盖，不传不动。spec / subtask。
	Kind *document.TaskKind `json:"kind"`
	// ParentSlug: 传了覆盖，不传不动。子任务归属的 spec slug。
	ParentSlug *string `json:"parent_slug"`
}

// DevTaskOut 任务输出
type DevTaskOut struct {
	ID          string                  `json:"id"`
	UserID      int                     `json:"user_id"`
	Title       string                  `json:"title"`
	Description *string                 `json:"description"`
	Detail      *string                 `json:"detail"`
	Type        document.DevTaskType    `json:"type"`
	Priority    document.DevTaskPriority `json:"priority"`
	Scope       document.DevTaskScope   `json:"scope"`
	Status      document.DevTaskStatus  `json:"status"`
	SortOrder   int                     `json:"sort_order"`
	DueDate     *time.Time              `json:"due_date"`
	IsDeleted   bool                    `json:"is_deleted"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
	Slug        string                  `json:"slug"`
	// Spec
	AcceptanceCriteria *string `json:"acceptance_criteria,omitempty"`
	Constraints        *string `json:"constraints,omitempty"`
	ContextPointers    *string `json:"context_pointers,omitempty"`
	// Who
	ForAgent bool `json:"for_agent"`
	// Dependencies
	BlockedBy []string `json:"blocked_by"`
	// Kind: spec / subtask。omitempty 让老文档（空串）不序列化。
	Kind document.TaskKind `json:"kind,omitempty"`
	// ParentSlug: 子任务归属的 spec slug。omitempty = 无归属。
	ParentSlug *string `json:"parent_slug,omitempty"`
}

// DevTaskListOut 任务列表响应
type DevTaskListOut struct {
	Tasks      []DevTaskOut   `json:"tasks"`
	Pagination PaginationOut  `json:"pagination"`
}

// ToDevTaskOut 从 document.DevTask 转换为 DTO
func ToDevTaskOut(t document.DevTask) DevTaskOut {
	return DevTaskOut{
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
		BlockedBy:   t.BlockedBy,
		Slug:        t.Slug,
		Kind:        t.Kind,
		ParentSlug:  t.ParentSlug,
	}
}

// ToDevTaskList 批量转换
func ToDevTaskList(tasks []document.DevTask) []DevTaskOut {
	out := make([]DevTaskOut, 0, len(tasks))
	for _, t := range tasks {
		out = append(out, ToDevTaskOut(t))
	}
	return out
}
