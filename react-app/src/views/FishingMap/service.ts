import { fishingMapGateway } from './gateway';
import type {
  AnalysisPayload,
  FishingFeedbackPayload,
  FishingFeedbackResponse,
  FishingIndexData,
  SecurityKeyResponse,
  TideData,
  WeatherDay,
  WeatherFullResponse,
  WeatherIndex,
  WeatherNow,
} from './types';

interface AnalysisChunk {
  content?: string;
}

export interface FishingMapService {
  getSecurityJsCode(): Promise<string>;
  generateAnalysis(
    payload: AnalysisPayload,
    onChunk: (content: string) => void,
    signal?: AbortSignal,
  ): Promise<void>;

  getTide(payload: { harbor: string; date: string }): Promise<TideData>;

  fetchWeatherFull(payload: { location: [number, number] }): Promise<{
    updateTime?: string;
    now?: WeatherNow;
    daily?: WeatherDay[];
    locationName: string;
    indices: WeatherIndex[];
    tideData: TideData | null;
  }>;

  fetchFishingIndex(payload: {
    location: [number, number];
  }): Promise<FishingIndexData>;

  submitFishingFeedback(
    payload: FishingFeedbackPayload,
  ): Promise<FishingFeedbackResponse>;
}

export const fishingMapService = (): FishingMapService => {
  const gateway = fishingMapGateway();

  return {
    async getTide(payload: {
      harbor: string;
      date: string;
    }): Promise<TideData> {
      const res = await gateway.getTide(payload);
      return res.data.data;
    },

    async getSecurityJsCode(): Promise<string> {
      const securityResponse = await gateway.getSecurityKey();
      const encodedKey =
        (securityResponse.data.data as SecurityKeyResponse | undefined)
          ?.securityJsCode ?? '';
      return encodedKey ? atob(encodedKey) : '';
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

    async fetchWeatherFull(payload: { location: [number, number] }): Promise<{
      updateTime?: string;
      now?: WeatherNow;
      daily?: WeatherDay[];
      locationName: string;
      indices: WeatherIndex[];
      tideData: TideData | null;
    }> {
      const weatherRes = await gateway.getWeatherFull(payload);

      const data = weatherRes.data.data as WeatherFullResponse | undefined;
      const now = data?.current?.now;
      const daily = data?.daily?.daily;
      const updateTime = data?.current?.updateTime ?? data?.daily?.updateTime;
      const locationName = data?.locationName ?? '未知地点';
      const tideData = data?.tide ?? null;
      const indices = data?.indices?.daily ?? [];

      return {
        updateTime,
        now,
        daily,
        locationName,
        indices,
        tideData,
      };
    },

    async fetchFishingIndex(payload: {
      location: [number, number];
    }): Promise<FishingIndexData> {
      const res = await gateway.getFishingIndex(payload);
      return res.data.data;
    },

    async submitFishingFeedback(
      payload: FishingFeedbackPayload,
    ): Promise<FishingFeedbackResponse> {
      const res = await gateway.postFishingFeedback(payload);
      return res.data.data;
    },
  };
};
