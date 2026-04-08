import request from "@/api/request";

export interface TideResponse {
  tides?: Array<{ time: string; height: number }>;
}

export interface GeocodeResponse {
  address: string;
  location?: { lat: number; lng: number };
}

export interface WeatherResponse {
  now?: {
    temp: string;
    text: string;
    windDir: string;
    humidity: string;
  };
}

export interface WeatherGateway {
  getTide(): Promise<TideResponse>;
  reverseGeocode(payload: { location: string; extensions: "base" | "all" }): Promise<GeocodeResponse>;
  getWeather(payload: { city: string; extensions: "base" | "all" }): Promise<WeatherResponse>;
}

export const weatherGateway: WeatherGateway = {
  async getTide(): Promise<TideResponse> {
    const res = await request.get<{ data: TideResponse }>("v1/weather/tide");
    return res.data.data;
  },

  async reverseGeocode(payload: { location: string; extensions: "base" | "all" }): Promise<GeocodeResponse> {
    const res = await request.post<{ data: GeocodeResponse }>("v1/weather/geocode", payload);
    return res.data.data;
  },

  async getWeather(payload: { city: string; extensions: "base" | "all" }): Promise<WeatherResponse> {
    const res = await request.post<{ data: WeatherResponse }>("v1/weather/weather", payload);
    return res.data.data;
  },
};
