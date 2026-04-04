import { DEFAULT_TIDE_SPOT_NAME } from './constants';
import { fishingMapGateway } from './gateway';
import type {
  AnalysisPayload,
  SecurityKeyResponse,
  TideData,
  WeatherAndLocationData,
  WeatherForecastResponseData,
  WeatherLiveResponseData,
} from './types';

interface AnalysisChunk {
  content?: string;
}

export interface FishingMapService {
  getSecurityJsCode(): Promise<string>;
  fetchWeatherAndLocation(
    location: [number, number],
  ): Promise<WeatherAndLocationData>;
  fetchTideData(): Promise<{ tideData: TideData; tideSpotName: string }>;
  generateAnalysis(
    payload: AnalysisPayload,
    onChunk: (content: string) => void,
    signal?: AbortSignal,
  ): Promise<void>;
}

const weatherError = (reason: string): Error => new Error(reason);

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

    async fetchWeatherAndLocation(
      location: [number, number],
    ): Promise<WeatherAndLocationData> {
      const locationString = `${location[0]},${location[1]}`;
      const regeoResponse = await gateway.getRegeo({
        location: locationString,
        extensions: 'base',
      });

      const regeoData = regeoResponse.data.data;
      const adcode = regeoData?.regeocode?.addressComponent?.adcode;
      if (regeoData?.status !== '1' || !adcode) {
        throw weatherError('无法获取城市编码');
      }

      const liveResponse = await gateway.getWeather({
        city: adcode,
        extensions: 'base',
      });
      const liveData = liveResponse.data.data as WeatherLiveResponseData;
      if (liveData.status !== '1' || !liveData.lives?.length) {
        throw weatherError('无法获取实时天气');
      }

      const liveWeather = liveData.lives[0];
      const locationName = liveWeather.city || '钓鱼地点';

      const forecastResponse = await gateway.getWeather({
        city: adcode,
        extensions: 'all',
      });
      const forecastData = forecastResponse.data
        .data as WeatherForecastResponseData;
      const forecasts =
        forecastData.status === '1' && forecastData.forecasts?.length
          ? (forecastData.forecasts[0]?.casts ?? [])
          : [];

      return {
        liveWeather,
        forecasts,
        locationName,
      };
    },

    async fetchTideData(): Promise<{
      tideData: TideData;
      tideSpotName: string;
    }> {
      const response = await gateway.getTide();
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
  };
};
