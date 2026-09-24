package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/response"
)

type TideReader interface {
	GetTide(context.Context, string, string) (json.RawMessage, bool, error)
}
type FullWeatherReader interface {
	GetFullWeatherData(context.Context, string) (*dto.FullWeatherData, error)
}

type WeatherHandler struct {
	tide TideReader
	full FullWeatherReader
}

func NewWeatherHandler(tide TideReader, full FullWeatherReader) *WeatherHandler {
	return &WeatherHandler{tide: tide, full: full}
}
func (h *WeatherHandler) GetTide(c *gin.Context) {
	date := c.Query("date")
	if date == "" {
		response.APIError(c, "date is required", 400)
		return
	}
	harbor := c.DefaultQuery("harbor", "P2352")
	data, fromCache, err := h.tide.GetTide(c.Request.Context(), harbor, date)
	if respondErr(c, err, "get tide failed", "path", c.FullPath()) {
		return
	}
	msg := "Tide information retrieved successfully"
	if fromCache {
		msg = "Tide information retrieved from cache"
	}
	response.Success(c, dto.ToTideResponse(data, fromCache), msg)
}
func (h *WeatherHandler) GetFullWeather(c *gin.Context) {
	location := c.Query("location")
	if location == "" {
		response.APIError(c, "location is required", 400)
		return
	}
	start := time.Now()
	data, err := h.full.GetFullWeatherData(c.Request.Context(), location)
	if respondErr(c, err, "get full weather failed", "path", c.FullPath()) {
		return
	}
	slog.Debug("FullWeather", "indices", string(data.Indices), "lag", time.Since(start))
	response.Success(c, data, "Full weather data retrieved successfully")
}
func (h *WeatherHandler) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/weather")
	g.GET("/tide", h.GetTide)
	g.GET("/full", h.GetFullWeather)
}
