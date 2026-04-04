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

export interface LiveWeather {
  province: string;
  city: string;
  adcode: string;
  weather: string;
  temperature: string;
  winddirection: string;
  windpower: string;
  humidity: string;
  reporttime: string;
}

export interface ForecastDay {
  date: string;
  week: string;
  dayweather: string;
  nightweather: string;
  daytemp: string;
  nighttemp: string;
  daywind: string;
  nightwind: string;
  daypower: string;
  nightpower: string;
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

export interface WeatherLiveResponseData {
  status?: string;
  lives?: LiveWeather[];
}

export interface WeatherForecastResponseData {
  status?: string;
  forecasts?: Array<{
    casts?: ForecastDay[];
  }>;
}

export interface WeatherAndLocationData {
  liveWeather: LiveWeather;
  forecasts: ForecastDay[];
  locationName: string;
}

export interface AnalysisPayload {
  liveWeather: LiveWeather | null;
  forecasts: ForecastDay[];
  tideData: TideData | null;
  locationName: string;
  tideSpotName: string;
}
