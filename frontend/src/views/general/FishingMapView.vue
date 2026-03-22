<template>
  <div>
    <!-- Title Section with Parallax -->
    <div
      class="relative -z-5 mx-0 mt-60 flex flex-col items-center justify-center bg-transparent"
      :style="titleStyle"
    >
      <div>
        <h1
          class="max-w-6xl text-center font-serif text-7xl text-gray-50 max-sm:text-3xl"
        >
          钓鱼地图
        </h1>
        <!-- Author and Date Info -->
        <div
          class="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400"
        >
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
            :center="[113.389549, 23.050067]"
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
        <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          <!-- Tide Card -->
          <TideCard />

          <!-- Weather Card -->
          <WeatherCard :location="[113.389549, 23.050067]" />
        </div>
      </div>

      <div class="mt-12 text-center">
        <RouterLink
          to="/"
          class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-400 px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-blue-500 hover:shadow-lg dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
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
import { computed, ref, useTemplateRef } from "vue";
import fishingSpotsData from "@/data/fishing-spots.json";
import TideCard from "@/components/map/TideCard.vue";
import WeatherCard from "@/components/map/WeatherCard.vue";

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
const fishingSpots = ref<AMapMarker[]>(fishingSpotsData as AMapMarker[]);
const mapContainerRef = useTemplateRef<MapContainerInstance>("mapContainerRef");

// 路线规划状态
const isPlanningRoute = ref(false);
const routeInfo = ref<{ distance: number; time: number } | null>(null);
const selectedSpotIndex = ref<number | null>(null);

// 地图事件处理
const handleMarkerClick = async (index: number) => {
  console.log("点击了钓点:", fishingSpots.value?.[index]);
  selectedSpotIndex.value = index;

  if (!mapContainerRef.value) {
    console.error("地图组件未初始化");
    return;
  }

  try {
    isPlanningRoute.value = true;

    // 获取用户当前位置
    const userPosition = await mapContainerRef.value.getCurrentPosition();

    // 获取被点击的钓点位置
    const spot = fishingSpots.value?.[index];
    if (!spot) {
      throw new Error("钓点不存在");
    }

    // 规划路线
    const result = await mapContainerRef.value.planRoute(
      userPosition,
      spot.position,
    );

    routeInfo.value = result;
  } catch (error) {
    console.error("路线规划失败:", error);
    alert("路线规划失败，请检查网络连接或定位权限");
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
  // 地图初始化完成，天气由 WeatherCard 组件自行获取
};
</script>
