<template>
  <div class="bg-background flex min-h-[calc(100dvh-4rem)] flex-col">
    <PageHero
      title="阅读统计"
      subtitle="微信读书 · 你的阅读时间记录"
      size="sm"
      back-fallback="/bookshelf"
    />

    <div class="flex-1 pb-12">
      <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
        <!-- ── Mode Tabs ─────────────────────────────────────────────── -->
        <div class="bg-card mb-4 flex gap-1 rounded-xl p-1">
          <button
            v-for="m in MODES"
            :key="m.key"
            type="button"
            class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            :class="
              activeMode === m.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            "
            @click="switchMode(m.key)"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- ── Period Navigation (hidden in overall) ───────────────── -->
        <div
          v-if="activeMode !== 'overall'"
          class="mb-10 flex items-center justify-between"
        >
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="statsStore.isLoading"
            @click="goPrev"
            aria-label="上一周期"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-4 w-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            上{{ unitLabel }}
          </button>
          <span
            class="text-foreground text-sm font-medium tabular-nums sm:text-base"
          >
            {{ periodLabel }}
          </span>
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="statsStore.isLoading || isAtCurrent"
            @click="goNext"
            aria-label="下一周期"
          >
            下{{ unitLabel }}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-4 w-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="statsStore.isLoading && !activeSnapshot" class="space-y-12">
          <div class="space-y-3">
            <div class="bg-muted h-4 w-24 animate-pulse rounded" />
            <div class="bg-muted h-16 w-3/4 animate-pulse rounded" />
            <div class="bg-muted h-4 w-1/2 animate-pulse rounded" />
          </div>
          <div class="bg-muted h-72 animate-pulse rounded" />
        </div>

        <!-- Error -->
        <div
          v-else-if="statsStore.error && !activeSnapshot"
          class="flex flex-col items-center justify-center py-20"
        >
          <p class="text-destructive mb-4 text-center text-sm">
            {{ statsStore.error }}
          </p>
          <button
            type="button"
            class="bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl px-5 py-2 text-sm font-medium transition-colors"
            @click="reloadCurrent"
          >
            重试
          </button>
        </div>

        <!-- ── Empty (period has no data) ─────────────────────────── -->
        <div
          v-else-if="activeSnapshot && !hasAnyData"
          class="text-muted-foreground py-20 text-center font-serif text-lg"
        >
          这{{ unitLabel }}还没有阅读记录。
        </div>

        <template v-else-if="activeSnapshot">
          <!-- ── 段落一：你读了多少 ─────────────────────────────── -->
          <section class="mb-14">
            <p class="text-muted-foreground mb-3 text-sm">
              {{ paragraphOneEyebrow }}
            </p>
            <p
              class="text-foreground font-serif text-5xl leading-tight font-bold tracking-tight tabular-nums sm:text-6xl md:text-7xl"
            >
              {{ formatDuration(activeSnapshot.totalReadTime) }}
            </p>
            <p class="text-muted-foreground mt-4 text-base sm:text-lg">
              {{ paragraphOneSubtitle }}
            </p>
          </section>

          <!-- ── 段落二：让你停不下来的是 ─────────────────────────── -->
          <StatsTopBooksSection
            v-if="topReadLongest.length"
            :books="topReadLongest"
            :bar-percent="longestBarPercent"
            :format-duration="formatDuration"
          />

          <!-- ── 段落三：你的阅读节奏 ─────────────────────────────── -->
          <StatsRhythmSection
            v-if="hasRhythmData"
            :snapshot="activeSnapshot"
            :has-trend-data="hasTrendData"
            :has-prefer-time-data="hasPreferTimeData"
            :has-read-listen-data="hasReadListenData"
            :trend-subtitle="trendSubtitle"
            :prefer-time-subtitle="preferTimeSubtitle"
            :read-listen-subtitle="readListenSubtitle"
            :trend-option="trendOption"
            :prefer-time-option="preferTimeOption"
            :read-percent="readPercent"
            :listen-percent="listenPercent"
            :format-duration="formatDuration"
          />

          <!-- ── 段落四：你偏好的 ─────────────────────────────────── -->
          <StatsPreferencesSection
            v-if="hasPreferenceData"
            :categories="topCategories"
            :authors="topAuthors"
            :publishers="topPublishers"
          />

          <!-- ── 段落 4.5：接下来读什么（推荐） ───────────────────── -->
          <StatsRecommendSection
            :books="statsStore.recommends"
            :loading="statsStore.isLoadingRecommends"
            :has-more="statsStore.hasMoreRecommends"
            :error="statsStore.recommendError"
            @refresh="reloadRecommends"
            @load-more="loadMoreRecommends"
          />

          <!-- ── 段落五（仅累计模式）：阅读概览 ─────────────────── -->
          <section
            v-if="
              activeMode === 'overall' &&
              activeSnapshot.readStat &&
              activeSnapshot.readStat.length
            "
            class="border-border mb-4 grid grid-cols-2 gap-x-6 gap-y-6 border-t pt-10 sm:grid-cols-4"
          >
            <div
              v-for="stat in activeSnapshot.readStat"
              :key="stat.label"
              class="text-left"
            >
              <p
                class="text-foreground font-serif text-3xl font-bold tabular-nums sm:text-4xl"
              >
                {{ stat.value }}
              </p>
              <p class="text-muted-foreground mt-1 text-xs sm:text-sm">
                {{ stat.label }}
              </p>
            </div>
          </section>

          <!-- Footer meta -->
          <StatsRefreshFooter
            :last-refreshed-at="lastRefreshedAt"
            :loading="statsStore.isLoading"
            @refresh="reloadCurrent"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReadStatsMode } from '@/api/wereadGateway';
import { useReadStatsStore } from '@/stores/readStats';
import { formatDuration } from '@/utils/format/duration';
import PageHero from '@/components/shared/PageHero.vue';
import dayjs from 'dayjs';
import { onMounted, ref, watch } from 'vue';
import StatsPreferencesSection from './bookStats/components/StatsPreferencesSection.vue';
import StatsRecommendSection from './bookStats/components/StatsRecommendSection.vue';
import StatsRefreshFooter from './bookStats/components/StatsRefreshFooter.vue';
import StatsRhythmSection from './bookStats/components/StatsRhythmSection.vue';
import StatsTopBooksSection from './bookStats/components/StatsTopBooksSection.vue';
import { useEChartsTheme } from './bookStats/composables/useEChartsTheme';
import { usePeriodNavigation } from './bookStats/composables/usePeriodNavigation';
import { useStatsView } from './bookStats/composables/useStatsView';

const MODES = [
  { key: 'weekly', label: '本周' },
  { key: 'monthly', label: '本月' },
  { key: 'annually', label: '本年' },
  { key: 'overall', label: '累计' },
] as const satisfies ReadonlyArray<{ key: ReadStatsMode; label: string }>;

const statsStore = useReadStatsStore();

// 解构出顶层 ref / 函数，模板里直接用(自动 unwrap)
const {
  activeMode,
  activeSnapshot,
  isAtCurrent,
  unitLabel,
  periodLabel,
  goPrev,
  goNext,
  switchMode,
  reloadCurrent,
} = usePeriodNavigation(statsStore);

const theme = useEChartsTheme();

const {
  paragraphOneEyebrow,
  paragraphOneSubtitle,
  topReadLongest,
  longestBarPercent,
  hasTrendData,
  hasPreferTimeData,
  hasReadListenData,
  hasRhythmData,
  trendSubtitle,
  preferTimeSubtitle,
  readListenSubtitle,
  readPercent,
  listenPercent,
  trendOption,
  preferTimeOption,
  topCategories,
  topAuthors,
  topPublishers,
  hasPreferenceData,
  hasAnyData,
} = useStatsView(activeSnapshot, activeMode, theme);

// ── Refresh tracking ──────────────────────────────────────────
const lastRefreshedAt = ref<dayjs.Dayjs | null>(null);

watch(
  () => activeSnapshot.value?.fetched_at,
  (val) => {
    if (val) lastRefreshedAt.value = dayjs(val);
  },
  { immediate: true },
);

onMounted(() => {
  // 初次加载：当前周期
  if (!activeSnapshot.value) {
    statsStore.fetchStats(activeMode.value, null);
  }
  // 推荐独立拉取（不绑定 mode）
  if (statsStore.recommends.length === 0) {
    statsStore.fetchRecommends(true);
  }
});

function reloadRecommends() {
  statsStore.fetchRecommends(true);
}

function loadMoreRecommends() {
  statsStore.fetchRecommends(false);
}
</script>
