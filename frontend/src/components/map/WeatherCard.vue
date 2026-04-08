<template>
  <div
    @click="openQWeather"
    class="group squircle relative flex h-full cursor-pointer flex-col overflow-hidden border border-white/20 bg-linear-to-br from-white/80 to-white/40 p-6 shadow-lg backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl dark:border-gray-700/50 dark:from-gray-900/80 dark:to-gray-800/40"
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
        <h3 class="text-lg font-bold tracking-tight text-gray-900 dark:text-white">实时天气</h3>
        <p class="mt-1 text-gray-500 dark:text-gray-400">
          {{ liveWeather?.city || "钓鱼地点" }}
        </p>
      </div>
      <div
        class="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-blue-500 shadow-lg shadow-sky-500/25 transition-transform duration-300 group-hover:scale-110"
      >
        <span v-if="liveWeather" class="text-2xl drop-shadow-sm">
          {{ getWeatherIcon(liveWeather.weather) }}
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
    <div v-if="isLoading" class="relative z-10 flex flex-1 flex-col items-center justify-center">
      <div class="relative">
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500 dark:border-gray-700 dark:border-t-sky-400"
        ></div>
      </div>
      <span class="mt-4 text-gray-500 dark:text-gray-400"> 获取天气数据... </span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="relative z-10 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
      <div class="flex items-center gap-3">
        <div class="rounded-full bg-red-100 p-2 dark:bg-red-900/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-red-500"
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
        <p class="text-red-600 dark:text-red-400">{{ error }}</p>
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
            {{ liveWeather.temperature }}
          </span>
          <span class="text-2xl font-light text-gray-400">°C</span>
        </div>
        <span
          class="inline-block rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        >
          {{ liveWeather.weather }}
        </span>
      </div>

      <!-- Current Details -->
      <div class="mb-4 grid grid-cols-3 gap-3">
        <div class="rounded-xl bg-white/50 p-2.5 dark:bg-gray-800/50">
          <div class="mb-1 flex items-center justify-center gap-1 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span class="text-xs">风向</span>
          </div>
          <p class="text-center text-xs font-semibold text-gray-900 dark:text-white">
            {{ liveWeather.winddirection }}
          </p>
        </div>
        <div class="rounded-xl bg-white/50 p-2.5 dark:bg-gray-800/50">
          <div class="mb-1 flex items-center justify-center gap-1 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="text-xs">风力</span>
          </div>
          <p class="text-center text-xs font-semibold text-gray-900 dark:text-white">{{ liveWeather.windpower }}级</p>
        </div>
        <div class="rounded-xl bg-white/50 p-2.5 dark:bg-gray-800/50">
          <div class="mb-1 flex items-center justify-center gap-1 text-gray-400">
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
          <p class="text-center text-xs font-semibold text-gray-900 dark:text-white">{{ liveWeather.humidity }}%</p>
        </div>
      </div>

      <!-- Forecast -->
      <div v-if="forecasts.length > 0" class="flex-1">
        <div class="mb-2 ml-6 flex w-full items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
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
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="day in forecasts.slice(0, 4)"
            :key="day.date"
            class="rounded-lg bg-white/40 p-2 text-center dark:bg-gray-800/40"
          >
            <p class="mb-1 text-xs text-gray-500 dark:text-gray-400">
              {{ day.date }}
            </p>
            <p class="mb-1 text-lg">{{ getWeatherIcon(day.dayweather) }}</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ day.daytemp }}° / {{ day.nighttemp }}°</p>
          </div>
        </div>
        <div>
          <p class="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">更多预报请访问和风天气官网</p>
        </div>
      </div>

      <!-- Update Time -->
      <div class="mt-3 text-center">
        <span class="text-xs text-gray-400"> 更新于 {{ liveWeather.reporttime }} </span>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="relative z-10 flex flex-1 flex-col items-center justify-center py-4">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
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
      <p class="text-gray-600 dark:text-gray-400">查看钓鱼地点的实时天气情况</p>
      <p class="mt-1 text-xs text-gray-400">选择最佳钓鱼时间</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { weatherService } from "@/service/weatherService";
import { onMounted, ref } from "vue";

interface LiveWeather {
  province: string;
  city: string;
  adcode: string;
  weather: string;
  temperature: string;
  winddirection: string;
  windpower: string;
  humidity: string;
  reporttime: string;
}

interface ForecastDay {
  date: string;
  week: string;
  dayweather: string;
  nightweather: string;
  daytemp: string;
  nighttemp: string;
  daywind: string;
  nightwind: string;
  daypower: string;
  nightpower: string;
}

const props = withDefaults(
  defineProps<{
    location?: [number, number];
  }>(),
  {
    location: () => [113.389549, 23.050067],
  },
);

const emit = defineEmits<{
  (
    e: "update",
    payload: {
      liveWeather: LiveWeather;
      forecasts: ForecastDay[];
      locationName: string;
      adcode: string;
    },
  ): void;
}>();

const liveWeather = ref<LiveWeather | null>(null);
const forecasts = ref<ForecastDay[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// 天气图标映射
const getWeatherIcon = (weather: string): string => {
  if (weather.includes("晴")) return "☀️";
  if (weather.includes("多云")) return "⛅";
  if (weather.includes("阴")) return "☁️";
  if (weather.includes("雷")) return "⛈️";
  if (weather.includes("雨")) return "🌧️";
  if (weather.includes("雪")) return "❄️";
  if (weather.includes("风")) return "💨";
  if (weather.includes("雾") || weather.includes("霾")) return "🌫️";
  return "🌤️";
};

// 获取天气信息
const fetchWeather = async (location: [number, number]) => {
  isLoading.value = true;
  error.value = null;

  try {
    // 首先进行逆地理编码获取城市adcode
    const regeoResponse = await weatherService.reverseGeocode({
      location: `${location[0]},${location[1]}`,
      extensions: "base",
    });

    const regeoData = regeoResponse;
    if (regeoData?.status !== "1" || !regeoData?.regeocode?.addressComponent?.adcode) {
      throw new Error("无法获取城市信息");
    }

    const adcode = regeoData.regeocode.addressComponent.adcode;

    // 获取实况天气
    const liveResponse = await weatherService.getWeather({
      city: adcode,
      extensions: "base",
    });

    const liveResult = liveResponse as {
      status: string;
      lives?: Array<{ city: string; temp: string; text: string; windDir: string; humidity: string }>;
    };
    if (liveResult?.status === "1" && liveResult?.lives && liveResult.lives.length > 0) {
      const live = liveResult.lives[0]!;
      liveWeather.value = {
        province: "",
        city: live.city,
        adcode,
        weather: live.text,
        temperature: live.temp,
        winddirection: live.windDir,
        windpower: "",
        humidity: live.humidity,
        reporttime: "",
      };
    } else {
      throw new Error("无法获取天气信息");
    }

    // 获取预报天气
    const forecastResponse = await weatherService.getWeather({
      city: adcode,
      extensions: "all",
    });

    const forecastResult = forecastResponse as {
      status: string;
      forecasts?: Array<{
        casts?: Array<{
          date: string;
          dayWeather: string;
          nightWeather: string;
          dayTemp: string;
          nightTemp: string;
          dayWind: string;
          nightWind: string;
        }>;
      }>;
    };
    if (
      forecastResult?.status === "1" &&
      forecastResult?.forecasts &&
      forecastResult.forecasts.length > 0 &&
      forecastResult.forecasts[0]?.casts
    ) {
      forecasts.value = forecastResult.forecasts[0].casts.map((cast) => ({
        date: cast.date,
        week: "",
        dayweather: cast.dayWeather,
        nightweather: cast.nightWeather,
        daytemp: cast.dayTemp,
        nighttemp: cast.nightTemp,
        daywind: cast.dayWind,
        nightwind: cast.nightWind,
        daypower: "",
        nightpower: "",
      }));
    }

    if (liveWeather.value) {
      emit("update", {
        liveWeather: liveWeather.value,
        forecasts: forecasts.value,
        locationName: liveWeather.value.city || "钓鱼地点",
        adcode,
      });
    }
  } catch (err) {
    console.error("获取天气失败:", err);
    error.value = err instanceof Error ? err.message : "获取天气失败";
  } finally {
    isLoading.value = false;
  }
};

// 打开和风天气
const openQWeather = () => {
  window.open("https://www.qweather.com/", "_blank");
};

onMounted(() => {
  fetchWeather(props.location);
});
</script>
