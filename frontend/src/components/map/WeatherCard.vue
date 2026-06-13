<script setup lang="ts">
import { useFishingMapStore } from '@/stores/fishingMap';
import { formatDate } from '@/utils/formatdate';
import FishingCard from '@/views/fishing/components/FishingCard.vue';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

defineProps<{
  location?: [number, number];
}>();

const fishingMapStore = useFishingMapStore();
const { liveWeather, forecasts, locationName, weatherLoading, weatherError } =
  storeToRefs(fishingMapStore);

const isLoading = computed(() => weatherLoading.value);
const error = computed(() => weatherError.value || null);

const openQWeather = () => {
  window.open('https://www.qweather.com/', '_blank');
};
</script>

<template>
  <FishingCard interactive @click="openQWeather">
    <!-- Header -->
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-foreground text-lg font-semibold tracking-tight">
          实时天气
          <span class="text-muted-foreground ml-1.5 text-xs font-normal">
            和风天气
          </span>
        </h3>
        <p class="text-muted-foreground mt-0.5 truncate text-sm">
          {{ locationName || '钓鱼地点' }}
        </p>
      </div>
      <div
        class="bg-primary text-primary-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
      >
        <i
          v-if="liveWeather"
          :class="`qi-${liveWeather.icon}`"
          class="text-xl"
        />
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          />
        </svg>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="flex flex-1 flex-col items-center justify-center py-8"
    >
      <div
        class="border-border border-t-primary h-10 w-10 animate-spin rounded-full border-2"
      />
      <span class="text-muted-foreground mt-3 text-sm">获取天气数据...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-destructive/10 rounded-xl p-4">
      <p class="text-destructive flex items-center gap-2 text-sm">
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        {{ error }}
      </p>
    </div>

    <!-- Weather data -->
    <div v-else-if="liveWeather" class="flex flex-1 flex-col">
      <!-- 当前温度 -->
      <div class="mb-4 text-center">
        <div class="flex items-baseline justify-center gap-1">
          <span
            class="text-foreground text-5xl leading-none font-bold tracking-tight tabular-nums"
          >
            {{ liveWeather.temp }}
          </span>
          <span class="text-muted-foreground text-xl font-light">°C</span>
        </div>
        <span
          class="bg-primary/10 text-primary mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium"
        >
          {{ liveWeather.text }}
        </span>
      </div>

      <!-- 三联指标 -->
      <div class="mb-4 grid grid-cols-3 gap-2">
        <div class="bg-muted/40 rounded-lg p-2.5 text-center">
          <p class="text-muted-foreground text-xs">风向</p>
          <p class="text-foreground mt-1 text-xs font-semibold">
            {{ liveWeather.windDir }}
          </p>
        </div>
        <div class="bg-muted/40 rounded-lg p-2.5 text-center">
          <p class="text-muted-foreground text-xs">风力</p>
          <p class="text-foreground mt-1 text-xs font-semibold">
            {{ liveWeather.windScale }}级
          </p>
        </div>
        <div class="bg-muted/40 rounded-lg p-2.5 text-center">
          <p class="text-muted-foreground text-xs">湿度</p>
          <p class="text-foreground mt-1 text-xs font-semibold">
            {{ liveWeather.humidity }}%
          </p>
        </div>
      </div>

      <!-- 未来 4 天 -->
      <div v-if="forecasts.length > 0" class="flex-1">
        <p class="text-muted-foreground mb-2 text-xs">未来天气</p>
        <div class="grid grid-cols-4 gap-1.5">
          <div
            v-for="day in forecasts.slice(0, 4)"
            :key="day.fxDate"
            class="bg-muted/30 rounded-lg p-2 text-center"
          >
            <p class="text-muted-foreground text-xs">
              {{ day.fxDate.slice(5) }}
            </p>
            <p class="text-foreground my-1 text-lg leading-none">
              <i :class="`qi-${day.iconDay}`" />
            </p>
            <p class="text-foreground text-xs font-medium tabular-nums">
              {{ day.tempMax }}°/{{ day.tempMin }}°
            </p>
          </div>
        </div>
      </div>

      <p class="text-muted-foreground mt-3 text-center text-xs">
        更新于 {{ formatDate(liveWeather.obsTime) }}
      </p>
    </div>

    <!-- 空态 -->
    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center py-8 text-center"
    >
      <div
        class="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="text-muted-foreground h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          />
        </svg>
      </div>
      <p class="text-secondary-foreground text-sm">查看实时天气情况</p>
      <p class="text-muted-foreground mt-1 text-xs">选择最佳钓鱼时间</p>
    </div>
  </FishingCard>
</template>
