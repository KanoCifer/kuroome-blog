import type { AxiosResponse } from 'axios';

import request from '@/api/request';

import type {
  ApiEnvelope,
  RegeoResponseData,
  SecurityKeyResponse,
  TideData,
  WeatherForecastResponseData,
  WeatherLiveResponseData,
} from './types';

interface WeatherRequestPayload {
  city: string;
  extensions: 'base' | 'all';
}

interface RegeoRequestPayload {
  location: string;
  extensions: 'base';
}

export interface fishingMapGateway {
  getSecurityKey(): Promise<AxiosResponse<ApiEnvelope<SecurityKeyResponse>>>;
  getRegeo(
    payload: RegeoRequestPayload,
  ): Promise<AxiosResponse<ApiEnvelope<RegeoResponseData>>>;
  getWeather(
    payload: WeatherRequestPayload,
  ): Promise<
    AxiosResponse<
      ApiEnvelope<WeatherLiveResponseData | WeatherForecastResponseData>
    >
  >;
  getTide(payload?: {
    harbor: string;
    date: string;
  }): Promise<AxiosResponse<ApiEnvelope<TideData>>>;
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

    async getWeather(payload: WeatherRequestPayload) {
      return request.post('v1/weather', payload) as Promise<
        AxiosResponse<
          ApiEnvelope<WeatherLiveResponseData | WeatherForecastResponseData>
        >
      >;
    },

    async getTide(payload?: { harbor: string; date: string }) {
      return request.get('v1/qweather/tide', { params: payload }) as Promise<
        AxiosResponse<ApiEnvelope<TideData>>
      >;
    },
  };
};
