package dto

// PostResponse 单篇博客输出 —— 与 Python _serialize_post 形状一致。
type PostResponse struct {
	ID        string   `json:"_id"`
	Title     string   `json:"title"`
	Body      string   `json:"body"`
	Summary   *string  `json:"summary"`
	Cover     *string  `json:"cover"`
	Tags      []string `json:"tags"`
	IsPinned  int      `json:"is_pinned"`
	Views     int      `json:"views"`
	Likes     int      `json:"likes"`
	CreatedAt string   `json:"created_at"`
	UpdatedAt string   `json:"updated_at"`
}

// LikeResponse 点赞响应 —— 返回递增后的最新喜欢数。
type LikeResponse struct {
	Likes int `json:"likes"`
}

// TagResponse 标签聚合项 —— 与 Python aggregate_tag_counts 形状一致。
type TagResponse struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// BlogListResponse 博客列表响应 —— 与 Python get_blogs 返回形状一致。
type BlogListResponse struct {
	Posts      []PostResponse `json:"posts"`
	Tags       []TagResponse  `json:"tags"`
	Pagination Pagination     `json:"pagination"`
}

// PostsByTagResponse 标签筛选响应 —— 与 Python get_posts_by_tag 返回形状一致。
type PostsByTagResponse struct {
	Posts []PostResponse `json:"posts"`
	Tag   string         `json:"tag"`
	Total int            `json:"total"`
}
