package document

import "time"

type RssFeed struct {
	ID          string    `bson:"_id,omitempty"`
	Title       string    `bson:"title"`
	Link        string    `bson:"link"`
	Description string    `bson:"description"`
	Content     string    `bson:"content"`
	CreatedAt   time.Time `bson:"created_at"`
}

type RssArticle struct {
	ID        string    `bson:"_id,omitempty"`
	GUID      string    `bson:"guid"`
	FeedURL   string    `bson:"feed_url"`
	Title     string    `bson:"title"`
	Link      string    `bson:"link"`
	Summary   string    `bson:"summary"`
	Content   string    `bson:"content"`
	Author    *string   `bson:"author"`
	Published *time.Time `bson:"published"`
	FetchedAt time.Time  `bson:"fetched_at"`
	ReadBy    []int     `bson:"read_by"`
}
