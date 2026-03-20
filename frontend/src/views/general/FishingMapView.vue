<template>
  <div>
    <!-- Title Section with Parallax -->
    <div
      class="relative -z-5 mx-0 mt-60 flex flex-col items-center justify-center bg-transparent"
      :style="titleStyle"
    >
      <div>
        <h1 class="max-w-6xl text-center font-serif text-7xl text-gray-50 max-sm:text-3xl">
          钓鱼地图
        </h1>
        <!-- Author and Date Info -->
        <div class="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
          <span
            class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            探索钓鱼地点和钓点信息
          </span>
        </div>
      </div>
    </div>
    <div class="relative mt-36">
      <div
        :style="sectionStyle"
        class="absolute left-1/2 -z-5 h-full -translate-x-1/2 rounded-t-[40px] bg-blue-50 dark:bg-slate-900"
      ></div>
      <div class="mx-auto max-w-6xl pt-24">
        <!-- Map Container -->
        <div
          class="squircle relative overflow-hidden border border-gray-200/60 bg-white/30 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
        >
          <MapContainer
            :center="[113.389549, 23.050067]"
            :zoom="12"
            :markers="fishingSpots"
            :show-tool-bar="true"
            :show-scale="true"
            :show-geolocation="true"
            @marker-click="handleMarkerClick"
            @map-ready="handleMapReady"
          />
        </div>

        <!-- Map Controls and Info -->
        <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <!-- Location Info Card -->
          <div
            class="squircle relative overflow-hidden border border-gray-200/60 bg-white/30 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
          >
            <div class="mb-4 flex items-start gap-4">
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
                  位置信息
                </h3>
                <span
                  class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  地图工具
                </span>
              </div>
            </div>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              点击地图上的标记点查看详细位置信息，包括坐标、地址和周边环境。
            </p>
          </div>

          <!-- Fishing Tips Card -->
          <div
            class="squircle relative overflow-hidden border border-gray-200/60 bg-white/30 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
          >
            <div class="mb-4 flex items-start gap-4">
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
                  钓鱼技巧
                </h3>
                <span
                  class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  实用信息
                </span>
              </div>
            </div>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              分享钓鱼经验和技巧，帮助你更好地享受钓鱼乐趣。
            </p>
          </div>

          <!-- Weather Info Card -->
          <div
            class="squircle relative overflow-hidden border border-gray-200/60 bg-white/30 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
          >
            <div class="mb-4 flex items-start gap-4">
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8 text-gray-400"
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
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
                  天气信息
                </h3>
                <span
                  class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  环境数据
                </span>
              </div>
            </div>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              查看钓鱼地点的实时天气情况，选择最佳钓鱼时间。
            </p>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center">
        <RouterLink
          to="/"
          class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <svg
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回首页
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MapContainer from "@/components/basic/MapContainer.vue";
import { useScroll } from "@vueuse/core";
import { computed, ref } from "vue";

interface FishingSpot {
  position: [number, number];
  title?: string;
  content?: string;
}

const { y } = useScroll(window);

const titleStyle = computed(() => ({
  transform: `translateY(${y.value * 0.4}px)`,
}));

const sectionStyle = computed(() => {
  const scale = Math.min(1, 0.95 + y.value * 0.0005);
  return {
    width: `${100 * scale}%`,
  };
});

// 钓点数据
const fishingSpots = ref<FishingSpot[]>([
  {
    position: [113.399705, 23.067563],
    title: "",
    content: "",
  },
  {
    position: [113.401591, 23.06482],
    title: "",
    content: "",
  },
  {
    position: [113.402591, 23.075127],
    title: "",
    content: "",
  },
  {
    position: [113.424257, 23.065673],
    title: "",
    content: "",
  },
]);

// 地图事件处理
const handleMarkerClick = (index: number) => {
  console.log("点击了钓点:", fishingSpots.value[index]);
};

const handleMapReady = (map: unknown) => {
  console.log("地图初始化完成", map);
};
</script>
