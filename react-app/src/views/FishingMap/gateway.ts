import type { AxiosResponse } from 'axios';

import request from '@/api/request';

import type {
  ApiEnvelope,
  PoiResponse,
  RegeoResponseData,
  SecurityKeyResponse,
  TideData,
  WeatherForecastResponse,
  WeatherLiveResponse,
} from './types';

interface RegeoRequestPayload {
  location: string;
  extensions: 'base';
}

export interface fishingMapGateway {
  getSecurityKey(): Promise<AxiosResponse<ApiEnvelope<SecurityKeyResponse>>>;
  getRegeo(
    payload: RegeoRequestPayload,
  ): Promise<AxiosResponse<ApiEnvelope<RegeoResponseData>>>;
  getTide(payload?: {
    harbor: string;
    date: string;
  }): Promise<AxiosResponse<ApiEnvelope<TideData>>>;

  getWeatherForecast(payload: {
    location: [number, number];
    days: number;
  }): Promise<AxiosResponse<ApiEnvelope<WeatherForecastResponse>>>;

  getWeatherLive(payload: {
    location: [number, number];
  }): Promise<AxiosResponse<ApiEnvelope<WeatherLiveResponse>>>;

  getPOI(payload: {
    location: [number, number];
  }): Promise<AxiosResponse<ApiEnvelope<PoiResponse>>>;
}

export const fishingMapGateway = (): fishingMapGateway => {
  return {
    async getSecurityKey() {
      return request.get('v1/amap/security-key') as Promise<
        AxiosResponse<ApiEnvelope<SecurityKeyResponse>>
      >;
    },

    async getRegeo(payload: RegeoRequestPayload) {
      return request.post('v1/geocode/regeo', payload) as Promise<
        AxiosResponse<ApiEnvelope<RegeoResponseData>>
      >;
    },

    async getTide(payload?: { harbor: string; date: string }) {
      return request.get('v1/qweather/tide', { params: payload }) as Promise<
        AxiosResponse<ApiEnvelope<TideData>>
      >;
    },

    async getWeatherForecast(payload: {
      location: [number, number];
      days: number;
    }) {
      const [lng, lat] = payload.location;
      const params = { location: `${lng.toFixed(2)},${lat.toFixed(2)}` };

      return request.get(`v1/weather/${payload.days}`, {
        params: params,
      }) as Promise<AxiosResponse<ApiEnvelope<WeatherForecastResponse>>>;
    },

    async getWeatherLive(payload: { location: [number, number] }) {
      const [lng, lat] = payload.location;
      return request.get('v1/weather/now', {
        params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
      }) as Promise<AxiosResponse<ApiEnvelope<WeatherLiveResponse>>>;
    },

    async getPOI(payload: { location: [number, number] }) {
      const [lng, lat] = payload.location;
      return request.get('v1/geo/v2/poi/lookup', {
        params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
      }) as Promise<AxiosResponse<ApiEnvelope<PoiResponse>>>;
    },
  };
};
