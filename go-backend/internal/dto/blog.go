package dto

// PostOut 单篇博客输出 —— 与 Python _serialize_post 形状一致。
type PostOut struct {
	ID        string   `json:"_id"`
	Title     string   `json:"title"`
	Body      string   `json:"body"`
	Summary   *string  `json:"summary"`
	Cover     *string  `json:"cover"`
	Tags      []string `json:"tags"`
	IsPinned  int      `json:"is_pinned"`
	CreatedAt string   `json:"created_at"`
	UpdatedAt string   `json:"updated_at"`
}

// TagOut 标签聚合项 —— 与 Python aggregate_tag_counts 形状一致。
type TagOut struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// PaginationOut 分页元数据 —— 与 Python get_blogs.pagination 形状一致。
type PaginationOut struct {
	Page    int  `json:"page"`
	PerPage int  `json:"per_page"`
	Total   int  `json:"total"`
	Pages   int  `json:"pages"`
	HasPrev bool `json:"has_prev"`
	HasNext bool `json:"has_next"`
	PrevNum *int `json:"prev_num"`
	NextNum *int `json:"next_num"`
}

// BlogListOut 博客列表响应 —— 与 Python get_blogs 返回形状一致。
type BlogListOut struct {
	Posts      []PostOut     `json:"posts"`
	Tags       []TagOut      `json:"tags"`
	Pagination PaginationOut `json:"pagination"`
}

// PostsByTagOut 标签筛选响应 —— 与 Python get_posts_by_tag 返回形状一致。
type PostsByTagOut struct {
	Posts []PostOut `json:"posts"`
	Tag   string    `json:"tag"`
	Total int       `json:"total"`
}
