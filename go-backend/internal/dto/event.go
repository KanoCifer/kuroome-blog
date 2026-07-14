package dto

import "time"

// Event 单条事件的对外视图，字段名对齐 Python EventResponse。
type Event struct {
	ID        uint           `json:"id"`
	Timestamp time.Time      `json:"timestamp"`
	Type      string         `json:"type"`
	Source    string         `json:"source"`
	Title     string         `json:"title"`
	Message   string         `json:"message"`
	Extra     map[string]any `json:"extra"`
}

// Pagination 分页元数据，字段名对齐 Python PaginationSchema。
type Pagination struct {
	Page    int  `json:"page"`
	PerPage int  `json:"per_page"`
	Total   int  `json:"total"`
	Pages   int  `json:"pages"`
	HasPrev bool `json:"has_prev"`
	HasNext bool `json:"has_next"`
	PrevNum *int `json:"prev_num"`
	NextNum *int `json:"next_num"`
}

// Events /api/v3/system/events 的响应信封内层结构。
type Events struct {
	Items      []Event    `json:"items"`
	Pagination Pagination `json:"pagination"`
}
