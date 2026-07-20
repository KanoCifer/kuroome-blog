import request from '@/shared/api/request';
import type {
  TideData,
  WeatherDay,
  WeatherFullResponse,
  WeatherNow,
} from '@/features/fishing/types';

export interface TideResponse extends TideData {
  code: string;
}

export type { WeatherDay, WeatherFullResponse, WeatherNow };

export interface WeatherGateway {
  getTide(payload: { harbor: string; date: string }): Promise<TideResponse>;
  getWeatherFull(payload: {
    location: [number, number];
  }): Promise<WeatherFullResponse>;
}

export const weatherGateway: WeatherGateway = {
  async getTide(payload: {
    harbor: string;
    date: string;
  }): Promise<TideResponse> {
    const res = await request.get<{ data: TideResponse }>('v2/weather/tide', {
      params: payload,
    });
    return res.data.data;
  },

  async getWeatherFull(payload: {
    location: [number, number];
  }): Promise<WeatherFullResponse> {
    const [lng, lat] = payload.location;
    const res = await request.get<{ data: WeatherFullResponse }>(
      'v2/weather/full',
      {
        params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
      },
    );
    return res.data.data;
  },
};
