import request from "@/api/request";

export interface TideResponse {
  code: string;
  updateTime: string;
  tideTable: Array<{ fxTime: string; height: string; type: "H" | "L" }>;
  tideHourly: Array<{ fxTime: string; height: string }>;
}

export interface GeocodeResponse {
  status: string;
  regeocode?: {
    addressComponent: {
      adcode: string;
    };
  };
  address?: string;
  location?: { lat: number; lng: number };
}

export interface WeatherLiveResponse {
  status: string;
  lives?: Array<{
    city: string;
    temp: string;
    text: string;
    windDir: string;
    humidity: string;
  }>;
}

export interface WeatherForecastResponse {
  status: string;
  forecasts?: Array<{
    casts?: Array<{
      date: string;
      dayWeather: string;
      nightWeather: string;
      dayTemp: string;
      nightTemp: string;
      dayWind: string;
      nightWind: string;
    }>;
  }>;
}

export interface WeatherGateway {
  getTide(): Promise<TideResponse>;
  reverseGeocode(payload: { location: string; extensions: "base" | "all" }): Promise<GeocodeResponse>;
  getWeather(payload: {
    city: string;
    extensions: "base" | "all";
  }): Promise<WeatherLiveResponse | WeatherForecastResponse>;
}

export const weatherGateway: WeatherGateway = {
  async getTide(): Promise<TideResponse> {
    const res = await request.get<{ data: TideResponse }>("v1/qweather/tide");
    return res.data.data;
  },

  async reverseGeocode(payload: { location: string; extensions: "base" | "all" }): Promise<GeocodeResponse> {
    const res = await request.post<{ data: GeocodeResponse }>("v1/geocode/regeo", payload);
    return res.data.data;
  },

  async getWeather(payload: {
    city: string;
    extensions: "base" | "all";
  }): Promise<WeatherLiveResponse | WeatherForecastResponse> {
    const res = await request.post<{ data: WeatherLiveResponse | WeatherForecastResponse }>("v1/weather", payload);
    return res.data.data;
  },
};
