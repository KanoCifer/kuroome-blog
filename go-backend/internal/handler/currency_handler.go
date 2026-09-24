package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/response"
	"github.com/KanoCifer/kuroome-blog/internal/service"
)

// Currencyer 定义 handler 依赖的汇率查询能力。
// 由 *service.CurrencyService 隐式满足。
type Currencyer interface {
	GetExchange(ctx context.Context, baseCurrency string) (*dto.ExchangeResponse, error)
}

var _ Currencyer = (*service.CurrencyService)(nil)

type CurrencyHandler struct {
	svc Currencyer
}

func NewCurrencyHandler(
	svc Currencyer,
) *CurrencyHandler {
	return &CurrencyHandler{svc: svc}
}

func (h *CurrencyHandler) GetExchangeRate(c *gin.Context) {
	base := c.Query("base")
	if base == "" {
		response.APIError(c, "Need Base Currency", http.StatusBadRequest)
		return
	}
	res, err := h.svc.GetExchange(c.Request.Context(), base)

	if respondErr(c, err, "GetExchangeRate failed") {
		return
	}

	response.Success(c, res, "汇率获取成功")
}

func (h *CurrencyHandler) RegisterRoutes(r *gin.RouterGroup, mw ...gin.HandlerFunc) {
	r.GET("/currency", append(mw, h.GetExchangeRate)...)
}
