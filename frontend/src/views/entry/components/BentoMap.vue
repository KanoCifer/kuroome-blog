<template>
  <BentoCard
    :initial="{ scale: 0 }"
    :animate="{ scale: 1 }"
    class="group relative h-28 w-60 min-w-0 overflow-hidden"
  >
    <!-- 背景水波纹效果 -->
    <div
      class="absolute inset-0 bg-linear-to-br from-teal-500/10 via-cyan-500/5 to-blue-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />

    <!-- 动态波浪装饰 -->
    <svg
      class="absolute -right-4 -bottom-4 h-24 w-24 text-teal-500/10 transition-transform duration-500 group-hover:scale-110"
      viewBox="0 0 100 100"
      fill="currentColor"
    >
      <circle cx="50" cy="50" r="40" opacity="0.3" />
      <circle cx="50" cy="50" r="30" opacity="0.5" />
      <circle cx="50" cy="50" r="20" opacity="0.7" />
    </svg>

    <RouterLink
      to="/fishing-map"
      class="relative flex h-full flex-col justify-between p-1"
    >
      <!-- 顶部：图标和状态 -->
      <div class="flex items-start justify-between">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/15 transition-transform duration-300 group-hover:scale-110 group-hover:rounded-xl"
        >
          <FishingRod class="size-5 text-teal-600" />
        </div>
        <div
          v-if="weatherStatus"
          class="flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5"
        >
          <component :is="weatherStatus.icon" class="size-3 text-teal-600" />
          <span class="text-[10px] font-medium text-teal-700">{{
            weatherStatus.text
          }}</span>
        </div>
      </div>

      <!-- 中部：统计和地图预览 -->
      <div class="mt-3 space-y-2">
        <div class="flex items-baseline gap-1">
          <span class="text-foreground text-2xl font-bold tracking-tight">{{
            displaySpots
          }}</span>
          <span class="text-muted-foreground text-xs">个钓点</span>
        </div>
      </div>

      <!-- 底部：最近活动和潮汐 -->
      <div class="mt-2 flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <Waves class="size-3 text-teal-500/60" />
          <span class="text-muted-foreground text-[10px]">{{
            tideStatus
          }}</span>
        </div>
        <span class="text-[10px] font-medium text-teal-600">{{
          lastRecord
        }}</span>
      </div>
    </RouterLink>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import { useAnimateNumber } from "@/composables/useAnimateNumber";
import fishingSpots from "@/data/fishing-spots.json";
import { fishingService } from "@/service/fishingService";
import { DEFAULT_MAP_CENTER, useFishingMapStore } from "@/stores/fishingMap";
import type { TideData } from "@/views/fishing/types";
import dayjs from "dayjs";
import {
  Cloud,
  CloudRain,
  FishingRod,
  Sun,
  Waves,
  Wind,
} from "lucide-vue-next";
import { computed, onMounted, ref, type Component } from "vue";

const { displayValue: displaySpots, animateTo } = useAnimateNumber();
const store = useFishingMapStore();
const lastRecord = ref("--");
const totalRecords = ref(0);

const WEATHER_ICON_MAP: Record<string, Component> = {
  晴: Sun,
  多云: Cloud,
  阴: Cloud,
  小雨: CloudRain,
  中雨: CloudRain,
  大雨: CloudRain,
  阵雨: CloudRain,
  雷阵雨: CloudRain,
  大风: Wind,
  雾: Wind,
  霾: Wind,
};

const weatherStatus = computed(() => {
  const text = store.liveWeather?.text || "晴";
  return { icon: WEATHER_ICON_MAP[text] || Sun, text };
});

const tideStatus = computed(() => {
  return deriveTideStatus(store.tideData);
});

function deriveTideStatus(tideData: TideData | null): string {
  if (!tideData?.tideTable?.length) return "未知潮汐";

  const now = dayjs();
  const table = tideData.tideTable;

  for (let i = 0; i < table.length; i++) {
    const tideTime = dayjs(table[i].fxTime);
    if (tideTime.isAfter(now)) {
      return table[i].type === "H" ? "退潮中" : "涨潮中";
    }
  }

  return "未知潮汐";
}

function formatRelativeTime(isoString: string): string {
  const now = dayjs();
  const then = dayjs(isoString);
  const diffMinutes = now.diff(then, "minute");

  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  const diffHours = now.diff(then, "hour");
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = now.diff(then, "day");
  if (diffDays < 30) return `${diffDays}天前`;
  const diffMonths = now.diff(then, "month");
  return `${diffMonths}个月前`;
}

onMounted(async () => {
  animateTo(fishingSpots.length);

  try {
    await store.fetchWeatherAndFishing(DEFAULT_MAP_CENTER);
  } catch {
    // card shows defaults on failure
  }

  try {
    const stats = await fishingService.fetchFishingStats();
    totalRecords.value = stats.total_records;
    if (stats.latest_record_time) {
      lastRecord.value = formatRelativeTime(stats.latest_record_time);
    }
  } catch {
    // card shows "--" on failure
  }
});
</script>
