package document

import "time"

type FriendLink struct {
	ID          string    `bson:"_id,omitempty"`
	Name        string    `bson:"name"`
	URL         string    `bson:"url"`
	SortOrder   int       `bson:"sort_order"`
	Favicon     *string   `bson:"favicon"`
	Description *string   `bson:"description"`
	Email       *string   `bson:"email"`
	CreatedAt   time.Time `bson:"created_at"`
}
