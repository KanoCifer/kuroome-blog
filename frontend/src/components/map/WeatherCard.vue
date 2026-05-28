<template>
  <div
    @click="openQWeather"
    class="group squircle from-card/80 to-card/40 relative flex h-full cursor-pointer flex-col overflow-hidden border border-white/20 bg-linear-to-br p-6 shadow-lg backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl dark:border-gray-700/50 dark:from-gray-900/80 dark:to-gray-800/40"
  >
    <!-- Decorative gradient orbs -->
    <div
      class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-linear-to-br from-sky-300/30 to-blue-500/20 blur-3xl transition-transform duration-700 group-hover:scale-110"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-linear-to-tr from-amber-300/20 to-orange-400/10 blur-3xl transition-transform duration-700 group-hover:scale-110"
    ></div>

    <!-- Header -->
    <div class="relative z-10 mb-4 flex items-start justify-between">
      <div>
        <h3
          class="text-foreground text-lg font-bold tracking-tight dark:text-white"
        >
          实时天气
          <span
            class="text-muted-foreground dark:text-muted-foreground ml-2 text-xs"
            >点击跳转和风天气</span
          >
        </h3>
        <p
          class="text-muted-foreground dark:text-muted-foreground mt-1 text-sm"
        >
          {{ locationName || '钓鱼地点' }}
        </p>
      </div>
      <div
        class="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-blue-500 shadow-lg shadow-sky-500/25 transition-transform duration-300 group-hover:scale-110"
      >
        <span v-if="liveWeather" class="text-2xl">
          <i :class="`qi-${liveWeather.icon}`" class="text-2xl text-white" />
        </span>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 text-white"
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

    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="relative z-10 flex flex-1 flex-col items-center justify-center"
    >
      <div class="relative">
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500 dark:border-gray-700 dark:border-t-sky-400"
        ></div>
      </div>
      <span class="text-muted-foreground dark:text-muted-foreground mt-4">
        获取天气数据...
      </span>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-destructive/10 relative z-10 rounded-xl p-4 dark:bg-red-900/20"
    >
      <div class="flex items-center gap-3">
        <div class="bg-destructive/20 rounded-full p-2 dark:bg-red-900/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="text-destructive h-5 w-5"
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
        </div>
        <p class="text-destructive dark:text-red-400">{{ error }}</p>
      </div>
    </div>

    <!-- Weather Data -->
    <div v-else-if="liveWeather" class="relative z-10 flex flex-1 flex-col">
      <!-- Current Weather -->
      <div class="mb-4 text-center">
        <div class="mb-2 flex items-baseline justify-center gap-1">
          <span
            class="bg-linear-to-br from-gray-900 to-gray-600 bg-clip-text text-5xl font-bold tracking-tight text-transparent dark:from-white dark:to-gray-300"
          >
            {{ liveWeather.temp }}
          </span>
          <span class="text-muted-foreground text-2xl font-light">°C</span>
        </div>
        <span
          class="bg-primary/10 text-primary dark:text-primary inline-block rounded-full px-3 py-1 font-medium dark:bg-sky-900/40"
        >
          {{ liveWeather.text }}
        </span>
      </div>

      <!-- Current Details -->
      <div class="mb-4 grid grid-cols-3 gap-3">
        <div class="bg-card/50 dark:bg-muted/50 rounded-xl p-2.5">
          <div
            class="text-muted-foreground mb-1 flex items-center justify-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
            <span class="text-xs">风向</span>
          </div>
          <p
            class="text-foreground text-center text-xs font-semibold dark:text-white"
          >
            {{ liveWeather.windDir }}
          </p>
        </div>
        <div class="bg-card/50 dark:bg-muted/50 rounded-xl p-2.5">
          <div
            class="text-muted-foreground mb-1 flex items-center justify-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span class="text-xs">风力</span>
          </div>
          <p
            class="text-foreground text-center text-xs font-semibold dark:text-white"
          >
            {{ liveWeather.windScale }}级
          </p>
        </div>
        <div class="bg-card/50 dark:bg-muted/50 rounded-xl p-2.5">
          <div
            class="text-muted-foreground mb-1 flex items-center justify-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            <span class="text-xs">湿度</span>
          </div>
          <p
            class="text-foreground text-center text-xs font-semibold dark:text-white"
          >
            {{ liveWeather.humidity }}%
          </p>
        </div>
      </div>

      <!-- Forecast -->
      <div v-if="forecasts.length > 0" class="flex-1">
        <div
          class="text-muted-foreground dark:text-muted-foreground mb-2 ml-6 flex w-full items-center gap-2 text-xs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>未来天气</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div
            v-for="day in forecasts.slice(0, 4)"
            :key="day.fxDate"
            class="bg-card/40 dark:bg-muted/40 rounded-lg p-2 text-center"
          >
            <p
              class="text-muted-foreground dark:text-muted-foreground mb-1 text-xs"
            >
              {{ day.fxDate }}
            </p>
            <p class="mb-1 text-lg">
              <i :class="`qi-${day.iconDay}`" />
            </p>
            <p class="text-foreground text-xs font-medium dark:text-white">
              {{ day.tempMax }}° / {{ day.tempMin }}°
            </p>
          </div>
        </div>
        <div>
          <p
            class="text-muted-foreground dark:text-muted-foreground mt-3 text-center text-sm"
          >
            更多预报请访问和风天气官网
          </p>
        </div>
      </div>

      <!-- Update Time -->
      <div class="mt-3 text-center">
        <span class="text-muted-foreground text-xs">
          更新于 {{ formatDate(liveWeather.obsTime) }}
        </span>
      </div>
    </div>

    <!-- No Data State -->
    <div
      v-else
      class="relative z-10 flex flex-1 flex-col items-center justify-center py-4"
    >
      <div
        class="bg-muted dark:bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="text-muted-foreground h-8 w-8"
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
      <p class="dark:text-muted-foreground text-secondary-foreground">
        查看钓鱼地点的实时天气情况
      </p>
      <p class="text-muted-foreground mt-1 text-xs">选择最佳钓鱼时间</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFishingMapStore } from '@/stores/fishingMap';
import { formatDate } from '@/utils/formatdate';
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

// 打开和风天气
const openQWeather = () => {
  window.open('https://www.qweather.com/', '_blank');
};
</script>
