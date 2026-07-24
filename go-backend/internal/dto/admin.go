package dto

// PostRequest 创建文章请求 —— Title / Body 必填。
type PostRequest struct {
	Title    string   `json:"title" binding:"required"`
	Body     string   `json:"body" binding:"required"`
	Summary  string   `json:"summary"`
	Cover    string   `json:"cover"`
	Tags     []string `json:"tags"`
	IsPinned bool     `json:"is_pinned"`
}

// PostUpdate 更新文章请求 —— 与 DevTaskUpdate / FishingSpotUpdate 同模式：
// 所有字段均为指针，nil = 不动，非 nil = 显式覆盖，避免 partial update 静默清空。
// 内嵌 PostRequest 只是为了复用字段定义，实际 DTO 序列化以PostUpdate 自己的指针字段为准。
type PostUpdate struct {
	Title    *string   `json:"title"`
	Body     *string   `json:"body"`
	Summary  *string   `json:"summary"`
	Cover    *string   `json:"cover"`
	Tags     *[]string `json:"tags"`
	IsPinned *bool     `json:"is_pinned"`
	ID       string    `json:"_id" binding:"required"`
}

type PostViewResponse struct {
	Title string `json:"title"`
	Views int    `json:"views"`
}

type VisitorResponse struct {
	VisitorID        string `json:"visitor_id" binding:"required"`
	PageURL          string `json:"page_url" binding:"required"`
	Referrer         string `json:"referrer"`
	PagePath         string `json:"page_path" binding:"required"`
	Browser          string `json:"browser"`
	ScreenResolution string `json:"screen_resolution"`
	Language         string `json:"language"`
	BrowserVersion   string `json:"browser_version"`
	BrowserName      string `json:"browser_name"`
	OSName           string `json:"os_name"`
	OSVersion        string `json:"os_version"`
	DeviceType       string `json:"device_type"`
	Cpu              string `json:"cpu"`
	IpAddress        string `json:"ip_address"`
	VisitTime        string `json:"visit_time"`
}
