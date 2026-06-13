<script setup lang="ts">
import TideCard from '@/components/map/TideCard.vue';
import WeatherCard from '@/components/map/WeatherCard.vue';
import { useFishingAnalysis } from '@/composables/useFishingAnalysis';
import {
  type FishingMapInstance,
  useFishingRoute,
} from '@/composables/useFishingRoute';
import fishingSpotsData from '@/data/fishing-spots.json';
import { useFishingFeedback } from '@/composables/useFishingFeedback';
import { DEFAULT_MAP_CENTER, useFishingMapStore } from '@/stores/fishingMap';
import type { MapMarker } from '@/types/marker';
import FishingAnalysisDrawer from '@/views/fishing/components/FishingAnalysisDrawer.vue';
import FishingDashboardHeader from '@/views/fishing/components/FishingDashboardHeader.vue';
import FishingFeedbackForm from '@/views/fishing/components/FishingFeedbackForm.vue';
import FishingIndexCard from '@/views/fishing/components/FishingIndexCard.vue';
import FishingMapTile from '@/views/fishing/components/FishingMapTile.vue';
import HourlyWeather from '@/views/fishing/components/HourlyWeather.vue';
import QuickFeedbackBanner from '@/views/fishing/components/QuickFeedbackBanner.vue';
import type { FishingIndexData } from '@/views/fishing/types';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, useTemplateRef } from 'vue';

const fishingSpots = ref<MapMarker[]>(fishingSpotsData as MapMarker[]);
const mapTileRef = useTemplateRef<FishingMapInstance>('mapTileRef');

const fishingMapStore = useFishingMapStore();
const { indexData } = storeToRefs(fishingMapStore);

const userPosition = ref<[number, number] | null>(null);
const activeLocation = computed<[number, number]>(
  () => userPosition.value ?? DEFAULT_MAP_CENTER,
);

const route = useFishingRoute();
const { isPlanning, routeInfo, selectedSpotIndex, planFromMarker, clearRoute } =
  route;

const feedback = useFishingFeedback();
const analysis = useFishingAnalysis();

const showFeedbackBanner = computed(
  () => !isPlanning.value && !routeInfo.value,
);

async function onMarkerClick(index: number) {
  const map = mapTileRef.value;
  if (!map) return;
  const spot = fishingSpots.value?.[index];
  if (!spot) return;
  await planFromMarker(map, index, spot);
}

function onClearRoute() {
  const map = mapTileRef.value;
  if (!map) return;
  clearRoute(map);
}

function onFeedbackClick(data: FishingIndexData) {
  feedback.openFeedback(data, selectedSpotIndex.value);
}

function onQuickFeedback() {
  if (!indexData.value) return;
  feedback.openFeedback(indexData.value, null);
}

const onMapReady = () => {
  void (async () => {
    const map = mapTileRef.value;
    if (!map) return;
    try {
      const position = await map.getCurrentPosition();
      userPosition.value = position;
      await fishingMapStore.fetchWeatherAndFishing(position);
    } catch {
      // 静默:定位失败不弹窗
    }
  })();
};

onMounted(() => {
  void fishingMapStore.fetchWeatherAndFishing(DEFAULT_MAP_CENTER);
});
</script>

<template>
  <div class="bg-background min-h-screen">
    <FishingDashboardHeader
      :analysis-open="analysis.open.value"
      :analysis-has-data="analysis.hasData.value"
      @toggle-analysis="analysis.toggle"
    />

    <main
      class="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5"
    >
      <QuickFeedbackBanner
        :visible="showFeedbackBanner"
        :disabled="!indexData"
        @submit="onQuickFeedback"
      />

      <!--
        Dashboard 网格:
        - 桌面 (lg+): 12 列,Map(8) + Index(4) → Weather(4) + Hourly(4) + Tide(4)
        - 平板 (md): 6 列,Map / Index 同列 → Weather + Hourly → Tide(全宽)
        - 手机: 单列,Index 优先,然后 Map / Weather / Hourly / Tide
      -->
      <div
        class="fishing-dashboard grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-[minmax(360px,520px)_auto] lg:grid-cols-12"
      >
        <!-- Map tile (主舞台) -->
        <div
          class="fishing-map-wrapper border-border order-2 h-[360px] overflow-hidden rounded-2xl border shadow-sm md:order-1 md:col-span-6 md:h-full lg:col-span-8"
        >
          <FishingMapTile
            ref="mapTileRef"
            :markers="fishingSpots"
            :is-planning="isPlanning"
            :route-info="routeInfo"
            @marker-click="onMarkerClick"
            @map-ready="onMapReady"
            @clear-route="onClearRoute"
          />
        </div>

        <!-- Fishing Index (hero,移动端优先排在 Map 之前) -->
        <div class="order-1 md:order-2 md:col-span-6 lg:col-span-4">
          <FishingIndexCard
            :location="activeLocation"
            @feedback-click="onFeedbackClick"
          />
        </div>

        <!-- 底排:Weather / Hourly / Tide -->
        <div class="order-3 md:col-span-3 lg:col-span-4">
          <WeatherCard :location="activeLocation" />
        </div>
        <div class="order-4 md:col-span-3 lg:col-span-4">
          <HourlyWeather />
        </div>
        <div class="order-5 md:col-span-6 lg:col-span-4">
          <TideCard />
        </div>
      </div>

      <p
        class="text-muted-foreground/70 font-family-averia pt-2 text-center text-sm italic"
      >
        在出钓与阅读之间，留一片安静
      </p>
    </main>

    <FishingFeedbackForm
      v-if="feedback.open.value && feedback.currentFishingData.value"
      :is-open="feedback.open.value"
      :fishing-data="feedback.currentFishingData.value"
      :location-id="feedback.locationId.value"
      :location-name="feedback.locationName.value"
      @cancel="feedback.closeFeedback"
      @success="feedback.closeFeedback"
    />

    <FishingAnalysisDrawer
      :open="analysis.open.value"
      :payload="analysis.payload.value"
      @close="analysis.close"
    />
  </div>
</template>

<style scoped>
/*
 * Map tile 的 hover 浮起 —— FishingMapTile 不在 FishingCard 内(padding=none),
 * 单独在外层 .fishing-map-wrapper 上加同款 lift,与 FishingCard 行为一致
 */
.fishing-map-wrapper {
  position: relative;
  transition:
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 240ms ease;
}
.fishing-map-wrapper:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 22px -8px oklch(0% 0 0 / 0.14),
    0 2px 6px -2px oklch(0% 0 0 / 0.06);
}

/*
 * Dashboard 网格的入场 stagger —— 5 个 tile 按 DOM 顺序 60ms 步进淡入
 * (B 方向: 让"留一片安静"的钓鱼 dashboard 也有"刚开锅"的呼吸感)
 */
@keyframes fishing-dashboard-fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.fishing-dashboard > * {
  animation: fishing-dashboard-fade-up 460ms cubic-bezier(0.22, 1, 0.36, 1)
    backwards;
}
.fishing-dashboard > *:nth-child(1) {
  animation-delay: 0ms;
}
.fishing-dashboard > *:nth-child(2) {
  animation-delay: 60ms;
}
.fishing-dashboard > *:nth-child(3) {
  animation-delay: 120ms;
}
.fishing-dashboard > *:nth-child(4) {
  animation-delay: 180ms;
}
.fishing-dashboard > *:nth-child(5) {
  animation-delay: 240ms;
}

@media (prefers-reduced-motion: reduce) {
  .fishing-dashboard > * {
    animation: none;
  }
  .fishing-map-wrapper:hover {
    transform: none;
  }
}

@media (hover: none) {
  .fishing-map-wrapper:hover {
    transform: none;
  }
}
</style>
