import type { AxiosResponse } from 'axios';

import request from '@/api/request';

import type {
  ApiEnvelope,
  FishingFeedbackPayload,
  FishingFeedbackResponse,
  FishingIndexData,
  SecurityKeyResponse,
  TideData,
  WeatherFullResponse,
} from './types';

export interface fishingMapGateway {
  getSecurityKey(): Promise<AxiosResponse<ApiEnvelope<SecurityKeyResponse>>>;
  getTide(payload?: {
    harbor: string;
    date: string;
  }): Promise<AxiosResponse<ApiEnvelope<TideData>>>;

  getWeatherFull(payload: {
    location: [number, number];
  }): Promise<AxiosResponse<ApiEnvelope<WeatherFullResponse>>>;

  getFishingIndex(payload: {
    location: [number, number];
  }): Promise<AxiosResponse<ApiEnvelope<FishingIndexData>>>;

  postFishingFeedback(
    payload: FishingFeedbackPayload,
  ): Promise<AxiosResponse<ApiEnvelope<FishingFeedbackResponse>>>;
}

export const fishingMapGateway = (): fishingMapGateway => {
  return {
    async getSecurityKey() {
      return request.get('v1/amap/security-key') as Promise<
        AxiosResponse<ApiEnvelope<SecurityKeyResponse>>
      >;
    },

    async getTide(payload?: { harbor: string; date: string }) {
      return request.get('v2/weather/tide', { params: payload }) as Promise<
        AxiosResponse<ApiEnvelope<TideData>>
      >;
    },

    async getWeatherFull(payload: { location: [number, number] }) {
      const [lng, lat] = payload.location;
      return request.get('v2/weather/full', {
        params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
      }) as Promise<AxiosResponse<ApiEnvelope<WeatherFullResponse>>>;
    },

    async getFishingIndex(payload: { location: [number, number] }) {
      const [lng, lat] = payload.location;
      return request.get('v2/fishing/index', {
        params: { location: `${lng.toFixed(2)},${lat.toFixed(2)}` },
      }) as Promise<AxiosResponse<ApiEnvelope<FishingIndexData>>>;
    },

    async postFishingFeedback(payload: FishingFeedbackPayload) {
      return request.post('v2/fishing/feedback', payload) as Promise<
        AxiosResponse<ApiEnvelope<FishingFeedbackResponse>>
      >;
    },
  };
};
