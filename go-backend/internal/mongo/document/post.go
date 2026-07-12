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
