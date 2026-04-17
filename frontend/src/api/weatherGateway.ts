import request from "@/api/request";

// Tide
export interface TideResponse {
  code: string;
  updateTime: string;
  tideTable: Array<{ fxTime: string; height: string; type: "H" | "L" }>;
  tideHourly: Array<{ fxTime: string; height: string }>;
}

// QWeather POI
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

// QWeather 实时天气
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

// QWeather 天气预报
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

export interface WeatherGateway {
  getTide(payload: { harbor: string; date: string }): Promise<TideResponse>;
  getPOI(payload: { location: [number, number] }): Promise<PoiResponse>;
  getWeatherLive(payload: { location: [number, number] }): Promise<WeatherLiveResponse>;
  getWeatherForecast(payload: { location: [number, number]; days: number }): Promise<WeatherForecastResponse>;
}

export const weatherGateway: WeatherGateway = {
  async getTide(payload: { harbor: string; date: string }): Promise<TideResponse> {
    const res = await request.get<{ data: TideResponse }>("v1/qweather/tide", {
      params: payload,
    });
    return res.data.data;
  },

  async getPOI(payload: { location: [number, number] }): Promise<PoiResponse> {
    const [lng, lat] = payload.location;
    const res = await request.get<{ data: PoiResponse }>("v1/geo/v2/poi/lookup", {
      params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
    });
    return res.data.data;
  },

  async getWeatherLive(payload: { location: [number, number] }): Promise<WeatherLiveResponse> {
    const [lng, lat] = payload.location;
    const res = await request.get<{ data: WeatherLiveResponse }>("v1/weather/now", {
      params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
    });
    return res.data.data;
  },

  async getWeatherForecast(payload: { location: [number, number]; days: number }): Promise<WeatherForecastResponse> {
    const [lng, lat] = payload.location;
    const res = await request.get<{ data: WeatherForecastResponse }>(`v1/weather/${payload.days}`, {
      params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
    });
    return res.data.data;
  },
};
