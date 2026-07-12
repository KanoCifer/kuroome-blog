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

// 影响范围 —— 去 enum 化：接受任意非空字符串。
// 推荐格式 "<层>-<技术>"，便于看板过滤和口头引用。
type DevTaskScope string

// 仅作为示例参考，不是枚举约束。自定义值（如 "AI-LangChain"、"Docs-用户手册"）随意传。
// 看板 UI 建议把这些放在输入框 placeholder 里，而不是下拉列表。
const (
	ScopeVueUI    DevTaskScope = "前端-Vue"
	ScopeReactUI  DevTaskScope = "前端-React"
	ScopePython   DevTaskScope = "后端-Python"
	ScopeGo       DevTaskScope = "后端-Go"
	ScopeGeneral  DevTaskScope = "通用"
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
	IsDeleted   bool            `bson:"is_deleted" json:"is_deleted"`
	ArchivedAt  *time.Time      `bson:"archived_at,omitempty" json:"archived_at,omitempty"`

	// Spec —— Pocock 模式：从 free-form 描述拆成 agent 可执行的规格层。
	// 全部指针型，omitempty 让老文档不序列化。
	AcceptanceCriteria *string `bson:"acceptance_criteria,omitempty" json:"acceptance_criteria,omitempty"`
	Constraints        *string `bson:"constraints,omitempty" json:"constraints,omitempty"`
	ContextPointers    *string `bson:"context_pointers,omitempty" json:"context_pointers,omitempty"`

	// ForAgent —— 标记该任务是否已规格化到可交给 agent 执行。
	// false = 默认（未规格化或给人做的）；true = agent 可认领。
	ForAgent bool `bson:"for_agent" json:"for_agent"`

	// BlockedBy —— 本任务被哪些任务阻塞（存 ObjectID hex 数组）。
	// 为空数组 = 无阻塞，可以执行。
	BlockedBy []string `bson:"blocked_by,omitempty" json:"blocked_by"`

	// Slug —— 人类可读的短标识（task-1, task-2...），由 counters 集合自增生
	// 成。创建后不变，MCP tool / 看板 UI / 口头引用都用 slug。内部依赖引用
	// (blocked_by) 一律保持 ObjectID，不随 slug 走。
	Slug string `bson:"slug" json:"slug"`
}
