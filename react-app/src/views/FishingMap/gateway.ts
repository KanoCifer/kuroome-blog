import type { AxiosResponse } from 'axios';

import request from '@/api/request';

import type {
  ApiEnvelope,
  FishingFeedbackPayload,
  FishingFeedbackResponse,
  FishingIndexData,
  RegeoResponseData,
  SecurityKeyResponse,
  TideData,
  WeatherFullResponse,
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

    async getWeatherFull(payload: { location: [number, number] }) {
      const [lng, lat] = payload.location;
      return request.get('v1/weather/full', {
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
