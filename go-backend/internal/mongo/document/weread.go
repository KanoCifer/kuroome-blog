package document

import "time"

type WereadUser struct {
	ID        string    `bson:"_id,omitempty"`
	UserID    int       `bson:"user_id"`
	APIKey    string    `bson:"api_key"`
	CreatedAt time.Time `bson:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"`
}

type WereadBook struct {
	ID           string    `bson:"_id,omitempty"`
	Title        string    `bson:"title"`
	Author       string    `bson:"author"`
	Translator   *string   `bson:"translator"`
	Cover        *string   `bson:"cover"`
	Introduction *string   `bson:"introduction"`
	Category     *string   `bson:"category"`
	Publisher    *string   `bson:"publisher"`
	PublishTime  *string   `bson:"publishTime"`
	ISBN         *string   `bson:"isbn"`
	WordCount    *int      `bson:"wordCount"`
	NewRating    *float64  `bson:"newRating"`
	NewRatingCount *int    `bson:"newRatingCount"`
	NewRatingDetails map[string]any `bson:"newRatingDetails"`
	FetchedAt    time.Time `bson:"fetched_at"`
}

type ReadProgress struct {
	ChapterUID    *int `bson:"chapterUid"`
	ChapterOffset *int `bson:"chapterOffset"`
	Progress      *int `bson:"progress"`
	UpdateTime    *int `bson:"updateTime"`
	ReadingTime   int  `bson:"readingTime"`
	FinishTime    *int `bson:"finishTime"`
	IsStartReading int `bson:"isStartReading"`
}

type UserBook struct {
	ID             string        `bson:"_id,omitempty"`
	UserID         int           `bson:"user_id"`
	BookID         string        `bson:"bookId"`
	Title          *string       `bson:"title"`
	Author         *string       `bson:"author"`
	Cover          *string       `bson:"cover"`
	Category       *string       `bson:"category"`
	ReadProgress   *ReadProgress `bson:"readProgress"`
	IsTop          bool          `bson:"isTop"`
	ReadUpdateTime *int          `bson:"readUpdateTime"`
	UpdateTime     *int          `bson:"updateTime"`
	FinishReading  bool          `bson:"finishReading"`
	Secret         bool          `bson:"secret"`
	UpdatedAt      time.Time     `bson:"updated_at"`
}

type Archive struct {
	ID       string   `bson:"_id,omitempty"`
	UserID   int      `bson:"user_id"`
	BookIDs  []string `bson:"bookIds"`
	AlbumIDs []string `bson:"albumIds"`
	Name     string   `bson:"name"`
}
