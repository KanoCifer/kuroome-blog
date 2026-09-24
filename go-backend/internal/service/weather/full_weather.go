package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/KanoCifer/kuroome-blog/internal/dto"
	"github.com/KanoCifer/kuroome-blog/internal/infra/qweather"
	"github.com/KanoCifer/kuroome-blog/internal/util"
)

type weatherPart struct {
	Kind string
	Data json.RawMessage
	Map  map[string]string
}

type WeatherQuery interface {
	GetPOI(context.Context, string) (json.RawMessage, error)
	GetNearbyTSTA(context.Context, string) (map[string]string, error)
	GetCurrent(context.Context, *string, *string) (json.RawMessage, error)
	GetHourly(context.Context, int, *string, *string) (json.RawMessage, error)
	GetForecast(context.Context, int, *string, *string) (json.RawMessage, error)
	GetTide(context.Context, string, string) (json.RawMessage, bool, error)
	GetIndices(context.Context, *string, *string) (json.RawMessage, error)
}

type FullWeatherService struct{ query WeatherQuery }

var _ WeatherQuery = (*QueryService)(nil)

func NewFullWeatherService(query WeatherQuery) *FullWeatherService {
	return &FullWeatherService{query: query}
}

func (s *FullWeatherService) GetFullWeatherData(ctx context.Context, location string) (*dto.FullWeatherData, error) {
	ch1 := util.FanOut(ctx,
		func(ctx context.Context) (weatherPart, error) {
			d, err := s.query.GetPOI(ctx, location)
			return weatherPart{Kind: "poi", Data: d}, err
		},
		func(ctx context.Context) (weatherPart, error) {
			d, err := s.query.GetNearbyTSTA(ctx, location)
			return weatherPart{Kind: "tsta", Map: d}, err
		},
	)
	var poiData json.RawMessage
	var tstaID string
	for range 2 {
		var r util.Result[weatherPart]
		select {
		case r = <-ch1:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		switch r.Value.Kind {
		case "poi":
			if r.Error != nil {
				return nil, r.Error
			}
			poiData = r.Value.Data
		case "tsta":
			if r.Error != nil {
				slog.ErrorContext(ctx, "fetch nearby TSTA failed", "location", location, "error", r.Error.Error())
				continue
			}
			if id, ok := r.Value.Map["id"]; ok && id != "" {
				tstaID = id
				slog.InfoContext(ctx, "found nearby TSTA", "id", tstaID)
			} else {
				slog.WarnContext(ctx, "no nearby TSTA", "location", location)
			}
		}
	}
	var poiParsed struct {
		POI []struct {
			Name string `json:"name"`
			ID   string `json:"id"`
		} `json:"poi"`
	}
	if err := json.Unmarshal(poiData, &poiParsed); err != nil {
		return nil, fmt.Errorf("weather: parse poi: %w", err)
	}
	var poiName, poiID string
	if len(poiParsed.POI) > 0 {
		poiName = poiParsed.POI[0].Name
		poiID = poiParsed.POI[0].ID
	}
	slog.InfoContext(ctx, "POI lookup returned", "location", location, "name", poiName, "id", poiID)
	if poiName == "" && poiID == "" {
		return nil, fmt.Errorf("%w: no POI for %s", qweather.ErrUpstream, location)
	}
	harbor := tstaID
	if harbor == "" {
		harbor = "P2352"
	}
	dateStr := time.Now().UTC().Format("20060102")
	ch2 := util.FanOut(ctx,
		func(ctx context.Context) (weatherPart, error) {
			d, err := s.query.GetCurrent(ctx, &location, nil)
			return weatherPart{Kind: "current", Data: d}, err
		},
		func(ctx context.Context) (weatherPart, error) {
			d, err := s.query.GetHourly(ctx, 24, &location, nil)
			return weatherPart{Kind: "hourly", Data: d}, err
		},
		func(ctx context.Context) (weatherPart, error) {
			d, err := s.query.GetForecast(ctx, 3, &location, nil)
			return weatherPart{Kind: "daily", Data: d}, err
		},
		func(ctx context.Context) (weatherPart, error) {
			d, _, err := s.query.GetTide(ctx, harbor, dateStr)
			return weatherPart{Kind: "tide", Data: d}, err
		},
		func(ctx context.Context) (weatherPart, error) {
			d, err := s.query.GetIndices(ctx, &location, nil)
			return weatherPart{Kind: "indices", Data: d}, err
		},
	)
	var current, hourly, daily, tide, indices json.RawMessage
	for range 5 {
		var r util.Result[weatherPart]
		select {
		case r = <-ch2:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		if r.Error != nil {
			return nil, r.Error
		}
		switch r.Value.Kind {
		case "current":
			current = r.Value.Data
		case "hourly":
			hourly = r.Value.Data
		case "daily":
			daily = r.Value.Data
		case "tide":
			tide = r.Value.Data
		case "indices":
			indices = r.Value.Data
		}
	}
	slog.DebugContext(ctx, "fetched full weather data", "location", location, "poi", poiName)
	return &dto.FullWeatherData{Current: current, Hourly: hourly, Daily: daily, Tide: tide, Indices: indices, LocationName: poiName, POIID: poiID}, nil
}
