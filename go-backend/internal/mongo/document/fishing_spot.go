package document

type FishingSpot struct {
	Location    []float64 `bson:"location"`
	Name        string    `bson:"name"`
	Description string    `bson:"description"`
	Tags        []string  `bson:"tags"`

	// 1-5 Star rating
	Rating float64 `bson:"rating"`
	// 钓点图片
	Images []string `bson:"images"`
}
