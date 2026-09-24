package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/KanoCifer/kuroome-blog/internal/config"
	"github.com/KanoCifer/kuroome-blog/internal/infra/httpclient"
	"github.com/KanoCifer/kuroome-blog/internal/infra/qweather"
)

type QueryService struct{ qw *qweather.Client }

func NewQueryService(http *httpclient.Client, redis *redis.Client, cfg config.WeatherConfig, signer *qweather.Signer) *QueryService {
	return &QueryService{qw: qweather.NewClient(http, redis, cfg.QweatherBaseURL, signer)}
}

func (s *QueryService) GetTide(ctx context.Context, harbor, date string) (json.RawMessage, bool, error) {
	cacheKey := fmt.Sprintf("qweather:tide:%s:%s", harbor, date)
	if rdb := s.qw.Redis(); rdb != nil {
		cached, err := rdb.Get(ctx, cacheKey).Bytes()
		if err == nil && len(cached) > 0 {
			return cached, true, nil
		}
	}
	data, err := s.qw.Get(ctx, "/v7/ocean/tide", map[string]string{"location": harbor, "date": date}, cacheKey, 12*time.Hour)
	return data, false, err
}
func (s *QueryService) GetCurrent(ctx context.Context, location, locationID *string) (json.RawMessage, error) {
	loc, params, err := s.qw.ResolveLocation(location, locationID)
	if err != nil {
		return nil, err
	}
	return s.qw.Get(ctx, "/v7/weather/now", params, "qweather:current:"+loc, 10*time.Minute)
}
func (s *QueryService) GetHourly(ctx context.Context, hours int, location, locationID *string) (json.RawMessage, error) {
	loc, params, err := s.qw.ResolveLocation(location, locationID)
	if err != nil {
		return nil, err
	}
	return s.qw.Get(ctx, fmt.Sprintf("/v7/weather/%dh", hours), params, "qweather:hourly:"+loc, 30*time.Minute)
}
func (s *QueryService) GetForecast(ctx context.Context, days int, location, locationID *string) (json.RawMessage, error) {
	loc, params, err := s.qw.ResolveLocation(location, locationID)
	if err != nil {
		return nil, err
	}
	return s.qw.Get(ctx, fmt.Sprintf("/v7/weather/%dd", days), params, "qweather:forecast:"+loc+":"+fmt.Sprintf("%dd", days), time.Hour)
}
func (s *QueryService) GetIndices(ctx context.Context, location, locationID *string) (json.RawMessage, error) {
	loc, params, err := s.qw.ResolveLocation(location, locationID)
	if err != nil {
		return nil, err
	}
	params["type"] = "4"
	return s.qw.Get(ctx, "/v7/indices/1d", params, "qweather:indices:"+loc, 12*time.Hour)
}
func (s *QueryService) GetPOI(ctx context.Context, location string) (json.RawMessage, error) {
	return s.qw.Get(ctx, "/geo/v2/poi/lookup", map[string]string{"location": location, "type": "scenic"}, fmt.Sprintf("qweather:poi:%s:scenic", location), 24*time.Hour)
}
func (s *QueryService) GetNearbyTSTA(ctx context.Context, location string) (map[string]string, error) {
	data, err := s.qw.Get(ctx, "/geo/v2/poi/lookup", map[string]string{"location": location, "type": "TSTA"}, fmt.Sprintf("qweather:tsta:%s", location), 24*time.Hour)
	if err != nil {
		return nil, err
	}
	var parsed struct {
		POI []struct {
			ID string `json:"id"`
		} `json:"poi"`
	}
	if err := json.Unmarshal(data, &parsed); err != nil {
		return nil, fmt.Errorf("weather: parse tsta: %w", err)
	}
	if len(parsed.POI) == 0 {
		return map[string]string{}, nil
	}
	return map[string]string{"id": parsed.POI[0].ID}, nil
}
