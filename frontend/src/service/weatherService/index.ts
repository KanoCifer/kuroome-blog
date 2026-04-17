import type { PoiItem, TideResponse, WeatherDay, WeatherNow } from "@/api/weatherGateway";
import { weatherGateway } from "@/api/weatherGateway";

export interface WeatherService {
  getTide(payload: { harbor: string; date: string }): Promise<TideResponse>;
  getPOI(payload: { location: [number, number] }): Promise<PoiItem | undefined>;
  getWeatherLive(payload: { location: [number, number] }): Promise<{ updateTime?: string; now?: WeatherNow }>;
  getWeatherForecast(payload: {
    location: [number, number];
    days: number;
  }): Promise<{ updateTime?: string; daily?: WeatherDay[] }>;
}

export const weatherService: WeatherService = {
  async getTide(payload: { harbor: string; date: string }): Promise<TideResponse> {
    return weatherGateway.getTide(payload);
  },

  async getPOI(payload: { location: [number, number] }): Promise<PoiItem | undefined> {
    const res = await weatherGateway.getPOI(payload);
    return res.poi?.[0];
  },

  async getWeatherLive(payload: { location: [number, number] }): Promise<{ updateTime?: string; now?: WeatherNow }> {
    const res = await weatherGateway.getWeatherLive(payload);
    return { updateTime: res.updateTime, now: res.now };
  },

  async getWeatherForecast(payload: {
    location: [number, number];
    days: number;
  }): Promise<{ updateTime?: string; daily?: WeatherDay[] }> {
    const res = await weatherGateway.getWeatherForecast(payload);
    return { updateTime: res.updateTime, daily: res.daily };
  },
};
