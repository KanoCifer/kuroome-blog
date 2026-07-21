import { create } from 'zustand';

import dayjs from 'dayjs';

import { useNotificationStore } from '@/stores/notificationState';
import type { MapMarker } from '@/types/marker';

import { fishingMapService } from '@/features/fishing/api/service';
import { fishingSpotsGateway } from '@/features/fishing/api/fishingSpotsGateway';
import { toMapMarkers } from '@/features/fishing/types';
import type {
  FishingIndexData,
  TideData,
  WeatherDay,
  WeatherHourly,
  WeatherIndex,
  WeatherNow,
} from '@/features/fishing/types';

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

  // 小时天气预报
  weatherHourly: WeatherHourly[];

  // tide (from weather full)
  tideData: TideData | null;

  // panel tide (selectable harbor / date)
  panelTideData: TideData | null;
  panelTideSpotName: string;
  tideLoading: boolean;
  selectedHarbor: string;
  selectedDate: string;

  // fishing index
  indexData: FishingIndexData | null;
  indexLoading: boolean;
  indexError: string;

  // 钓点标记（后端获取，对齐 frontend fishingSpotsGateway.list）
  markers: MapMarker[];
  spotsLoading: boolean;
  spotsError: string;

  fetchWeatherAndFishing: (location: [number, number]) => Promise<void>;
  fetchPanelTide: (harbor?: string, date?: string) => Promise<void>;
  setSelectedHarbor: (harbor: string) => void;
  setSelectedDate: (date: string) => void;
  fetchSpots: () => Promise<void>;
  setMarkers: (
    updater: MapMarker[] | ((prev: MapMarker[]) => MapMarker[]),
  ) => void;
}

const notifyError = (msg: string) => {
  useNotificationStore.getState().error(msg);
};

// 创建 store
export const useFishingMapStore = create<FishingMapState>((set, get) => ({
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

  // 小时天气预报初始状态
  weatherHourly: [],

  // panel tide 初始状态
  panelTideData: null,
  panelTideSpotName: '黄埔港',
  tideLoading: false,
  selectedHarbor: 'P2352',
  selectedDate: dayjs().format('YYYYMMDD'),

  // 钓点标记初始状态
  markers: [],
  spotsLoading: false,
  spotsError: '',

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
        weatherHourly: weatherRes.hourly ?? [],
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

  fetchPanelTide: async (harbor?: string, date?: string) => {
    const { selectedHarbor: currentHarbor, selectedDate: currentDate } = get();
    const harborToUse = harbor ?? currentHarbor;
    const dateToUse = date ?? currentDate;
    set({ tideLoading: true });
    try {
      const service = fishingMapService();
      const res = await service.getTide({
        harbor: harborToUse,
        date: dateToUse,
      });
      const harborOption = HARBOR_OPTIONS.find((o) => o.code === harborToUse);
      set({
        panelTideData: res,
        panelTideSpotName: harborOption?.name ?? '黄埔港',
        tideLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取潮汐信息失败';
      notifyError(msg);
      set({ tideLoading: false });
    }
  },

  setSelectedHarbor: (harbor: string) => {
    set({ selectedHarbor: harbor });
    void get().fetchPanelTide(harbor, get().selectedDate);
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    void get().fetchPanelTide(get().selectedHarbor, date);
  },

  // 钓点标记：从后端获取，对齐 frontend fishingSpotsGateway.list + toMapMarkers
  fetchSpots: async () => {
    set({ spotsLoading: true, spotsError: '' });
    try {
      const spots = await fishingSpotsGateway.list();
      set({ markers: toMapMarkers(spots), spotsLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载钓点失败';
      notifyError(msg);
      set({ spotsError: msg, spotsLoading: false });
    }
  },

  setMarkers: (updater) => {
    set((state) => ({
      markers:
        typeof updater === 'function'
          ? (updater as (prev: MapMarker[]) => MapMarker[])(state.markers)
              : updater,
    }));
  },
}));
