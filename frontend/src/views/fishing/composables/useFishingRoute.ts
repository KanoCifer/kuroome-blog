/**
 * 钓点路线规划逻辑
 *
 * 职责：
 * - 管理路线规划状态（planning / routeInfo / selectedSpot）
 * - 串行化并发请求（routeSeq 守卫：重复点击 marker 不会触发多次 planRoute）
 * - 错误统一走 notification store，不再用浏览器 alert
 *
 * map 通过 getter 注入：调用方只在创建 composable 时挂一次，之后所有
 * planFromMarker / clearRoute 都自取，view 不再每次空判 ref。
 */
import { useNotificationStore } from '@/stores/notification';
import type { MapMarker } from '@/types/marker';
import { ref } from 'vue';

export interface RouteInfo {
  distance: number;
  time: number;
}

/**
 * MapContainer 暴露给父组件的实例方法子集（不引入完整 vue 文件依赖）。
 * 若 MapContainer.vue 的 defineExpose 变更，这里需要同步。
 */
export interface FishingMapInstance {
  planRoute: (
    start: [number, number],
    end: [number, number],
  ) => Promise<RouteInfo>;
  clearRoute: () => void;
  getCurrentPosition: () => Promise<[number, number]>;
}

/** 米 → "xxx 米 / x.x 公里" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} 米`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}

/** 秒 → "xx 分钟" 或 "x 小时 yy 分钟" */
export function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours} 小时 ${minutes} 分钟`;
}

export function useFishingRoute(getMap: () => FishingMapInstance | null) {
  const notifier = useNotificationStore();

  const isPlanning = ref(false);
  const routeInfo = ref<RouteInfo | null>(null);
  const selectedSpotIndex = ref<number | null>(null);

  // 串行化守卫：每次 planFromMarker 递增，旧的 await 在 finally/错误分支被吞掉
  let routeSeq = 0;

  async function planFromMarker(
    index: number,
    spot: MapMarker,
  ): Promise<void> {
    const map = getMap();
    if (!map) return;

    const mySeq = ++routeSeq;
    selectedSpotIndex.value = index;
    isPlanning.value = true;
    routeInfo.value = null;

    try {
      const position = await map.getCurrentPosition();
      if (mySeq !== routeSeq) return;

      const result = await map.planRoute(position, spot.position);
      if (mySeq !== routeSeq) return;

      routeInfo.value = result;
    } catch (err) {
      if (mySeq !== routeSeq) return;
      const message =
        err instanceof Error
          ? err.message
          : '路线规划失败，请检查网络连接或定位权限';
      notifier.error(message);
      selectedSpotIndex.value = null;
    } finally {
      if (mySeq === routeSeq) {
        isPlanning.value = false;
      }
    }
  }

  function clearRoute(): void {
    const map = getMap();
    if (!map) return;
    map.clearRoute();
    routeInfo.value = null;
    selectedSpotIndex.value = null;
  }

  return {
    isPlanning,
    routeInfo,
    selectedSpotIndex,
    planFromMarker,
    clearRoute,
  };
}
