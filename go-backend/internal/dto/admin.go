package dto

type PostIn struct {
	Title    string   `json:"title" binding:"required"`
	Body     string   `json:"body" binding:"required"`
	Summary  string   `json:"summary"`
	Cover    string   `json:"cover"`
	Tags     []string `json:"tags"`
	IsPinned bool     `json:"is_pinned"`
}

type PostUpdate struct {
	PostIn
	ID string `json:"_id" binding:"required"`
}

type VisitorData struct {
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
