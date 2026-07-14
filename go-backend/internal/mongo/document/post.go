package document

import "time"

type Post struct {
	ID         string    `bson:"_id,omitempty"`
	Title      string    `bson:"title"`
	Body       string    `bson:"body"`
	Summary    *string   `bson:"summary"`
	Cover      *string   `bson:"cover"`
	Tags       []string  `bson:"tags"`
	CategoryID *int      `bson:"category_id"`
	IsPinned   int       `bson:"is_pinned"`
	CreatedAt  time.Time `bson:"created_at"`
	UpdatedAt  time.Time `bson:"updated_at"`
	Likes      int       `bson:"likes"`
	Views      int       `bson:"views"`
}

// TagCount 标签聚合结果 —— 从 $group 管道解码，在 service 层映射为 DTO。
type TagCount struct {
	Name  string `bson:"_id"`
	Count int    `bson:"count"`
}

// PostViewData 文章浏览数据投影 —— 只查询 title / views 两个字段。
type PostViewData struct {
	Title string `bson:"title"`
	Views int    `bson:"views"`
}
