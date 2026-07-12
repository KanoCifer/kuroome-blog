package document

import "time"

// 任务类型
type DevTaskType string

const (
	TaskTypeBug       DevTaskType = "问题"
	TaskTypeFeature   DevTaskType = "功能需求"
	TaskTypeImprove   DevTaskType = "优化"
	TaskTypeTechDebt  DevTaskType = "技术债"
)

// 优先级
type DevTaskPriority string

const (
	PriorityP0 DevTaskPriority = "P0 紧急"
	PriorityP1 DevTaskPriority = "P1 高"
	PriorityP2 DevTaskPriority = "P2 中"
	PriorityP3 DevTaskPriority = "P3 低"
)

// 影响范围
type DevTaskScope string

const (
	ScopeVueUI     DevTaskScope = "前端-Vue"
	ScopeReactUI   DevTaskScope = "前端-React"
	ScopePython    DevTaskScope = "后端-Python"
	ScopeGo        DevTaskScope = "后端-Go"
	ScopeGeneral   DevTaskScope = "通用"
)

// 状态
type DevTaskStatus string

const (
	StatusTriage     DevTaskStatus = "待评估"
	StatusBacklog    DevTaskStatus = "待排期"
	StatusInProgress DevTaskStatus = "进行中"
	StatusShelved    DevTaskStatus = "已搁置"
	StatusDone       DevTaskStatus = "已完成"
)

type DevTask struct {
	ID          string          `bson:"_id,omitempty" json:"id"`
	UserID      int             `bson:"user_id" json:"user_id"`
	Title       string          `bson:"title" json:"title"`
	Description *string         `bson:"description,omitempty" json:"description,omitempty"`
	Detail      *string         `bson:"detail,omitempty" json:"detail,omitempty"`
	Type        DevTaskType     `bson:"type" json:"type"`
	Priority    DevTaskPriority `bson:"priority" json:"priority"`
	Scope       DevTaskScope    `bson:"scope" json:"scope"`
	Status      DevTaskStatus   `bson:"status" json:"status"`
	SortOrder   int             `bson:"sort_order" json:"sort_order"`
	DueDate     *time.Time      `bson:"due_date,omitempty" json:"due_date,omitempty"`
	CreatedAt   time.Time       `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time       `bson:"updated_at" json:"updated_at"`
}
