/**
 * Fishing dashboard 的页面级状态接线。
 *
 * 把原本散在 FishingMapView.vue 里的 mapTileRef / userPosition / activeLocation /
 * onMapReady / onMarkerClick / onClearRoute / init 收成一组语义清晰的输出，
 * view 模板只负责布局 + 把这些 binding 挂到子组件上。
 */
import fishingSpotsData from '@/data/fishing-spots.json';
import { DEFAULT_MAP_CENTER, useFishingMapStore } from '@/stores/fishingMap';
import { useNotificationStore } from '@/stores/notification';
import type { FishingIndexData } from '@/types/fishing';
import type { MapMarker } from '@/types/marker';
import { useFishingAnalysis } from '@/views/fishing/composables/useFishingAnalysis';
import { useFishingFeedback } from '@/views/fishing/composables/useFishingFeedback';
import {
  type FishingMapInstance,
  useFishingRoute,
} from '@/views/fishing/composables/useFishingRoute';
import { storeToRefs } from 'pinia';
import { computed, ref, useTemplateRef } from 'vue';

export function useFishingDashboard() {
  const fishingSpots = ref<MapMarker[]>(fishingSpotsData as MapMarker[]);
  const mapTileRef = useTemplateRef<FishingMapInstance>('mapTileRef');

  const fishingMapStore = useFishingMapStore();
  const notifier = useNotificationStore();
  const { indexData } = storeToRefs(fishingMapStore);

  const userPosition = ref<[number, number] | null>(null);
  const activeLocation = computed<[number, number]>(
    () => userPosition.value ?? DEFAULT_MAP_CENTER,
  );

  const route = useFishingRoute(() => mapTileRef.value);
  const feedback = useFishingFeedback();
  const analysis = useFishingAnalysis();

  const showFeedbackBanner = computed(
    () => !route.isPlanning.value && !route.routeInfo.value,
  );

  async function onMarkerClick(index: number): Promise<void> {
    const spot = fishingSpots.value?.[index];
    if (!spot) return;
    await route.planFromMarker(index, spot);
  }

  function onClearRoute(): void {
    route.clearRoute();
  }

  function onFeedbackClick(data: FishingIndexData): void {
    feedback.openFeedback(data, route.selectedSpotIndex.value);
  }

  function onQuickFeedback(): void {
    if (!indexData.value) return;
    feedback.openFeedback(indexData.value, null);
  }

  /**
   * 地图就绪后：拿用户定位 → 拉对应位置的天气 / 钓鱼指数。
   * 定位失败静默降级（不弹窗）—— onMounted 已经用默认中心兜底过一次。
   */
  function onMapReady(): void {
    void (async () => {
      const map = mapTileRef.value;
      if (!map) return;
      try {
        const position = await map.getCurrentPosition();
        userPosition.value = position;
        await fishingMapStore.fetchWeatherAndFishing(position);
      } catch {
        // 静默：定位失败不弹窗
      }
    })();
  }

  /** onMounted 调用：用默认中心拉一次，先把 dashboard 撑起来 */
  function init(): void {
    void fishingMapStore.fetchWeatherAndFishing(DEFAULT_MAP_CENTER);
  }

  /** Index hero card 的刷新按钮 → 用当前 activeLocation 重新拉 */
  function refreshIndex(): Promise<void> {
    return fishingMapStore.fetchWeatherAndFishing(activeLocation.value);
  }

  /** MapTile 定位 / 路线等操作失败时 toast 提示 */
  function onMapError(message: string): void {
    notifier.error(message);
  }

  return {
    // refs / state
    mapTileRef,
    fishingSpots,
    activeLocation,
    indexData,

    // sub-composables
    route,
    feedback,
    analysis,

    // derived
    showFeedbackBanner,

    // handlers
    onMarkerClick,
    onClearRoute,
    onFeedbackClick,
    onQuickFeedback,
    onMapReady,
    onMapError,
    init,
    refreshIndex,
  };
}
