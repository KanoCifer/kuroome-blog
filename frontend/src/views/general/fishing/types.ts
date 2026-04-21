export interface TideTableItem {
  fxTime: string;
  height: number | string;
  type: "H" | "L";
}

export interface TideData {
  updateTime: string;
  tideTable: TideTableItem[];
  tideHourly: Array<{ fxTime: string; height: number | string }>;
}

export interface WeatherHourly {
  fxTime: string;
  temp?: number;
  precip?: number;
  humidity?: number;
  pressure?: number;
  windDir?: string;
  windScale?: string;
  windSpeed?: number;
  text?: string;
  icon?: string;
}

export interface WeatherDay {
  fxDate: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  moonPhase: string;
  moonPhaseIcon: string;
  tempMax: string;
  tempMin: string;
  iconDay: string;
  textDay: string;
  iconNight: string;
  textNight: string;
  wind360Day: string;
  windDirDay: string;
  windScaleDay: string;
  windSpeedDay: string;
  wind360Night: string;
  windDirNight: string;
  windScaleNight: string;
  windSpeedNight: string;
  humidity: string;
  precip: string;
  pressure: string;
  vis: string;
  cloud: string;
  uvIndex: string;
}

export interface WeatherForecastResponse {
  code: string;
  updateTime: string;
  fxLink: string;
  daily?: WeatherDay[];
  refer?: {
    sources?: string[];
    license?: string[];
  };
}

export interface WeatherIndex {
  date: string;
  type: string;
  name: string;
  level: string;
  category: string;
  text: string;
}

export interface WeatherIndicesResponse {
  code: string;
  updateTime: string;
  fxLink: string;
  daily?: WeatherIndex[];
  refer?: {
    sources?: string[];
    license?: string[];
  };
}

export interface WeatherNow {
  obsTime: string;
  temp: string;
  feelsLike: string;
  icon: string;
  text: string;
  wind360: string;
  windDir: string;
  windScale: string;
  windSpeed: string;
  humidity: string;
  precip: string;
  pressure: string;
  vis: string;
  cloud: string;
  dew: string;
}

export interface WeatherLiveResponse {
  code: string;
  updateTime: string;
  fxLink: string;
  now?: WeatherNow;
  refer?: {
    sources?: string[];
    license?: string[];
  };
}

export interface WeatherFullResponse {
  current?: WeatherLiveResponse;
  daily?: WeatherForecastResponse;
  hourly?: Record<string, unknown>;
  tide?: TideData;
  indices?: WeatherIndicesResponse;
  locationName?: string;
  poiId?: string;
}

export type FishingLevel = "爆护" | "好" | "一般" | "差" | "空军";
export type FishingIndexLevel = FishingLevel | "极好";
export type FishingFeedbackLevel = FishingLevel;

export interface FishingIndexData {
  fishing_index: number;
  expert_score: number;
  residual: number;
  level: FishingIndexLevel;
  feature_breakdown: Record<string, number>;
}

export interface FishingFeedbackData {
  fishing_index: number;
  level: FishingIndexLevel;
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  precipitation: number;
  indices: number;
  tide_level: number;
  tide_type?: "涨潮" | "退潮";
  tide_range: number;
  hours_to_next_tide: number;
}

export interface FishingFeedbackPayload {
  location_id: string;
  location_name: string;
  fishing_time: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  precipitation?: number;
  indices?: number;
  tide_level?: number;
  tide_type?: "涨潮" | "退潮";
  tide_range?: number;
  hours_to_next_tide?: number;
  feedback: FishingFeedbackLevel;
}

export interface FishingFeedbackResponse {
  success: boolean;
  record_id: string;
  expert_score: number;
  residual: number;
}
