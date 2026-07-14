package dto

type FishingSpotOut struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Location    []float64 `json:"location"`
	Tags        []string `json:"tags"`
	Rating      float64 `json:"rating"`
	Images      []string `json:"images"`
}

type FishingSpotIn struct {
	Name        string `json:"name" binding:"required"`
	Location    []float64 `json:"location" binding:"required"`
	Description string `json:"description"`
	Tags        []string `json:"tags"`
	Rating      float64 `json:"rating"`
	Images      []string `json:"images"`
}
