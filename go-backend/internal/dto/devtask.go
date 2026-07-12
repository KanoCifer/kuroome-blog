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
