import type { GeocodeResponse, TideResponse, WeatherForecastResponse, WeatherLiveResponse } from "@/api/weatherGateway";
import { weatherGateway } from "@/api/weatherGateway";

export interface WeatherService {
  getTide(payload: { harbor: string; date: string }): Promise<TideResponse>;
  reverseGeocode(payload: { location: string; extensions: "base" | "all" }): Promise<GeocodeResponse>;
  getWeather(payload: {
    city: string;
    extensions: "base" | "all";
  }): Promise<WeatherLiveResponse | WeatherForecastResponse>;
}

export const weatherService: WeatherService = {
  async getTide(payload) {
    return weatherGateway.getTide(payload);
  },

  async reverseGeocode(payload) {
    return weatherGateway.reverseGeocode(payload);
  },

  async getWeather(payload) {
    return weatherGateway.getWeather(payload);
  },
};
