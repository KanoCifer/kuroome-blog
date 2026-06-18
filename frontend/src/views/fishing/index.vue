<script setup lang="ts">
defineOptions({ name: 'FishingMapView' });
import TideCard from '@/views/fishing/dashboard/TideCard.vue';
import WeatherCard from '@/views/fishing/dashboard/WeatherCard.vue';
import AnalysisDrawer from '@/views/fishing/dashboard/AnalysisDrawer.vue';
import DashboardHeader from '@/views/fishing/dashboard/DashboardHeader.vue';
import FeedbackFormDialog from '@/views/fishing/dashboard/FeedbackFormDialog.vue';
import HourlyChartCard from '@/views/fishing/dashboard/HourlyChartCard.vue';
import IndexHeroCard from '@/views/fishing/dashboard/IndexHeroCard.vue';
import MapContainer from '@/views/fishing/map/MapContainer.vue';
import QuickFeedbackBanner from '@/views/fishing/dashboard/QuickFeedbackBanner.vue';
import { useFishingDashboard } from '@/views/fishing/composables/useFishingDashboard';
import { onMounted } from 'vue';

const dash = useFishingDashboard();
const { feedback, analysis } = dash;

onMounted(dash.init);
</script>

<template>
  <div class="bg-background min-h-screen">
    <DashboardHeader
      :analysis-open="dash.analysisOpen.value"
      :analysis-has-data="dash.analysisHasData.value"
      @toggle-analysis="analysis.toggle"
    />

    <main
      class="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5"
    >
      <QuickFeedbackBanner
        :disabled="!dash.indexData.value"
        @submit="dash.onQuickFeedback"
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
          <MapContainer
            ref="mapTileRef"
            :markers="dash.fishingSpots.value"
            :is-planning="dash.isPlanning.value"
            :route-info="dash.routeInfo.value"
            @marker-click="dash.onMarkerClick"
            @map-ready="dash.onMapReady"
            @clear-route="dash.onClearRoute"
            @error="dash.onMapError"
          />
        </div>

        <!-- Fishing Index (hero,移动端优先排在 Map 之前) -->
        <div class="order-1 md:order-2 md:col-span-6 lg:col-span-4">
          <IndexHeroCard
            @refresh="dash.refreshIndex"
            @feedback-click="dash.onFeedbackClick"
          />
        </div>

        <!-- 底排:Weather (3) / Hourly (5) / Tide (4) = 12 -->
        <div class="order-3 md:col-span-3 lg:col-span-3">
          <WeatherCard :location="dash.activeLocation.value" />
        </div>
        <div class="order-4 md:col-span-3 lg:col-span-5">
          <HourlyChartCard />
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

    <FeedbackFormDialog
      v-if="dash.feedbackOpen.value && dash.currentFishingData.value"
      :is-open="dash.feedbackOpen.value"
      :fishing-data="dash.currentFishingData.value"
      :location-id="dash.feedbackLocationId.value"
      :location-name="dash.feedbackLocationName.value"
      @cancel="feedback.closeFeedback"
      @success="feedback.closeFeedback"
    />

    <AnalysisDrawer
      :open="dash.analysisOpen.value"
      :payload="dash.analysisPayload.value"
      @close="analysis.close"
    />
  </div>
</template>

<style scoped>
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
