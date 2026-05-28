<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification';
import { formatDate } from '@/utils/formatdate';
import dayjs from 'dayjs';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { AnimatePresence, motion } from 'motion-v';
import { computed, onUnmounted, ref, watch } from 'vue';

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface LiveWeather {
  obsTime: string;
  temp: string;
  text: string;
  windDir: string;
  windScale: string;
  humidity: string;
  icon: string;
}

interface ForecastDay {
  fxDate: string;
  tempMax: string;
  tempMin: string;
  textDay: string;
  iconDay: string;
}

interface TideData {
  updateTime: string;
  tideTable: { fxTime: string; height: number | string; type: 'H' | 'L' }[];
  tideHourly: { fxTime: string; height: number | string }[];
}

interface FishingIndexData {
  fishing_index: number;
  expert_score: number;
  residual: number;
  level: string;
  feature_breakdown: Record<string, number>;
}

interface WeatherAnalysisPayload {
  liveWeather?: LiveWeather | null;
  forecasts?: ForecastDay[];
  tideData?: TideData | null;
  weatherIndices?: Array<Record<string, unknown>>;
  fishingIndex?: FishingIndexData;
  locationName?: string;
  tideSpotName?: string;
}

const AI_MODELS = [
  { id: 'Ling-2.6-1T', name: 'Ling 2.6' },
  { id: 'Ling-2.6-flash', name: 'Ling 2.6 Flash' },
  { id: 'Ring-2.5-1T', name: 'Ring 2.5' },
];

const textShimmer = ref<string[]>([
  '正在整理天气变化...',
  '正在评估体感与风况...',
  '正在结合潮汐节奏...',
]);

const selectedModel = ref(AI_MODELS[0].id);

let shimmerTimer: ReturnType<typeof setInterval> | null = null;
let abortController: AbortController | null = null;

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
const summary = ref('');
const hasGenerated = ref(false);
const errorMessage = ref('');

const renderedSummary = computed(() => {
  if (!summary.value) return '';
  try {
    const rawHtml = marked.parse(summary.value, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  } catch {
    return summary.value;
  }
});
const lastAutoFingerprint = ref<string>('');

const normalizedData = computed<WeatherAnalysisPayload | null>(() => {
  if (!props.weather_data || typeof props.weather_data !== 'object')
    return null;
  return props.weather_data;
});

const hasInputData = computed(() => {
  const data = normalizedData.value;
  if (!data) return false;
  return Boolean(
    data.liveWeather ||
    (data.forecasts && data.forecasts.length > 0) ||
    data.tideData,
  );
});

const payload = computed(() => {
  const data = normalizedData.value;
  if (!data) return null;
  return {
    liveWeather: data.liveWeather ?? null,
    forecasts: data.forecasts ?? [],
    tideData: data.tideData ?? null,
    weatherIndices: data.weatherIndices ?? [],
    fishingIndex: data.fishingIndex ?? undefined,
    locationName: data.locationName ?? '钓鱼地点',
    tideSpotName: data.tideSpotName ?? '潮汐点位',
    generatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  };
});

const canGenerate = computed(() => hasInputData.value && !loading.value);

const statusLabel = computed(() => {
  if (loading.value) return '分析中';
  if (errorMessage.value) return '分析失败';
  if (hasGenerated.value) return '已生成';
  return '待生成';
});

const statusClass = computed(() => {
  if (loading.value) return 'bg-primary/15 text-primary';
  if (errorMessage.value) return 'bg-destructive/15 text-destructive';
  if (hasGenerated.value)
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  return 'bg-muted text-muted-foreground';
});

const resetState = () => {
  summary.value = '';
  hasGenerated.value = false;
  errorMessage.value = '';
};

const fetchWeatherAnalysis = () => {
  if (!payload.value) {
    errorMessage.value = '缺少天气数据，无法分析';
    return;
  }
  void _doFetch();
};

const _doFetch = async () => {
  if (abortController) abortController.abort();

  abortController = new AbortController();
  loading.value = true;
  errorMessage.value = '';
  summary.value = '';
  hasGenerated.value = false;

  try {
    const response = await fetch('/api/v1/llm/weather-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weather_data: payload.value,
        model_id: selectedModel.value,
      }),
      signal: abortController.signal,
    });

    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法获取响应体');

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim() || !part.startsWith('data:')) continue;
        const jsonStr = part.replace(/^data:\s*/, '').trim();
        if (jsonStr === '[DONE]') {
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
    if (summary.value && !hasGenerated.value) hasGenerated.value = true;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    errorMessage.value =
      error instanceof Error ? error.message : 'AI 分析失败，请稍后重试';
    notifier.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
};

const cancelAnalysis = () => {
  abortController?.abort();
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
  if (abortController) abortController.abort();
  if (shimmerTimer) clearInterval(shimmerTimer);
});
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4 }"
    class="group squircle from-card/80 to-card/40 relative flex h-full flex-col overflow-hidden border border-white/20 bg-linear-to-br p-6 shadow-lg backdrop-blur-sm transition-all duration-500 dark:border-gray-700/50 dark:from-gray-900/80 dark:to-gray-800/40"
  >
    <div
      class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-linear-to-br from-indigo-300/30 to-sky-500/20 blur-3xl transition-transform duration-700 group-hover:scale-110"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-linear-to-tr from-emerald-300/20 to-cyan-400/10 blur-3xl transition-transform duration-700 group-hover:scale-110"
    ></div>

    <div class="relative z-10 flex items-start justify-between gap-4">
      <div>
        <h3
          class="text-foreground dark:text-foreground text-lg font-bold tracking-tight"
        >
          AI 天气分析
        </h3>
        <p
          class="text-muted-foreground dark:text-muted-foreground mt-1 text-sm"
        >
          结合实时天气与潮汐节奏给出出行建议
        </p>
      </div>
      <div class="mr-5 flex flex-col items-end gap-2">
        <span
          class="rounded-full px-2.5 py-1 text-xs font-medium"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
        <!-- 模型选择器 -->
        <select
          v-if="!loading"
          v-model="selectedModel"
          class="border-border bg-muted text-foreground dark:border-border dark:bg-card dark:text-foreground rounded-lg border px-2 py-1 text-xs"
        >
          <option v-for="model in AI_MODELS" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>

        <button
          v-if="loading"
          class="bg-destructive text-primary-foreground hover:bg-destructive/90 inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition"
          @click="cancelAnalysis"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <rect
              x="6"
              y="6"
              width="12"
              height="12"
              rx="1"
              fill="currentColor"
            />
          </svg>
          取消分析
        </button>
        <button
          v-else
          class="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          :disabled="!canGenerate"
          @click="fetchWeatherAnalysis"
        >
          {{ hasGenerated ? '重新分析' : '生成分析' }}
        </button>
      </div>
    </div>

    <div
      v-if="!hasInputData"
      class="relative z-10 mt-6 flex flex-1 flex-col items-center justify-center text-center"
    >
      <div
        class="bg-muted dark:bg-card mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="text-muted-foreground h-7 w-7"
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
      <p class="text-secondary-foreground dark:text-muted-foreground text-sm">
        等待天气与潮汐数据加载
      </p>
      <p class="text-muted-foreground mt-1 text-xs">数据到位后即可生成分析</p>
    </div>

    <div v-else class="relative z-10 mt-5 flex flex-1 flex-col">
      <div
        class="bg-card/60 dark:bg-card/60 h-[60vh] max-h-[60vh] overflow-auto rounded-2xl p-4"
      >
        <div class="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
          <span class="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full"></span>
          AI 分析输出
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            v-if="loading"
            key="loading"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="text-muted-foreground dark:text-muted-foreground text-sm"
          >
            <p>{{ textShimmer[0] }}</p>
            <div class="mt-3 space-y-2">
              <div
                class="bg-muted/70 dark:bg-muted/50 h-3 w-full animate-pulse rounded"
              ></div>
              <div
                class="bg-muted/70 dark:bg-muted/50 h-3 w-5/6 animate-pulse rounded"
              ></div>
              <div
                class="bg-muted/70 dark:bg-muted/50 h-3 w-2/3 animate-pulse rounded"
              ></div>
            </div>
          </motion.div>
          <motion.div
            v-else-if="summary"
            key="summary"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="prose prose-sm dark:prose-invert text-foreground dark:text-foreground max-w-none"
            v-html="renderedSummary"
          ></motion.div>
          <motion.div
            v-else
            key="placeholder"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="text-muted-foreground dark:text-muted-foreground text-sm"
          >
            点击“生成分析”，获取适合外出与钓鱼的天气建议。
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        v-if="errorMessage"
        class="bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive mt-3 rounded-xl p-3 text-sm"
      >
        {{ errorMessage }}
      </div>

      <div class="text-muted-foreground mt-3 text-xs">
        天气更新: {{ formatDate(normalizedData?.liveWeather?.obsTime) ?? '--'
        }}<br />
        潮汐更新: {{ formatDate(normalizedData?.tideData?.updateTime) ?? '--' }}
      </div>
    </div>
  </motion.div>
</template>
