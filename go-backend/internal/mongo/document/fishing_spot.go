package document

import "time"

type FishingSpot struct {
	ID          string    `bson:"_id,omitempty" json:"id"`
	Location    []float64 `bson:"location"`
	Name        string    `bson:"name"`
	Description string    `bson:"description"`
	Tags        []string  `bson:"tags"`

	CreatedAt   time.Time `bson:"createdAt"`
	UpdatedAt   time.Time `bson:"updatedAt"`
	DeletedAt   *time.Time `bson:"deletedAt"`


	// 1-5 Star rating
	Rating float64 `bson:"rating"`
	// 钓点图片
	Images []string `bson:"images"`
}
