<script setup lang="ts">
/**
 * Map tile —— dashboard 中的地图卡片。
 *
 * 包含:
 * - 内部 MapContainer
 * - 底部浮层 (路线规划中 / 路线信息 / 空态提示)
 * - 通过 defineExpose 向上转发 MapContainer 的实例方法
 *   (planRoute / clearRoute / getCurrentPosition) —— 跟 useFishingRoute 的
 *   FishingMapInstance 接口对齐
 *
 * 选择把这一层从 view 抽出来的原因: view 里 80+ 行都在拼装 map + overlay,
 * 拆出来 view 才能专注做 grid 编排。
 */
import MapContainer from '@/components/basic/MapContainer.vue';
import {
  formatDistance,
  formatDuration,
  type FishingMapInstance,
  type RouteInfo,
} from '@/composables/useFishingRoute';
import { DEFAULT_MAP_CENTER } from '@/stores/fishingMap';
import type { AMapMarker } from '@/types/maptype';
import { Loader2 } from '@lucide/vue';
import { useTemplateRef } from 'vue';

interface Props {
  markers: AMapMarker[];
  isPlanning: boolean;
  routeInfo: RouteInfo | null;
  center?: [number, number];
  zoom?: number;
}

withDefaults(defineProps<Props>(), {
  center: () => DEFAULT_MAP_CENTER,
  zoom: 13,
});

const emit = defineEmits<{
  (e: 'marker-click', index: number): void;
  (e: 'map-ready'): void;
  (e: 'clear-route'): void;
}>();

const innerRef = useTemplateRef<FishingMapInstance>('innerRef');

/** 向父转发 MapContainer 实例方法,保持 useFishingRoute 那一套 ref 调用方式 */
defineExpose<FishingMapInstance>({
  planRoute: (start, end) => {
    if (!innerRef.value) {
      return Promise.reject(new Error('地图未就绪'));
    }
    return innerRef.value.planRoute(start, end);
  },
  clearRoute: () => innerRef.value?.clearRoute(),
  getCurrentPosition: () => {
    if (!innerRef.value) {
      return Promise.reject(new Error('地图未就绪'));
    }
    return innerRef.value.getCurrentPosition();
  },
});
</script>

<template>
  <div class="relative h-full w-full">
    <MapContainer
      ref="innerRef"
      :center="center"
      :zoom="zoom"
      :markers="markers"
      :show-tool-bar="true"
      :show-scale="true"
      :show-geolocation="true"
      @marker-click="(i: number) => emit('marker-click', i)"
      @map-ready="emit('map-ready')"
    />

    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="isPlanning || routeInfo"
        class="bg-card/90 border-border absolute right-4 bottom-4 left-4 rounded-2xl border p-4 shadow-lg backdrop-blur-md"
      >
        <div
          v-if="isPlanning"
          class="text-muted-foreground flex items-center gap-3"
        >
          <Loader2 class="h-4 w-4 animate-spin" />
          <span class="text-sm">正在规划路线...</span>
        </div>
        <div
          v-else-if="routeInfo"
          class="flex items-center justify-between gap-4"
        >
          <div class="space-y-1.5">
            <p class="text-muted-foreground text-xs tracking-[0.2em] uppercase">
              路线信息
            </p>
            <p
              class="text-foreground font-family-averia text-2xl leading-none tabular-nums sm:text-3xl"
            >
              <span>{{ formatDistance(routeInfo.distance) }}</span>
              <span class="text-muted-foreground mx-2 text-base">·</span>
              <span>{{ formatDuration(routeInfo.time) }}</span>
            </p>
          </div>
          <button
            class="bg-destructive text-primary-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            type="button"
            @click="emit('clear-route')"
          >
            清除路线
          </button>
        </div>
      </div>
    </Transition>

    <p
      v-if="!isPlanning && !routeInfo"
      class="text-muted-foreground/90 bg-card/70 absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs backdrop-blur-md"
    >
      点击地图标记，自动规划路线
    </p>
  </div>
</template>
