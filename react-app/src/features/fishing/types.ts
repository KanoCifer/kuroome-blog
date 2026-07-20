/**
 * AMap.Geolocation.getCurrentPosition 回调的 result 形状（领域类型,非 SDK 类型）。
 * 官方 @types/amap-js-api 把事件 payload 标为 any,这里手工声明以收紧下游。
 */
export type GeolocationStatusEvent = {
  position: { lng: number; lat: number };
  info?: string;
};

export interface ApiEnvelope<T> {
  data: T;
}

export interface TideTableItem {
  fxTime: string;
  height: number | string;
  type: 'H' | 'L';
}

export interface TideData {
  updateTime: string;
  tideTable: TideTableItem[];
  tideHourly: Array<{ fxTime: string; height: number | string }>;
}

export interface RouteInfo {
  distance: number;
  time: number;
}

export interface GeolocationResult {
  info?: string;
  position?: {
    lng: number;
    lat: number;
  };
}

export interface SecurityKeyResponse {
  securityJsCode?: string;
}

export interface RegeoResponseData {
  status?: string;
  regeocode?: {
    addressComponent?: {
      adcode?: string;
    };
  };
}

export interface AnalysisPayload {
  liveWeather: WeatherNow | null;
  forecasts: WeatherDay[];
  tideData: TideData | null;
  weatherIndices: WeatherIndex[];
  fishingIndex?: FishingIndexData;
  locationName: string;
  tideSpotName: string;
  modelId?: string;
}

// POI 数据
export interface PoiItem {
  name: string;
  id: string;
  lat: string;
  lon: string;
  adm2: string;
  adm1: string;
  country: string;
  tz: string;
  utcOffset: string;
  isDst: string;
  type: string;
  rank: string;
  fxLink: string;
}

export interface PoiResponse {
  poi?: PoiItem[];
}

// 天气预报（每日）
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

// 天气指数
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

// 实时天气
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

export interface WeatherHourlyResponse {
  code: string;
  updateTime: string;
  fxLink: string;
  hourly?: WeatherHourly[];
}

export interface WeatherHourly {
  fxTime: string;
  temp: string;
  icon: string;
  text: string;
  wind360: string;
  windDir: string;
  windScale: string;
  windSpeed: string;
  humidity: string;
  precip: string;
  pressure: string;
  pop: string;
  cloud: string;
  dew: string;
}

// 钓鱼指数
export type FishingLevel = '爆护' | '好' | '一般' | '差' | '空军';

export interface FishingIndexData {
  fishing_index: number;
  expert_score: number;
  residual: number;
  level: FishingLevel;
  feature_breakdown: Record<string, number>;
}

// 钓鱼反馈所需数据
export interface FishingFeedbackData {
  // 钓鱼指数（用于显示）
  fishing_index: number;
  level: FishingLevel;
  // 天气数据
  temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  precipitation: number;
  indices: number;
  // 潮汐数据
  tide_level: number;
  tide_type?: '涨潮' | '退潮';
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
  tide_type?: '涨潮' | '退潮';
  tide_range?: number;
  hours_to_next_tide?: number;
  feedback: FishingLevel;
}

export interface FishingFeedbackResponse {
  success: boolean;
  record_id: string;
  expert_score: number;
  residual: number;
}

// AI 天气分析评分
export interface FishingScores {
  expert_score: number;
  ai_final_score: number;
  final_score: number;
}

export interface AnalysisChunk {
  content?: string;
  is_end?: boolean;
  scores?: FishingScores;
}

/**
 * 喂给 AI 分析组件的聚合数据。
 * 在 useFishingAnalysis hook 中拼装，在 FishingAnalysisDrawer / AIAnalysisWidget 中消费。
 * 字段都是 optional —— Live / forecast / tide 任一为空时，AI 内部按需处理。
 */
export type WeatherAnalysisPayload = Omit<AnalysisPayload, 'modelId'>;
