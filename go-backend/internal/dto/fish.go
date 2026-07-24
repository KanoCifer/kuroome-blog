package dto

type FishingSpotResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Location    []float64 `json:"location"`
	Tags        []string  `json:"tags"`
	Rating      float64   `json:"rating"`
	Images      []string  `json:"images"`
}

// FishingSpotRequest 创建钓点请求 —— 全字段非指针，Name / Location 必填。
type FishingSpotRequest struct {
	Name        string    `json:"name" binding:"required"`
	Location    []float64 `json:"location" binding:"required"`
	Description string    `json:"description"`
	Tags        []string  `json:"tags"`
	Rating      float64   `json:"rating"`
	Images      []string  `json:"images"`
}

// FishingSpotUpdate 更新钓点请求 —— 全字段指针，nil = 不动，非 nil = 显式覆盖。
// 与 DevTaskUpdate 同模式：service 层只把非 nil 字段塞进 bson.M，避免 partial update 静默清空。
type FishingSpotUpdate struct {
	Name        *string    `json:"name"`
	Location    *[]float64 `json:"location"`
	Description *string    `json:"description"`
	Tags        *[]string  `json:"tags"`
	Rating      *float64   `json:"rating"`
	Images      *[]string  `json:"images"`
}
