import { create } from 'zustand';

import { useNotificationStore } from '@/stores/notificationState';

import { fishingMapService } from '@/views/FishingMap/service';
import type {
  FishingIndexData,
  TideData,
  WeatherDay,
  WeatherIndex,
  WeatherNow,
} from '@/views/FishingMap/types';

export const HARBOR_OPTIONS = [
  { code: 'P2352', name: '黄埔港' },
  { code: 'P2932', name: '舢舨洲' },
  { code: 'P2299', name: '南沙港' },
  { code: 'P2474', name: '海沁' },
  { code: 'P2609', name: '东沙' },
] as const;

export interface FishingMapState {
  // weather
  liveWeather: WeatherNow | null;
  forecasts: WeatherDay[];
  locationName: string;
  weatherLoading: boolean;
  weatherError: string;
  weatherIndices: WeatherIndex[];

  // tide
  tideData: TideData | null;
  // fishing index
  indexData: FishingIndexData | null;
  indexLoading: boolean;
  indexError: string;

  fetchWeatherAndFishing: (location: [number, number]) => Promise<void>;
}

const notifyError = (msg: string) => {
  useNotificationStore.getState().error(msg);
};

// 创建 store
export const useFishingMapStore = create<FishingMapState>((set) => ({
  // 初始状态
  liveWeather: null,
  forecasts: [],
  locationName: '',
  weatherLoading: false,
  weatherError: '',
  indexData: null,
  indexLoading: false,
  indexError: '',
  weatherIndices: [],
  tideData: null,

  // actions
  fetchWeatherAndFishing: async (location: [number, number]) => {
    const service = fishingMapService();
    set({
      weatherLoading: true,
      indexLoading: true,
      weatherError: '',
      indexError: '',
    });
    try {
      const [weatherRes, indexRes] = await Promise.all([
        service.fetchWeatherFull({ location }),
        service.fetchFishingIndex({ location }),
      ]);
      set({
        liveWeather: weatherRes.now ?? null,
        forecasts: weatherRes.daily ?? [],
        locationName: weatherRes.locationName,
        indexData: indexRes,
        weatherIndices: weatherRes.indices,
        tideData: weatherRes.tideData,
        weatherLoading: false,
        indexLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取数据失败';
      notifyError(msg);
      set({
        weatherError: msg,
        indexError: msg,
        weatherLoading: false,
        indexLoading: false,
      });
    }
  },
}));
