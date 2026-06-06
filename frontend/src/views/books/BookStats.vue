<template>
  <div class="bg-background flex min-h-[calc(100dvh-4rem)] flex-col">
    <!-- Hero Image Section -->
    <div class="relative h-[30vh] flex-shrink-0 overflow-hidden md:h-[35vh]">
      <img
        src="/card/card-1.jpeg"
        alt=""
        class="h-full w-full object-cover"
      />
      <div
        class="from-background/40 via-background/5 to-background pointer-events-none absolute inset-0 bg-gradient-to-b"
      />

      <!-- Back Button -->
      <div
        class="absolute top-0 right-0 left-0 z-10 flex items-center px-4 py-4 md:px-6"
      >
        <button
          type="button"
          class="border-border bg-card/60 hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors"
          @click="handleBack"
          aria-label="返回"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="text-foreground h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
      </div>

      <!-- Refresh Button -->
      <div
        class="absolute top-0 right-0 z-10 flex items-center px-4 py-4 md:px-6"
      >
        <button
          type="button"
          class="border-border bg-card/60 hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors"
          :class="{ 'animate-spin': statsStore.isLoading }"
          @click="handleRefresh"
          aria-label="刷新统计"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="text-foreground h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
        </button>
      </div>

      <!-- Title Overlay -->
      <div
        class="absolute right-0 bottom-0 left-0 z-10 px-6 pb-6 md:px-10 md:pb-8"
      >
        <h1
          class="font-serif text-3xl font-bold text-white drop-shadow-lg md:text-5xl"
        >
          阅读统计
        </h1>
        <div class="mt-2 flex items-center gap-3">
          <span class="text-sm text-white/75 md:text-base">微信读书</span>
          <span class="h-1 w-1 rounded-full bg-white/40" />
          <span class="text-sm text-white/75 md:text-base">
            {{ activeModeLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Stats Content -->
    <div class="flex-1 pb-8">
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-10">
        <!-- Loading skeleton -->
        <div v-if="statsStore.isLoading && !activeSnapshot" class="space-y-6">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div v-for="i in 4" :key="i" class="animate-pulse">
              <div class="bg-muted h-24 rounded-xl" />
            </div>
          </div>
          <div class="bg-muted h-80 animate-pulse rounded-xl" />
        </div>

        <!-- Error state -->
        <div
          v-else-if="statsStore.error"
          class="flex flex-col items-center justify-center py-20"
        >
          <p class="text-destructive mb-4 text-center text-sm">
            {{ statsStore.error }}
          </p>
          <button
            type="button"
            class="bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl px-5 py-2 text-sm font-medium transition-colors"
            @click="statsStore.fetchStats()"
          >
            重试
          </button>
        </div>

        <template v-else-if="activeSnapshot">
          <!-- Mode Tabs -->
          <div class="mb-6 flex gap-1 rounded-xl bg-card p-1">
            <button
              v-for="mode in modes"
              :key="mode.key"
              type="button"
              class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              :class="
                activeMode === mode.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              "
              @click="activeMode = mode.key"
            >
              {{ mode.label }}
            </button>
          </div>

          <!-- Summary Cards -->
          <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div class="bg-card rounded-xl p-4">
              <p class="text-muted-foreground mb-1 text-xs">总阅读时长</p>
              <p class="text-foreground text-2xl font-bold">
                {{ formatDuration(activeSnapshot.totalReadTime) }}
              </p>
            </div>
            <div class="bg-card rounded-xl p-4">
              <p class="text-muted-foreground mb-1 text-xs">阅读天数</p>
              <p class="text-foreground text-2xl font-bold">
                {{ activeSnapshot.readDays ?? 0 }}
                <span class="text-muted-foreground text-sm font-normal">天</span>
              </p>
            </div>
            <div class="bg-card rounded-xl p-4">
              <p class="text-muted-foreground mb-1 text-xs">日均时长</p>
              <p class="text-foreground text-2xl font-bold">
                {{ formatDuration(activeSnapshot.dayAverageReadTime) }}
              </p>
            </div>
            <div class="bg-card rounded-xl p-4">
              <p class="text-muted-foreground mb-1 text-xs">环比变化</p>
              <p
                class="text-2xl font-bold"
                :class="
                  (activeSnapshot.compare ?? 0) >= 0
                    ? 'text-success'
                    : 'text-destructive'
                "
              >
                {{ formatCompare(activeSnapshot.compare) }}
              </p>
            </div>
          </div>

          <!-- Trend Chart -->
          <div
            v-if="activeSnapshot.readTimes"
            class="bg-card mb-6 rounded-xl p-4 sm:p-6"
          >
            <h3 class="text-foreground mb-4 text-sm font-medium">阅读趋势</h3>
            <div class="h-64 sm:h-80">
              <v-chart :option="trendOption" autoresize />
            </div>
          </div>

          <!-- Read Longest Chart -->
          <div
            v-if="
              activeSnapshot.readLongest && activeSnapshot.readLongest.length > 0
            "
            class="bg-card mb-6 rounded-xl p-4 sm:p-6"
          >
            <h3 class="text-foreground mb-4 text-sm font-medium">
              阅读排行
            </h3>
            <div class="h-64 sm:h-80">
              <v-chart :option="longestOption" autoresize />
            </div>
          </div>

          <!-- Two-column: Category + Time Distribution -->
          <div class="mb-6 grid gap-6 lg:grid-cols-2">
            <!-- Prefer Category -->
            <div
              v-if="
                activeSnapshot.preferCategory &&
                activeSnapshot.preferCategory.length > 0
              "
              class="bg-card rounded-xl p-4 sm:p-6"
            >
              <h3 class="text-foreground mb-4 text-sm font-medium">
                分类偏好
              </h3>
              <div class="h-64 sm:h-72">
                <v-chart :option="categoryOption" autoresize />
              </div>
            </div>

            <!-- Prefer Time -->
            <div
              v-if="activeSnapshot.preferTime"
              class="bg-card rounded-xl p-4 sm:p-6"
            >
              <h3 class="text-foreground mb-4 text-sm font-medium">
                时段分布
              </h3>
              <div class="h-64 sm:h-72">
                <v-chart :option="preferTimeOption" autoresize />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReadDetailSnapshot } from '@/api/wereadGateway';
import { useReadStatsStore } from '@/stores/readStats';
import dayjs from 'dayjs';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import VChart from 'vue-echarts';

const router = useRouter();
const statsStore = useReadStatsStore();

const modes = [
  { key: 'weekly', label: '本周' },
  { key: 'monthly', label: '本月' },
  { key: 'annually', label: '本年' },
  { key: 'overall', label: '累计' },
] as const;

type ModeKey = (typeof modes)[number]['key'];

const activeMode = ref<ModeKey>('weekly');

const activeModeLabel = computed(
  () => modes.find((m) => m.key === activeMode.value)?.label ?? '',
);

const activeSnapshot = computed(
  () => statsStore.snapshotByMode[activeMode.value] ?? null,
);

// Dark mode detection
const isDark = ref(document.documentElement.classList.contains('dark'));
let observer: MutationObserver | null = null;

onMounted(() => {
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark');
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
});
onUnmounted(() => observer?.disconnect());

// Colors — ECharts CanvasGradient requires hex/rgb, not oklch
const textColor = computed(() => (isDark.value ? '#e5e7eb' : '#1f2937'));
const subtextColor = computed(() => (isDark.value ? '#9ca3af' : '#6b7280'));
const axisColor = computed(() => (isDark.value ? '#4b5563' : '#d1d5db'));
const splitLineColor = computed(() =>
  isDark.value ? '#374151' : '#f3f4f6',
);

const primaryColor = computed(() =>
  isDark.value ? '#60a5fa' : '#3b82f6',
);
const primaryRgba = computed(() =>
  isDark.value ? 'rgba(96,165,250,' : 'rgba(59,130,246,',
);

const PALETTE = [
  '#3b82f6',
  '#34d399',
  '#f97316',
  '#06b6d4',
  '#ec4899',
  '#22c55e',
  '#eab308',
  '#8b5cf6',
];

// ── Helpers ──

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatCompare(val: number | null): string {
  if (val == null) return '--';
  const pct = (val * 100).toFixed(1);
  return val >= 0 ? `+${pct}%` : `${pct}%`;
}

function formatTimestamp(ts: string): string {
  const d = dayjs.unix(Number(ts));
  if (!d.isValid()) return ts;
  return d.format('MM/DD');
}

// ── Trend chart ──

const trendOption = computed(() => {
  const readTimes = activeSnapshot.value?.readTimes;
  if (!readTimes) return {};
  const entries = Object.entries(readTimes).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: entries.map(([k]) => formatTimestamp(k)),
      axisLine: { lineStyle: { color: axisColor.value } },
      axisLabel: { color: subtextColor.value },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { color: subtextColor.value },
      axisLabel: {
        color: subtextColor.value,
        formatter: (v: number) => `${Math.round(v / 60)}`,
      },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    series: [
      {
        type: 'line',
        data: entries.map(([, v]) => v),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: primaryColor.value, width: 2 },
        itemStyle: { color: primaryColor.value },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: primaryRgba.value + '0.25)' },
              { offset: 1, color: primaryRgba.value + '0.02)' },
            ],
          },
        },
      },
    ],
  };
});

// ── Read longest chart ──

const longestOption = computed(() => {
  const items = activeSnapshot.value?.readLongest ?? [];
  if (!items.length) return {};
  const sorted = [...items]
    .sort((a, b) => a.readTime - b.readTime)
    .slice(-10);
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `${p.name}<br/>${formatDuration(p.value)}`;
      },
    },
    grid: { left: 120, right: 40, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { color: subtextColor.value },
      axisLabel: {
        color: subtextColor.value,
        formatter: (v: number) => `${Math.round(v / 60)}`,
      },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((i) => i.title ?? ''),
      axisLine: { lineStyle: { color: axisColor.value } },
      axisLabel: {
        color: textColor.value,
        width: 100,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((i) => i.readTime),
        barMaxWidth: 24,
        itemStyle: {
          color: primaryColor.value,
          borderRadius: [0, 6, 6, 0],
        },
      },
    ],
  };
});

// ── Category chart ──

const categoryOption = computed(() => {
  const cats = activeSnapshot.value?.preferCategory ?? [];
  if (!cats.length) return {};
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>${formatDuration(p.value)} (${p.percent}%)`,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: cats.map((c, i) => ({
          name: c.categoryTitle,
          value: c.readingTime,
          itemStyle: { color: PALETTE[i % PALETTE.length] },
        })),
        label: {
          color: textColor.value,
          fontSize: 12,
          formatter: '{b}\n{d}%',
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' },
        },
      },
    ],
  };
});

// ── Prefer time chart ──

const preferTimeOption = computed(() => {
  const times = activeSnapshot.value?.preferTime;
  if (!times || !times.length) return {};
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: times.map((_, i) => `${String(i).padStart(2, '0')}:00`),
      axisLine: { lineStyle: { color: axisColor.value } },
      axisLabel: {
        color: subtextColor.value,
        interval: 3,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: subtextColor.value },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    series: [
      {
        type: 'bar',
        data: times,
        barMaxWidth: 16,
        itemStyle: {
          color: primaryColor.value,
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
});

// ── Actions ──

function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/bookshelf');
  }
}

function handleRefresh() {
  statsStore.fetchStats(true);
}

onMounted(() => {
  if (!statsStore.snapshots.length) {
    statsStore.fetchStats();
  }
});

// Reset tab when data changes
watch(
  () => statsStore.snapshotByMode,
  (byMode) => {
    if (!byMode[activeMode.value] && Object.keys(byMode).length) {
      activeMode.value = Object.keys(byMode)[0] as ModeKey;
    }
  },
);
</script>
