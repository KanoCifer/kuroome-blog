import { fishingGateway } from '@/api/fishing';
import { weatherGateway } from '@/api/fishing';
import { useNotificationStore } from '@/stores/notification';
import { useSequencedTask } from '@/composables/shared';
import type { FishingIndexData } from '@/types/fishing';
import type {
  TideData,
  WeatherDay,
  WeatherFullResponse,
  WeatherHourly,
  WeatherIndex,
  WeatherNow,
} from '@/types/weather';
import { defineStore } from 'pinia';
import { ref } from 'vue';

function resolveLocationName(
  fullData: WeatherFullResponse | undefined,
  now: WeatherNow | undefined,
): string {
  const directName = fullData?.locationName?.trim();
  const hourlyName = (
    fullData?.hourly as { locationName?: string } | undefined
  )?.locationName?.trim();
  if (directName) return directName;
  if (hourlyName) return hourlyName;
  return now?.text ? '当前位置' : '钓鱼地点';
}

export const DEFAULT_MAP_CENTER: [number, number] = [113.389549, 23.050067];

/**
 * 钓鱼仪表盘的主数据流：位置 → 拉一次 weather/full + fishing/index → 渲染各 tile。
 *
 * TidePanel（手动选 harbor/date）有独立的状态机，搬到 stores/tidePanel.ts。
 */
export const useFishingMapStore = defineStore('fishingMap', () => {
  const notifier = useNotificationStore();

  // 「最新调用胜出」竞态守卫：旧 fetch 的回写被吞掉
  const fetchSeq = useSequencedTask();

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

  async function fetchWeatherAndFishing(
    location: [number, number],
  ): Promise<void> {
    const mine = fetchSeq.begin();
    weatherLoading.value = true;
    indexLoading.value = true;
    weatherError.value = '';
    indexError.value = '';

    try {
      const [data, fishingIndex] = await Promise.all([
        weatherGateway.getWeatherFull({ location }),
        fishingGateway.getFishingIndex({ location }),
      ]);

      if (!fetchSeq.isActive(mine)) return;

      const now = data.current?.now;
      const daily = data.daily?.daily;
      const hourlyWrapper = data.hourly as
        | { hourly?: WeatherHourly[] }
        | undefined;
      const hourly = hourlyWrapper?.hourly ?? [];

      fullWeatherData.value = data;
      liveWeather.value = now ?? null;
      forecasts.value = daily ?? [];
      weatherHourly.value = hourly;
      locationName.value = resolveLocationName(data, now);
      weatherIndices.value = data.indices?.daily ?? [];
      tideData.value = data.tide ?? null;
      indexData.value = fishingIndex;
    } catch (err) {
      if (!fetchSeq.isActive(mine)) return;
      const message =
        err instanceof Error ? err.message : '获取钓鱼地图数据失败';
      weatherError.value = message;
      indexError.value = message;
      notifier.error(message);
    } finally {
      if (fetchSeq.isActive(mine)) {
        weatherLoading.value = false;
        indexLoading.value = false;
      }
    }
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
    fetchWeatherAndFishing,
  };
});
