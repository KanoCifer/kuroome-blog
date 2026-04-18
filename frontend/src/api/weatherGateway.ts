import request from "@/api/request";

export interface TideResponse {
  code: string;
  updateTime: string;
  tideTable: Array<{ fxTime: string; height: string; type: "H" | "L" }>;
  tideHourly: Array<{ fxTime: string; height: string }>;
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

export interface WeatherFullResponse {
  current?: WeatherLiveResponse;
  daily?: WeatherForecastResponse;
  hourly?: Record<string, unknown>;
  tide?: TideResponse;
  indices?: Record<string, unknown>;
  locationName?: string;
  poiId?: string;
}

export interface WeatherGateway {
  getTide(payload: { harbor: string; date: string }): Promise<TideResponse>;
  getWeatherFull(payload: { location: [number, number] }): Promise<WeatherFullResponse>;
}

export const weatherGateway: WeatherGateway = {
  async getTide(payload: { harbor: string; date: string }): Promise<TideResponse> {
    const res = await request.get<{ data: TideResponse }>("v2/weather/tide", {
      params: payload,
    });
    return res.data.data;
  },

  async getWeatherFull(payload: { location: [number, number] }): Promise<WeatherFullResponse> {
    const [lng, lat] = payload.location;
    const res = await request.get<{ data: WeatherFullResponse }>("v2/weather/full", {
      params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
    });
    return res.data.data;
  },
};
