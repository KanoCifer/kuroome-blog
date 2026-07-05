package dto

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username  string `json:"username" binding:"required,min=3,max=50"`
	Password  string `json:"password" binding:"required,min=6"`
	Email     string `json:"email" binding:"required,email"`
	EmailCode string `json:"email_code" binding:"required"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// UserResponse 对外暴露的用户结构（不含敏感字段）
type UserResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	UserResponse
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
}

// ToUserResponse 从 model.User 转换为 DTO
func ToUserResponse(id uint, username string, isAdmin bool) UserResponse {
	return UserResponse{
		ID:       id,
		Username: username,
		IsAdmin:  isAdmin,
	}
}
