import { weatherGateway } from "@/api/weatherGateway";

export interface WeatherService {
  getTide(): Promise<{ tides?: Array<{ time: string; height: number }> }>;
  reverseGeocode(payload: {
    location: string;
    extensions: "base" | "all";
  }): Promise<{ address: string; location?: { lat: number; lng: number } }>;
  getWeather(payload: {
    city: string;
    extensions: "base" | "all";
  }): Promise<{ now?: { temp: string; text: string; windDir: string; humidity: string } }>;
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
