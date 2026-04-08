import { weatherGateway } from "@/api/weatherGateway";
import type { TideResponse, GeocodeResponse, WeatherLiveResponse, WeatherForecastResponse } from "@/api/weatherGateway";

export interface WeatherService {
  getTide(): Promise<TideResponse>;
  reverseGeocode(payload: { location: string; extensions: "base" | "all" }): Promise<GeocodeResponse>;
  getWeather(payload: {
    city: string;
    extensions: "base" | "all";
  }): Promise<WeatherLiveResponse | WeatherForecastResponse>;
}

export const weatherService: WeatherService = {
  async getTide() {
    return weatherGateway.getTide();
  },

  async reverseGeocode(payload) {
    return weatherGateway.reverseGeocode(payload);
  },

  async getWeather(payload) {
    return weatherGateway.getWeather(payload);
  },
};
