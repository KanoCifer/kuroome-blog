<script setup lang="ts">
/* eslint-disable vue/no-v-text-v-html-on-component -- renderedSummary is sanitized via renderMarkdown; motion.div renders a plain div */
/**
 * AI 天气分析 - 抽屉内嵌扁平组件
 *
 * 由 AnalysisDrawer 承载主标题与关闭按钮,本组件只负责:
 * - 顶部工具条: 状态徽章 + 模型选择 + 生成/取消按钮
 * - 中部结果区: 加载态 / 摘要 / 占位 / 无数据
 * - 底部脚注: 数据更新时间
 *
 * 设计原则:
 * - 扁平化嵌入,不再包裹 squircle 外壳(避免与 drawer header 形成两层)
 * - 不重复标题(drawer header 已是「智能分析」)
 * - 严格使用 semantic token,无装饰性光晕
 */
import { useNotificationStore } from '@/stores/notification';
import { formatDate } from '@/utils/formatdate';
import dayjs from 'dayjs';
const apiBase = import.meta.env.VITE_API_BASE || '/';
import { renderMarkdown } from '@/composables/shared';
import { AnimatePresence, motion } from 'motion-v';
import { computed, onUnmounted, ref, watch } from 'vue';

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
    return renderMarkdown(summary.value);
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
  if (hasGenerated.value) return 'bg-success/15 text-success';
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
    const response = await fetch(`${apiBase}/v2/llm/weather-analysis`, {
      method: 'POST',
      credentials: 'include',
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
  <div class="flex h-full flex-col gap-4">
    <!-- 工具条: 状态徽章 + 模型选择 + 主操作 -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span
          class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
        <select
          v-if="!loading"
          v-model="selectedModel"
          class="border-border bg-muted text-foreground min-w-0 truncate rounded-lg border px-2 py-1 text-xs"
          aria-label="选择模型"
        >
          <option v-for="model in AI_MODELS" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>

      <button
        v-if="loading"
        type="button"
        class="bg-destructive text-primary-foreground hover:bg-destructive/90 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition"
        @click="cancelAnalysis"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" />
        </svg>
        取消分析
      </button>
      <button
        v-else
        type="button"
        class="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed"
        :disabled="!canGenerate"
        @click="fetchWeatherAnalysis"
      >
        {{ hasGenerated ? '重新分析' : '生成分析' }}
      </button>
    </div>

    <!-- 无数据空态 -->
    <div
      v-if="!hasInputData"
      class="flex flex-1 flex-col items-center justify-center text-center"
    >
      <div
        class="bg-muted mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="text-muted-foreground h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          />
        </svg>
      </div>
      <p class="text-muted-foreground text-sm">等待天气与潮汐数据加载</p>
      <p class="text-muted-foreground mt-1 text-xs">数据到位后即可生成分析</p>
    </div>

    <!-- 有数据: 结果区 + 脚注 -->
    <div v-else class="flex min-h-0 flex-1 flex-col gap-3">
      <div class="bg-muted/40 flex-1 overflow-auto rounded-xl p-4">
        <div class="text-muted-foreground mb-3 flex items-center gap-2 text-xs">
          <span
            class="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full"
            aria-hidden="true"
          ></span>
          AI 分析输出
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            v-if="loading"
            key="loading"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="text-muted-foreground text-sm"
          >
            <p>{{ textShimmer[0] }}</p>
            <div class="mt-3 space-y-2">
              <div class="bg-muted h-3 w-full animate-pulse rounded"></div>
              <div class="bg-muted h-3 w-5/6 animate-pulse rounded"></div>
              <div class="bg-muted h-3 w-2/3 animate-pulse rounded"></div>
            </div>
          </motion.div>
          <motion.div
            v-else-if="summary"
            key="summary"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="prose prose-sm text-foreground max-w-none"
            v-html="renderedSummary"
          ></motion.div>
          <motion.div
            v-else
            key="placeholder"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            class="text-muted-foreground text-sm"
          >
            点击「生成分析」，获取适合外出与钓鱼的天气建议。
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        v-if="errorMessage"
        class="bg-destructive/10 text-destructive rounded-lg p-3 text-sm"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <div class="text-muted-foreground text-xs leading-relaxed">
        天气更新: {{ formatDate(normalizedData?.liveWeather?.obsTime) ?? '--'
        }}<br />
        潮汐更新: {{ formatDate(normalizedData?.tideData?.updateTime) ?? '--' }}
      </div>
    </div>
  </div>
</template>
