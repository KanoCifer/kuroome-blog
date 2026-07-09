package document

import "time"

type TideType string

const (
	TideRising  TideType = "涨潮"
	TideFalling TideType = "退潮"
)

type Feedback string

const (
	FeedbackGreat Feedback = "爆护"
	FeedbackGood  Feedback = "好"
	FeedbackAvg   Feedback = "一般"
	FeedbackBad   Feedback = "差"
	FeedbackEmpty Feedback = "空军"
)

type Source string

const (
	SourceUser Source = "user"
	SourceAI   Source = "ai"
)

type FishingRecord struct {
	ID              string    `bson:"_id,omitempty"`
	LocationID      string    `bson:"location_id"`
	LocationName    string    `bson:"location_name"`
	FishingTime     time.Time `bson:"fishing_time"`
	Temperature     float64   `bson:"temperature"`
	WindSpeed       float64   `bson:"wind_speed"`
	Pressure        float64   `bson:"pressure"`
	Humidity        float64   `bson:"humidity"`
	Precipitation   float64   `bson:"precipitation"`
	Indices         int       `bson:"indices"`
	TideLevel       float64   `bson:"tide_level"`
	TideType        TideType  `bson:"tide_type"`
	TideRange       float64   `bson:"tide_range"`
	HoursToNextTide float64   `bson:"hours_to_next_tide"`
	Feedback        Feedback  `bson:"feedback"`
	FeedbackScore   int       `bson:"feedback_score"`
	ExpertScore     float64   `bson:"expert_score"`
	CreatedAt       time.Time `bson:"created_at"`
	Source          Source    `bson:"source"`
}

type FishingModelMeta struct {
	ModelVersion       string             `bson:"model_version"`
	ModelType          string             `bson:"model_type"`
	ScalerMean         map[string]float64 `bson:"scaler_mean"`
	ScalerStd          map[string]float64 `bson:"scaler_std"`
	Alpha              float64            `bson:"alpha"`
	FeatureNames       []string           `bson:"feature_names"`
	TrainingSamples    int                `bson:"training_samples"`
	R2Score            float64            `bson:"r2_score"`
	LastTrainedAt      *time.Time         `bson:"last_trained_at"`
	IncrementalUpdates int                `bson:"incremental_updates"`
}
