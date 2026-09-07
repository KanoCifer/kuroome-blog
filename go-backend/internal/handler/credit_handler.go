package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/model"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// CreditHandler 积分 HTTP 接口（task-546）。只做协议翻译，
// 厘→分换算与分页信封收口在本层；业务全部复用 service.Creditser。
type CreditHandler struct {
	svc service.Creditser
}

func NewCreditHandler(svc service.Creditser) *CreditHandler {
	return &CreditHandler{svc: svc}
}

// RegisterRoutes 挂载积分路由。balance / transactions 挂 authMW；
// grant 挂 authMW + adminMW（AdminMiddleware 未登录 401 / 非管理员 403，
// 契约见 docs/rules/auth.md，必先 Auth 再 Admin）。
func (h *CreditHandler) RegisterRoutes(r *gin.RouterGroup, authMW, adminMW gin.HandlerFunc) {
	g := r.Group("/credits")
	g.GET("/balance", authMW, h.GetBalance)
	g.GET("/transactions", authMW, h.ListTransactions)
	r.POST("/admin/credits/grant", authMW, adminMW, h.Grant)
}

// GetBalance GET /v3/credits/balance → {balance, total_spent}（分）。
// 钱包未创建返回 0，不报 404。
func (h *CreditHandler) GetBalance(c *gin.Context) {
	userID := uint(c.GetInt("user_id"))
	balance, totalSpent, err := h.svc.GetBalance(c.Request.Context(), userID)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "credit balance query failed",
			"user_id", userID, "error", err.Error())
		response.APIError(c, "internal error", http.StatusInternalServerError)
		return
	}
	response.Success(c, dto.CreditBalanceResponse{
		Balance:    creditLiToCent(balance),
		TotalSpent: creditLiToCent(totalSpent),
	})
}

// ListTransactions GET /v3/credits/transactions?page=&per_page=
// 按时间倒序分页，信封对齐 /system/events（items + pagination）。
// 非法分页参数返回 400，其余由 service 层兜默认值（1 / 10 / 上限 200）。
func (h *CreditHandler) ListTransactions(c *gin.Context) {
	page := 1
	if v := c.Query("page"); v != "" {
		d, err := strconv.Atoi(v)
		if err != nil || d < 1 {
			response.APIError(c, "page must be a positive integer", http.StatusBadRequest)
			return
		}
		page = d
	}
	perPage := 10
	if v := c.Query("per_page"); v != "" {
		d, err := strconv.Atoi(v)
		if err != nil || d < 1 || d > 200 {
			response.APIError(c, "per_page must be an integer between 1 and 200", http.StatusBadRequest)
			return
		}
		perPage = d
	}

	userID := uint(c.GetInt("user_id"))
	items, total, err := h.svc.ListTransactions(c.Request.Context(), userID, page, perPage)
	if err != nil {
		slog.ErrorContext(c.Request.Context(), "credit transactions query failed",
			"user_id", userID, "error", err.Error())
		response.APIError(c, "internal error", http.StatusInternalServerError)
		return
	}

	views := make([]dto.CreditTransactionView, len(items))
	for i := range items {
		views[i] = creditTxView(&items[i])
	}
	pages := 0
	if total > 0 {
		pages = (int(total) + perPage - 1) / perPage
	}
	pagination := dto.Pagination{
		Page:    page,
		PerPage: perPage,
		Total:   int(total),
		Pages:   pages,
		HasPrev: page > 1,
		HasNext: page < pages,
	}
	if page > 1 {
		v := page - 1
		pagination.PrevNum = &v
	}
	if page < pages {
		v := page + 1
		pagination.NextNum = &v
	}
	response.Success(c, dto.CreditTransactionsResponse{Items: views, Pagination: pagination})
}

// Grant POST /v3/admin/credits/grant，body {user_id, amount, biz_id?}。
// amount 单位"分"（支持两位小数），×100 转厘。厘制是整型而分是二进制 float，
// 直接 int64(amount*100) 会把 0.07 这类值截成 6 厘，故先数学舍入再取整
// （四舍五入到最小厘单位）；客户端传超过两位小数的金额，第 3 位小数被舍掉。
// biz_id 可选幂等键，透传 service 校验（超长/保留前缀 → 400）。
func (h *CreditHandler) Grant(c *gin.Context) {
	var req dto.GrantCreditRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.APIError(c, "invalid request body", http.StatusBadRequest)
		return
	}
	// float→int64 溢出在 Go 里是实现定义的回绕（NaN/Inf/超大值可能变成极小甚至
	// 负数），必须先用 float 域守卫；1e15 分（=1e17 厘）远超业务量级。
	if math.IsNaN(req.Amount) || math.IsInf(req.Amount, 0) || req.Amount > 1e15 {
		response.APIError(c, "amount out of range", http.StatusBadRequest)
		return
	}
	amountLi := int64(math.Round(req.Amount * 100))
	if amountLi <= 0 {
		response.APIError(c, "amount must be greater than zero", http.StatusBadRequest)
		return
	}

	tx, err := h.svc.Grant(c.Request.Context(), req.UserID, amountLi, req.BizID, nil)
	if err != nil {
		if errors.Is(err, service.ErrInvalidAmount) || errors.Is(err, service.ErrInvalidBizID) {
			response.APIError(c, err.Error(), http.StatusBadRequest)
			return
		}
		slog.ErrorContext(c.Request.Context(), "credit grant failed",
			"target_user", req.UserID, "error", err.Error())
		response.APIError(c, "internal error", http.StatusInternalServerError)
		return
	}
	response.Success(c, creditTxView(tx), "granted successfully")
}

// -- helpers ----------------------------------------------------------- //

// creditLiToCent 厘 → 分（1 分 = 100 厘）。厘是精确整型，除以 100 的 float 误差不超
// 半 ULP，展示两位小数足够（金额上限 ~2^63 厘之前都不会溢出精度需求）。
func creditLiToCent(li int64) float64 {
	return float64(li) / 100.0
}

func creditTxView(t *model.CreditTransaction) dto.CreditTransactionView {
	v := dto.CreditTransactionView{
		ID:           t.ID,
		Source:       t.Source,
		BizID:        t.BizID,
		Type:         t.Type,
		Amount:       creditLiToCent(t.Amount),
		BalanceAfter: creditLiToCent(t.BalanceAfter),
		CreatedAt:    t.CreatedAt,
	}
	if len(t.Meta) > 0 {
		var m map[string]any
		if err := json.Unmarshal(t.Meta, &m); err == nil {
			v.Meta = m
		}
	}
	return v
}
