package document

import "time"

type DevTask struct {
	ID          string     `bson:"_id,omitempty"`
	UserID      int        `bson:"user_id"`
	Title       string     `bson:"title"`
	Description *string    `bson:"description"`
	Priority    string     `bson:"priority"`
	Status      string     `bson:"status"`
	SortOrder   int        `bson:"sort_order"`
	DueDate     *time.Time `bson:"due_date"`
	CreatedAt   time.Time  `bson:"created_at"`
	UpdatedAt   time.Time  `bson:"updated_at"`
}
