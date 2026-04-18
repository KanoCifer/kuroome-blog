import { create } from 'zustand';

import { useNotificationStore } from '@/stores/notificationState';

import { fishingMapService } from '@/views/FishingMap/service';
import type {
  FishingIndexData,
  TideData,
  WeatherDay,
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
  // tide
  tideData: TideData | null;
  tideSpotName: string;
  tideHarbor: string;
  tideDate: string;
  tideLoading: boolean;
  tideError: string;
  // fishing index
  indexData: FishingIndexData | null;
  indexLoading: boolean;
  indexError: string;

  fetchWeatherAndFishing: (location: [number, number]) => Promise<void>;
  fetchTide: (harbor?: string, date?: string) => Promise<void>;
  setTideHarbor: (harbor: string) => void;
  setTideDate: (date: string) => void;
}

const notifyError = (msg: string) => {
  useNotificationStore.getState().error(msg);
};

export const useFishingMapStore = create<FishingMapState>((set, get) => ({
  liveWeather: null,
  forecasts: [],
  locationName: '',
  weatherLoading: false,
  weatherError: '',
  tideData: null,
  tideSpotName: '黄埔港',
  tideHarbor: 'P2352',
  tideDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
  tideLoading: false,
  tideError: '',
  indexData: null,
  indexLoading: false,
  indexError: '',

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

  fetchTide: async (harbor?: string, date?: string) => {
    const { tideHarbor: h, tideDate: d } = get();
    const harborCode = harbor ?? h;
    const dateVal = date ?? d;
    const service = fishingMapService();
    set({ tideLoading: true, tideError: '' });
    try {
      const result = await service.fetchTideData({
        harbor: harborCode,
        date: dateVal,
      });
      const harborOption = HARBOR_OPTIONS.find((o) => o.code === harborCode);
      set({
        tideData: result.tideData,
        tideSpotName: harborOption?.name ?? '黄埔港',
        tideHarbor: harborCode,
        tideDate: dateVal,
        tideLoading: false,
      });
    } catch {
      notifyError('获取潮汐信息失败');
      set({ tideError: '获取潮汐信息失败', tideLoading: false });
    }
  },

  setTideHarbor: (harbor: string) => {
    set({ tideHarbor: harbor });
    void get().fetchTide(harbor, undefined);
  },

  setTideDate: (date: string) => {
    set({ tideDate: date });
    void get().fetchTide(undefined, date);
  },
}));
