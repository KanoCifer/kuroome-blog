<script setup lang="ts">
import { useNotificationStore } from "@/stores/notification";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "motion-v";
import { computed, onUnmounted, ref, watch } from "vue";

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

interface TideData {
  updateTime: string;
  tideTable: { fxTime: string; height: number | string; type: "H" | "L" }[];
  tideHourly: { fxTime: string; height: number | string }[];
}

interface WeatherAnalysisPayload {
  liveWeather?: LiveWeather | null;
  forecasts?: ForecastDay[];
  tideData?: TideData | null;
  locationName?: string;
  tideSpotName?: string;
}

const props = withDefaults(
  defineProps<{
    weather_data?: WeatherAnalysisPayload | null;
    autoAnalyze?: boolean;
  }>(),
  {
    weather_data: null,
    autoAnalyze: false,
  },
);

const notifier = useNotificationStore();
const loading = ref(false);
const summary = ref("");
const hasGenerated = ref(false);
const errorMessage = ref("");
const textShimmer = ref<string[]>(["正在整理天气变化...", "正在评估体感与风况...", "正在结合潮汐节奏..."]);

let shimmerTimer: ReturnType<typeof setInterval> | null = null;
const abortController = ref<AbortController | null>(null);
const lastAutoFingerprint = ref<string>("");

const normalizedData = computed<WeatherAnalysisPayload | null>(() => {
  if (!props.weather_data || typeof props.weather_data !== "object") return null;
  return props.weather_data;
});

const hasInputData = computed(() => {
  const data = normalizedData.value;
  if (!data) return false;
  return Boolean(data.liveWeather || (data.forecasts && data.forecasts.length > 0) || data.tideData);
});

const payload = computed(() => {
  const data = normalizedData.value;
  if (!data) return null;
  return {
    liveWeather: data.liveWeather ?? null,
    forecasts: data.forecasts ?? [],
    tideData: data.tideData ?? null,
    locationName: data.locationName ?? data.liveWeather?.city ?? "钓鱼地点",
    tideSpotName: data.tideSpotName ?? "潮汐点位",
    generatedAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
  };
});

const canGenerate = computed(() => hasInputData.value && !loading.value);

const highTide = computed(() => {
  const tideData = normalizedData.value?.tideData;
  if (!tideData?.tideTable?.length) return null;
  const highs = tideData.tideTable.filter((t) => t.type === "H");
  if (!highs.length) return null;
  let maxEntry = highs[0];
  for (const item of highs) {
    if (Number(item.height) > Number(maxEntry.height)) {
      maxEntry = item;
    }
  }
  return {
    height: Number(maxEntry.height),
    time: dayjs(maxEntry.fxTime).format("HH:mm"),
  };
});

const lowTide = computed(() => {
  const tideData = normalizedData.value?.tideData;
  if (!tideData?.tideTable?.length) return null;
  const lows = tideData.tideTable.filter((t) => t.type === "L");
  if (!lows.length) return null;
  let minEntry = lows[0];
  for (const item of lows) {
    if (Number(item.height) < Number(minEntry.height)) {
      minEntry = item;
    }
  }
  return {
    height: Number(minEntry.height),
    time: dayjs(minEntry.fxTime).format("HH:mm"),
  };
});

const forecastPreview = computed(() => {
  const forecasts = normalizedData.value?.forecasts ?? [];
  return forecasts.slice(0, 2);
});

const statusLabel = computed(() => {
  if (loading.value) return "分析中";
  if (errorMessage.value) return "分析失败";
  if (hasGenerated.value) return "已生成";
  return "待生成";
});

const statusClass = computed(() => {
  if (loading.value) return "bg-blue-500/15 text-blue-700 dark:text-blue-200";
  if (errorMessage.value) return "bg-red-500/15 text-red-600 dark:text-red-300";
  if (hasGenerated.value) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  return "bg-gray-500/10 text-gray-600 dark:text-gray-300";
});

const resetState = () => {
  summary.value = "";
  hasGenerated.value = false;
  errorMessage.value = "";
};

const fetchWeatherAnalysis = async () => {
  if (!payload.value) {
    errorMessage.value = "缺少天气数据，无法分析";
    return;
  }

  if (abortController.value) {
    abortController.value.abort();
  }

  abortController.value = new AbortController();
  loading.value = true;
  errorMessage.value = "";
  summary.value = "";
  hasGenerated.value = false;

  try {
    const response = await fetch("/api/v1/llm/weather-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ weather_data: payload.value }),
      signal: abortController.value.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法获取响应体");
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim() || !part.startsWith("data:")) continue;
        const jsonStr = part.replace(/^data:\s*/, "").trim();
        if (jsonStr === "[DONE]") {
          hasGenerated.value = true;
          break;
        }
        try {
          const data = JSON.parse(jsonStr);
          if (data.content) summary.value += data.content;
          if (data.is_end) hasGenerated.value = true;
        } catch {
          // ignore parse errors
        }
      }
    }
    if (summary.value && !hasGenerated.value) {
      hasGenerated.value = true;
    }
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    errorMessage.value = error instanceof Error ? error.message : "AI 分析失败，请稍后重试";
    notifier.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.weather_data,
  () => {
    resetState();
  },
);

watch(
  () => loading.value,
  (isLoading) => {
    if (isLoading) {
      shimmerTimer = setInterval(() => {
        const first = textShimmer.value.shift();
        if (first) textShimmer.value.push(first);
      }, 1800);
    } else if (shimmerTimer) {
      clearInterval(shimmerTimer);
      shimmerTimer = null;
    }
  },
);

watch(
  [() => props.autoAnalyze, () => payload.value],
  ([autoAnalyze, currentPayload]) => {
    if (!autoAnalyze || !currentPayload || loading.value) return;
    const fingerprint = JSON.stringify(currentPayload);
    if (fingerprint === lastAutoFingerprint.value) return;
    lastAutoFingerprint.value = fingerprint;
    fetchWeatherAnalysis();
  },
  { deep: true },
);

onUnmounted(() => {
  if (abortController.value) abortController.value.abort();
  if (shimmerTimer) clearInterval(shimmerTimer);
});
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4 }"
    class="group squircle relative flex h-full flex-col overflow-hidden border border-white/20 bg-linear-to-br from-white/80 to-white/40 p-6 shadow-lg backdrop-blur-sm transition-all duration-500 dark:border-gray-700/50 dark:from-gray-900/80 dark:to-gray-800/40"
  >
    <div
      class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-linear-to-br from-indigo-300/30 to-sky-500/20 blur-3xl transition-transform duration-700 group-hover:scale-110"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-linear-to-tr from-emerald-300/20 to-cyan-400/10 blur-3xl transition-transform duration-700 group-hover:scale-110"
    ></div>

    <div class="relative z-10 flex items-start justify-between gap-4">
      <div>
        <h3 class="text-lg font-bold tracking-tight text-gray-900 dark:text-white">AI 天气分析</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">结合实时天气与潮汐节奏给出出行建议</p>
      </div>
      <div class="flex flex-col items-end gap-2">
        <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass">
          {{ statusLabel }}
        </span>
        <button
          class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          :disabled="!canGenerate"
          @click="fetchWeatherAnalysis"
        >
          <svg v-if="loading" class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ loading ? "分析中..." : hasGenerated ? "重新分析" : "生成分析" }}
        </button>
      </div>
    </div>

    <div v-if="!hasInputData" class="relative z-10 mt-6 flex flex-1 flex-col items-center justify-center text-center">
      <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-7 w-7 text-gray-400"
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
      <p class="text-sm text-gray-600 dark:text-gray-400">等待天气与潮汐数据加载</p>
      <p class="mt-1 text-xs text-gray-400">数据到位后即可生成分析</p>
    </div>

    <div v-else class="relative z-10 mt-5 flex flex-1 flex-col">
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div class="rounded-xl bg-white/50 p-3 dark:bg-gray-800/50">
          <p class="text-gray-500 dark:text-gray-400">当前天气</p>
          <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {{ normalizedData?.liveWeather?.temperature ?? "--" }}°C
          </p>
          <p class="text-gray-500 dark:text-gray-400">
            {{ normalizedData?.liveWeather?.weather ?? "未知" }}
          </p>
        </div>
        <div class="rounded-xl bg-white/50 p-3 dark:bg-gray-800/50">
          <p class="text-gray-500 dark:text-gray-400">风况与湿度</p>
          <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {{ normalizedData?.liveWeather?.winddirection ?? "--" }}
            {{ normalizedData?.liveWeather?.windpower ?? "--" }}级
          </p>
          <p class="text-gray-500 dark:text-gray-400">湿度 {{ normalizedData?.liveWeather?.humidity ?? "--" }}%</p>
        </div>
        <div class="rounded-xl bg-white/50 p-3 dark:bg-gray-800/50">
          <p class="text-gray-500 dark:text-gray-400">高潮位</p>
          <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {{ highTide ? highTide.height.toFixed(2) : "--" }}m
          </p>
          <p class="text-gray-500 dark:text-gray-400">
            {{ highTide?.time ?? "--:--" }}
          </p>
        </div>
        <div class="rounded-xl bg-white/50 p-3 dark:bg-gray-800/50">
          <p class="text-gray-500 dark:text-gray-400">低潮位</p>
          <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {{ lowTide ? lowTide.height.toFixed(2) : "--" }}m
          </p>
          <p class="text-gray-500 dark:text-gray-400">
            {{ lowTide?.time ?? "--:--" }}
          </p>
        </div>
      </div>

      <div v-if="forecastPreview.length" class="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div
          v-for="day in forecastPreview"
          :key="day.date"
          class="rounded-xl bg-white/40 p-3 text-gray-600 dark:bg-gray-800/40 dark:text-gray-300"
        >
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ day.date }}
          </p>
          <p class="mt-1 font-medium">白天 {{ day.daytemp }}° / 夜间 {{ day.nighttemp }}°</p>
          <p class="text-gray-500 dark:text-gray-400">{{ day.dayweather }} · {{ day.daywind }}</p>
        </div>
      </div>

      <div class="mt-4 h-80 overflow-auto rounded-2xl bg-white/60 p-4 dark:bg-gray-900/60">
        <div class="mb-2 flex items-center gap-2 text-xs text-gray-500">
          <span class="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
          AI 分析输出
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            v-if="loading"
            key="loading"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            <p>{{ textShimmer[0] }}</p>
            <div class="mt-3 space-y-2">
              <div class="h-3 w-full animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/50"></div>
              <div class="h-3 w-5/6 animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/50"></div>
              <div class="h-3 w-2/3 animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/50"></div>
            </div>
          </motion.div>
          <motion.p
            v-else-if="summary"
            key="summary"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="text-sm leading-7 whitespace-pre-line text-gray-700 dark:text-gray-200"
          >
            {{ summary }}<span v-if="loading" class="animate-breathe ml-0.5">|</span>
          </motion.p>
          <motion.div
            v-else
            key="placeholder"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            点击“生成分析”，获取适合外出与钓鱼的天气建议。
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        v-if="errorMessage"
        class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300"
      >
        {{ errorMessage }}
      </div>

      <div class="mt-3 text-xs text-gray-400">
        天气更新: {{ normalizedData?.liveWeather?.reporttime ?? "--" }}
        <span class="mx-2">|</span>
        潮汐更新: {{ normalizedData?.tideData?.updateTime ?? "--" }}
      </div>
    </div>
  </motion.div>
</template>
