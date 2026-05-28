<template>
  <BasicDetail title="钓鱼地图" subtitle="探索钓鱼地点和钓点信息">
    <div class="col-span-1 sm:col-span-2 lg:col-span-3">
      <!-- Route Info -->
      <div class="mb-4 min-h-21.5">
        <div
          v-if="isPlanningRoute"
          class="flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20"
        >
          <svg
            class="h-5 w-5 animate-spin text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span class="text-blue-600 dark:text-blue-400">
            正在规划路线...
          </span>
        </div>

        <div
          v-else-if="routeInfo"
          class="squircle overflow-hidden border border-gray-200/60 bg-white/30 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">
                路线信息
              </h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                距离:
                {{
                  routeInfo.distance < 1000
                    ? `${Math.round(routeInfo.distance)} 米`
                    : `${(routeInfo.distance / 1000).toFixed(1)} 公里`
                }}
                <span class="mx-2">|</span>
                时间:
                {{
                  routeInfo.time < 3600
                    ? `${Math.round(routeInfo.time / 60)} 分钟`
                    : `${Math.floor(routeInfo.time / 3600)} 小时 ${Math.round((routeInfo.time % 3600) / 60)} 分钟`
                }}
              </p>
            </div>
            <button
              class="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              @click="handleClearRoute"
            >
              清除路线
            </button>
          </div>
        </div>
        <div
          v-else
          class="squircle overflow-hidden border border-gray-200/60 bg-white/30 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
        >
          <p class="text-sm text-gray-600 dark:text-gray-400">
            点击地图上的钓点标记，自动规划从您当前位置到钓点的路线
          </p>
        </div>
      </div>
      <!-- Map Container -->
      <div
        class="squircle relative overflow-hidden border border-gray-200/60 bg-white/30 shadow-md dark:border-gray-800 dark:bg-gray-900/70"
      >
        <MapContainer
          ref="mapContainerRef"
          :center="DEFAULT_MAP_CENTER"
          :zoom="13"
          :markers="fishingSpots"
          :show-tool-bar="true"
          :show-scale="true"
          :show-geolocation="true"
          @marker-click="handleMarkerClick"
          @map-ready="handleMapReady"
        />
      </div>

      <!-- Map Controls and Info -->
      <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TideCard />
        <WeatherCard :location="activeLocation" />
        <FishingIndexCard
          :location="activeLocation"
          @feedback-click="handleFeedbackClick"
        />
        <HourlyWeather />
      </div>
    </div>

    <FishingFeedbackForm
      v-if="feedbackOpen && currentFishingData"
      :is-open="feedbackOpen"
      :fishing-data="currentFishingData"
      :location-id="feedbackLocationId"
      :location-name="feedbackLocationName"
      @cancel="feedbackOpen = false"
      @success="handleFeedbackSuccess"
    />

    <!-- Floating AI Analysis -->
    <div class="fixed right-6 bottom-0 z-50">
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 scale-95"
      >
        <div
          v-show="analysisOpen"
          class="relative mb-4 w-90 max-w-[85vw] origin-bottom-right sm:w-105"
        >
          <div class="absolute top-4 right-4 z-10">
            <button
              class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow-sm backdrop-blur hover:bg-white dark:bg-gray-800/80 dark:text-gray-200"
              @click="analysisOpen = false"
              aria-label="关闭分析"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <WeatherAnalysis
            :weather_data="analysisPayload"
            :autoAnalyze="analysisOpen"
          />
        </div>
      </transition>
    </div>
    <button
      class="group squircle fixed right-8 bottom-40 flex h-14 w-14 items-center justify-center border border-white/40 bg-linear-to-br from-slate-900/90 to-slate-700/80 text-white shadow-lg backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl dark:border-gray-700/60 dark:from-gray-100 dark:to-gray-300 dark:text-gray-900"
      @click="analysisOpen = !analysisOpen"
    >
      <span
        class="absolute -top-1 -right-1 flex h-3 w-3"
        v-if="analysisHasData"
      >
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"
        ></span>
        <span
          class="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"
        ></span>
      </span>
      <Bot class="h-6 w-6" />
    </button>
  </BasicDetail>
</template>

<script setup lang="ts">
import WeatherAnalysis from '@/components/ai/WeatherAnalysis.vue';
import BasicDetail from '@/components/basic/BasicDetail.vue';
import MapContainer from '@/components/basic/MapContainer.vue';
import TideCard from '@/components/map/TideCard.vue';
import WeatherCard from '@/components/map/WeatherCard.vue';
import fishingSpotsData from '@/data/fishing-spots.json';
import { DEFAULT_MAP_CENTER, useFishingMapStore } from '@/stores/fishingMap';
import FishingFeedbackForm from '@/views/fishing/components/FishingFeedbackForm.vue';
import FishingIndexCard from '@/views/fishing/components/FishingIndexCard.vue';
import type {
  FishingFeedbackData,
  FishingIndexData,
} from '@/views/fishing/types';
import { Bot } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import HourlyWeather from './components/HourlyWeather.vue';

export interface AMapMarker {
  position: [number, number];
  content?: string;
  offset?: unknown;
}

interface MapContainerInstance {
  planRoute: (
    start: [number, number],
    end: [number, number],
  ) => Promise<{ distance: number; time: number }>;
  clearRoute: () => void;
  getCurrentPosition: () => Promise<[number, number]>;
}

// 钓点数据
const fishingSpots = ref<AMapMarker[]>(fishingSpotsData as AMapMarker[]);
const mapContainerRef = useTemplateRef<MapContainerInstance>('mapContainerRef');
const fishingMapStore = useFishingMapStore();
const {
  liveWeather,
  forecasts,
  tideData,
  weatherIndices,
  locationName,
  indexData,
} = storeToRefs(fishingMapStore);
const userPosition = ref<[number, number] | null>(null);
const activeLocation = computed<[number, number]>(
  () => userPosition.value ?? DEFAULT_MAP_CENTER,
);
const tideSpotName = ref('黄埔港');

// 路线规划状态
const isPlanningRoute = ref(false);
const routeInfo = ref<{ distance: number; time: number } | null>(null);
const selectedSpotIndex = ref<number | null>(null);

const analysisOpen = ref(false);

const feedbackOpen = ref(false);
const feedbackLocationId = ref('default');
const feedbackLocationName = ref('钓鱼地点');
const currentFishingData = ref<FishingFeedbackData | null>(null);

const analysisPayload = computed(() => {
  if (!liveWeather.value && forecasts.value.length === 0 && !tideData.value) {
    return null;
  }
  return {
    liveWeather: liveWeather.value,
    forecasts: forecasts.value,
    tideData: tideData.value,
    weatherIndices: weatherIndices.value,
    fishingIndex: indexData.value ?? undefined,
    locationName: locationName.value,
    tideSpotName: tideSpotName.value,
  };
});

const analysisHasData = computed(
  () =>
    liveWeather.value !== null ||
    forecasts.value.length > 0 ||
    tideData.value !== null,
);

const handleFeedbackClick = (data: FishingIndexData) => {
  const windLevel = liveWeather.value
    ? Math.min(
        3,
        Math.max(1, Math.ceil((Number(liveWeather.value.windScale) || 1) / 3)),
      )
    : 1;

  let tideLevel = 1.5;
  let tideType: '涨潮' | '退潮' | undefined = undefined;
  let tideRange = 1.5;
  let hoursToNextTide = 3.0;

  if (tideData.value?.tideTable?.length) {
    const currentTide = tideData.value.tideTable[0];
    const nextTide = tideData.value.tideTable[1];

    tideType = currentTide.type === 'H' ? '退潮' : '涨潮';
    tideLevel = Number(currentTide.height ?? 1.5);

    if (nextTide) {
      const nextLevel = Number(nextTide.height ?? 1.5);
      tideRange = Math.abs(nextLevel - tideLevel);
      const currentTime = new Date(currentTide.fxTime).getTime();
      const nextTime = new Date(nextTide.fxTime).getTime();
      hoursToNextTide =
        Number.isFinite(currentTime) && Number.isFinite(nextTime)
          ? (nextTime - currentTime) / (1000 * 60 * 60)
          : 3.0;
    }
  }

  currentFishingData.value = {
    fishing_index: data.fishing_index,
    level: data.level,
    temperature: Number(liveWeather.value?.temp ?? 20),
    humidity: Number(liveWeather.value?.humidity ?? 50),
    pressure: Number(liveWeather.value?.pressure) || 1013,
    wind_speed: Number(liveWeather.value?.windSpeed) || 0,
    precipitation: Number(liveWeather.value?.precip) || 0,
    indices: windLevel,
    tide_level: tideLevel,
    tide_type: tideType,
    tide_range: tideRange,
    hours_to_next_tide: hoursToNextTide,
  };

  feedbackLocationId.value =
    selectedSpotIndex.value !== null
      ? String(selectedSpotIndex.value)
      : 'default';
  feedbackLocationName.value = locationName.value || '钓鱼地点';
  feedbackOpen.value = true;
};

const handleFeedbackSuccess = () => {
  feedbackOpen.value = false;
};

// 地图事件处理
const handleMarkerClick = async (index: number) => {
  // console.log("点击了钓点:", fishingSpots.value?.[index]);
  selectedSpotIndex.value = index;

  if (!mapContainerRef.value) {
    console.error('地图组件未初始化');
    return;
  }

  try {
    isPlanningRoute.value = true;

    // 获取用户当前位置
    const currentPosition = await mapContainerRef.value.getCurrentPosition();
    const previousPosition = activeLocation.value;
    const hasChangedPosition =
      previousPosition[0] !== currentPosition[0] ||
      previousPosition[1] !== currentPosition[1];
    if (hasChangedPosition) {
      await fishingMapStore.fetchWeatherAndFishing(currentPosition);
    }
    userPosition.value = currentPosition;

    // 获取被点击的钓点位置
    const spot = fishingSpots.value?.[index];
    if (!spot) {
      throw new Error('钓点不存在');
    }

    // 规划路线
    const result = await mapContainerRef.value.planRoute(
      currentPosition,
      spot.position,
    );

    routeInfo.value = result;
  } catch (error) {
    console.error('路线规划失败:', error);
    alert('路线规划失败，请检查网络连接或定位权限');
    routeInfo.value = null;
    selectedSpotIndex.value = null;
  } finally {
    isPlanningRoute.value = false;
  }
};

// 清除路线
const handleClearRoute = () => {
  if (mapContainerRef.value) {
    mapContainerRef.value.clearRoute();
    routeInfo.value = null;
    selectedSpotIndex.value = null;
  }
};

// 地图初始化完成
const handleMapReady = () => {
  void (async () => {
    if (!mapContainerRef.value) return;
    try {
      const position = await mapContainerRef.value.getCurrentPosition();
      userPosition.value = position;
      await fishingMapStore.fetchWeatherAndFishing(position);
    } catch {
      console.error('handleMapReady 定位失败');
    }
  })();
};

onMounted(() => {
  void fishingMapStore.fetchWeatherAndFishing(DEFAULT_MAP_CENTER);
});
</script>
