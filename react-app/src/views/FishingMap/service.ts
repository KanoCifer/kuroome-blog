import { DEFAULT_TIDE_SPOT_NAME } from './constants';
import { fishingMapGateway } from './gateway';
import type {
  AnalysisPayload,
  PoiItem,
  PoiResponse,
  SecurityKeyResponse,
  TideData,
  WeatherDay,
  WeatherForecastResponse,
  WeatherLiveResponse,
  WeatherNow,
} from './types';

interface AnalysisChunk {
  content?: string;
}

export interface FishingMapService {
  getSecurityJsCode(): Promise<string>;
  fetchTideData(payload?: {
    harbor: string;
    date: string;
  }): Promise<{ tideData: TideData; tideSpotName: string }>;
  generateAnalysis(
    payload: AnalysisPayload,
    onChunk: (content: string) => void,
    signal?: AbortSignal,
  ): Promise<void>;

  fetchWeatherForecast(payload: {
    location: [number, number];
    days: number;
  }): Promise<{ updateTime?: string; daily?: WeatherDay[] }>;
  fetchWeatherLive(payload: {
    location: [number, number];
  }): Promise<{ updateTime?: string; now?: WeatherNow }>;
  fetchPOI(payload: {
    location: [number, number];
  }): Promise<PoiItem | undefined>;
}

export const fishingMapService = (): FishingMapService => {
  const gateway = fishingMapGateway();

  return {
    async getSecurityJsCode(): Promise<string> {
      const securityResponse = await gateway.getSecurityKey();
      const encodedKey =
        (securityResponse.data.data as SecurityKeyResponse | undefined)
          ?.securityJsCode ?? '';
      return encodedKey ? atob(encodedKey) : '';
    },

    async fetchTideData(payload?: { harbor: string; date: string }): Promise<{
      tideData: TideData;
      tideSpotName: string;
    }> {
      const response = await gateway.getTide(payload);
      return {
        tideData: response.data.data,
        tideSpotName: DEFAULT_TIDE_SPOT_NAME,
      };
    },

    async generateAnalysis(
      payload: AnalysisPayload,
      onChunk: (content: string) => void,
      signal?: AbortSignal,
    ): Promise<void> {
      const response = await fetch('/api/v1/llm/weather-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ weather_data: payload }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`AI 服务异常: HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('AI 响应不可读');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          if (!chunk.startsWith('data:')) {
            continue;
          }

          const payloadText = chunk.replace(/^data:\s*/, '').trim();
          if (payloadText === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(payloadText) as AnalysisChunk;
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch {
            continue;
          }
        }
      }
    },

    async fetchWeatherForecast(payload: {
      location: [number, number];
      days: number;
    }): Promise<{ updateTime?: string; daily?: WeatherDay[] }> {
      const res = await gateway.getWeatherForecast(payload);
      const data = res.data.data as WeatherForecastResponse | undefined;
      const updateTime = data?.updateTime;
      const daily = data?.daily;

      return { updateTime, daily };
    },

    async fetchWeatherLive(payload: {
      location: [number, number];
    }): Promise<{ updateTime?: string; now?: WeatherNow }> {
      const res = await gateway.getWeatherLive(payload);
      const data = res.data.data as WeatherLiveResponse | undefined;
      const updateTime = data?.updateTime;
      const now = data?.now;

      return { updateTime, now };
    },

    async fetchPOI(payload: {
      location: [number, number];
    }): Promise<PoiItem | undefined> {
      const res = await gateway.getPOI(payload);
      const data = res.data.data as PoiResponse | undefined;
      const poi = data?.poi?.[0];
      return poi;
    },
  };
};
