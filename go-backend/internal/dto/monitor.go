package dto

import "time"

// Overview 对齐 Python monitor_service.get_overview 的返回结构。
type Overview struct {
	TotalVisits      int                      `json:"total_visits"`
	UniqueVisitors   int                      `json:"unique_visitors"`
	UniqueVisitorIDs int                      `json:"unique_visitor_ids"`
	TopPages         []map[string]any         `json:"top_pages"`
	BrowserStats     []map[string]any         `json:"browser_stats"`
	OSSStats         []map[string]any         `json:"os_stats"`
	DailyTrend       []map[string]any         `json:"daily_trend"`
	PeriodDays       int                      `json:"period_days"`
}

// VisitorItem 单条访客记录，字段名与 Python visit 字典对齐。
type VisitorItem struct {
	ID               uint       `json:"id"`
	VisitorID        string     `json:"visitor_id"`
	PageURL          string     `json:"page_url"`
	PagePath         string     `json:"page_path"`
	Referrer         *string    `json:"referrer"`
	Browser          *string    `json:"browser"`
	ScreenResolution *string    `json:"screen_resolution"`
	Language         *string    `json:"language"`
	IPAddress        string     `json:"ip_address"`
	VisitTime        *time.Time `json:"visit_time"`
}

// Visitors 分页访客列表。
type Visitors struct {
	List       []VisitorItem `json:"list"`
	Total      int           `json:"total"`
	Page       int           `json:"page"`
	PageSize   int           `json:"page_size"`
	TotalPages int           `json:"total_pages"`
}

// UserLoginItem 单条用户登录记录，字段名与 Python login_logs 对齐。
type UserLoginItem struct {
	UserID         int     `json:"user_id"`
	Username       string  `json:"username"`
	Name           string  `json:"name"`
	LoginCount     int     `json:"login_count"`
	LastLoginAt    *string `json:"last_login_at"`
	CurrentLoginAt *string `json:"current_login_at"`
	LastLoginIP    *string `json:"last_login_ip"`
	CurrentLoginIP *string `json:"current_login_ip"`
	Active         bool    `json:"active"`
}

// UserLogins 分页用户登录记录。
type UserLogins struct {
	List       []UserLoginItem `json:"list"`
	Total      int             `json:"total"`
	Page       int             `json:"page"`
	PageSize   int             `json:"page_size"`
	TotalPages int             `json:"total_pages"`
}

// ServerStatus 对齐 Python _get_server_status_payload 字段名。
type ServerStatus struct {
	CPUPercent float64 `json:"cpu_percent"`
	CPUCores  int     `json:"cpu_cores"`
	MemTotal  int     `json:"mem_total"`
	MemUsed   int     `json:"mem_used"`
	MemUsage  float64 `json:"mem_usage"`
	DiskTotal float64 `json:"disk_total"`
	DiskUsed  float64 `json:"disk_used"`
	DiskUsage float64 `json:"disk_usage"`
}
