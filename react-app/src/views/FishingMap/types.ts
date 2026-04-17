import type {
  AMapDriving,
  AMapDrivingResult,
  AMapMapInstance,
  AMapMarker,
  AMapMarkerInstance,
  AMapNamespace,
  AMapPolyline,
  AMapSecurityConfig,
} from '@/types/maptype';

export type {
  AMapDriving,
  AMapDrivingResult,
  AMapMapInstance,
  AMapMarker,
  AMapMarkerInstance,
  AMapNamespace,
  AMapPolyline,
  AMapSecurityConfig,
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
  locationName: string;
  tideSpotName: string;
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
