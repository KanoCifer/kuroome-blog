import { fishingService } from '@/service/fishingService';
import { weatherService } from '@/service/weatherService';
import { useNotificationStore } from '@/stores/notification';
import type {
  FishingIndexData,
  TideData,
  WeatherDay,
  WeatherFullResponse,
  WeatherHourly,
  WeatherIndex,
  WeatherNow,
} from '@/views/fishing/types';
import dayjs from 'dayjs';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const DEFAULT_MAP_CENTER: [number, number] = [113.389549, 23.050067];

export const HARBOR_OPTIONS = [
  { code: 'P2352', name: '黄埔港' },
  { code: 'P2932', name: '舢舨洲' },
  { code: 'P2299', name: '南沙港' },
  { code: 'P2474', name: '海沁' },
  { code: 'P2609', name: '东沙' },
] as const;

export const useFishingMapStore = defineStore('fishingMap', () => {
  const notifier = useNotificationStore();

  let fetchSeq = 0;

  const fullWeatherData = ref<WeatherFullResponse | null>(null);
  const liveWeather = ref<WeatherNow | null>(null);
  const forecasts = ref<WeatherDay[]>([]);
  const weatherHourly = ref<WeatherHourly[]>([]);
  const locationName = ref('');
  const weatherIndices = ref<WeatherIndex[]>([]);
  const tideData = ref<TideData | null>(null);

  const weatherLoading = ref(false);
  const weatherError = ref('');

  const indexData = ref<FishingIndexData | null>(null);
  const indexLoading = ref(false);
  const indexError = ref('');

  const panelTideData = ref<TideData | null>(null);
  const panelTideSpotName = ref('黄埔港');
  const tideLoading = ref(false);
  const selectedHarbor = ref('P2352');
  const selectedDate = ref(dayjs().format('YYYYMMDD'));

  async function fetchWeatherAndFishing(
    location: [number, number],
  ): Promise<void> {
    const seq = ++fetchSeq;
    weatherLoading.value = true;
    indexLoading.value = true;
    weatherError.value = '';
    indexError.value = '';

    try {
      const [weatherRes, fishingIndex] = await Promise.all([
        weatherService.fetchWeatherFull({ location }),
        fishingService.fetchFishingIndex({ location }),
      ]);

      if (seq !== fetchSeq) return;

      fullWeatherData.value = weatherRes.fullWeatherData;
      liveWeather.value = weatherRes.now ?? null;
      forecasts.value = weatherRes.daily ?? [];
      weatherHourly.value = weatherRes.hourly ?? [];
      locationName.value = weatherRes.locationName;
      weatherIndices.value = weatherRes.indices;
      tideData.value = weatherRes.tideData;
      indexData.value = fishingIndex;
    } catch (err) {
      if (seq !== fetchSeq) return;
      const message =
        err instanceof Error ? err.message : '获取钓鱼地图数据失败';
      weatherError.value = message;
      indexError.value = message;
      notifier.error(message);
    } finally {
      if (seq === fetchSeq) {
        weatherLoading.value = false;
        indexLoading.value = false;
      }
    }
  }

  async function fetchPanelTide(
    harbor = selectedHarbor.value,
    date = selectedDate.value,
  ): Promise<void> {
    tideLoading.value = true;
    try {
      const res = await weatherService.getTide({ harbor, date });
      panelTideData.value = {
        updateTime: res.updateTime,
        tideTable: res.tideTable,
        tideHourly: res.tideHourly,
      };
      panelTideSpotName.value =
        HARBOR_OPTIONS.find((option) => option.code === harbor)?.name ??
        '黄埔港';
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '获取潮汐信息失败，请稍后再试';
      notifier.error(message);
    } finally {
      tideLoading.value = false;
    }
  }

  function setSelectedHarbor(harbor: string): void {
    selectedHarbor.value = harbor;
    void fetchPanelTide(harbor, selectedDate.value);
  }

  function setSelectedDate(date: string): void {
    selectedDate.value = date;
    void fetchPanelTide(selectedHarbor.value, date);
  }

  return {
    fullWeatherData,
    liveWeather,
    forecasts,
    weatherHourly,
    locationName,
    weatherIndices,
    tideData,
    weatherLoading,
    weatherError,
    indexData,
    indexLoading,
    indexError,
    panelTideData,
    panelTideSpotName,
    tideLoading,
    selectedHarbor,
    selectedDate,
    fetchWeatherAndFishing,
    fetchPanelTide,
    setSelectedHarbor,
    setSelectedDate,
  };
});
