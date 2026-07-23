<script setup lang="ts">
import { useFishingMapStore } from '@/features/fishing/stores/fishingMap';
import type { FishingIndexData } from '@/features/fishing/types';
import DashboardCard from '@/features/fishing/components/DashboardCard.vue';
import { FishingRod, Loader } from '@lucide/vue';
import { storeToRefs } from 'pinia';

/**
 * Hero 钓鱼指数卡。
 *
 * - 数据来源：fishingMap store（dashboard 主流）
 * - 不再持有 location prop —— 刷新由父级 dashboard composable 调度，
 *   保证用 activeLocation（用户定位 / 默认中心）而不是组件局部默认值
 */
const emit = defineEmits<{
  'feedback-click': [data: FishingIndexData];
  refresh: [];
}>();

const fishingMapStore = useFishingMapStore();
const {
  indexData,
  indexLoading: loading,
  indexError: error,
} = storeToRefs(fishingMapStore);

/** 顶部大数字配色 (text-* 语义 token) */
const levelTextColor: Record<string, string> = {
  爆护: 'text-success',
  好: 'text-ink',
  一般: 'text-warning',
  差: 'text-destructive',
  空军: 'text-muted',
};

/**
 * Gauge 进度条配色 —— 用 Tailwind gradient + 语义 token,避免硬编码 hex
 * 这里只决定 class,实际宽度仍走 inline style (因为依赖运行时 value)
 */
const gaugeGradientClass = (percentage: number): string => {
  if (percentage >= 85) return 'bg-gradient-to-r from-success/70 to-success';
  if (percentage >= 70) return 'bg-gradient-to-r from-accent/70 to-accent';
  if (percentage >= 50) return 'bg-gradient-to-r from-warning/70 to-warning';
  if (percentage <= 30)
    return 'bg-gradient-to-r from-destructive/70 to-destructive';
  return 'bg-gradient-to-r from-accent/50 to-accent/90';
};

const formatFeatureName = (name: string): string => {
  const mapping: Record<string, string> = {
    w1_temp: '气温',
    w2_humidity: '湿度',
    w3_pressure: '气压',
    w4_wind: '风速',
    w5_rain: '降水',
    w6_tide_rising: '涨潮',
    w7_hours_to_tide: '距潮',
    w8_tide_range: '潮差',
    w9_indices: '指数',
  };
  return mapping[name] || name;
};

const handleFeedback = () => {
  if (indexData.value) emit('feedback-click', indexData.value);
};
</script>

<template>
  <DashboardCard tone="hero" padding="default" class="group">
    <!-- 标题 + 刷新 + 图标 -->
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-ink text-lg font-semibold tracking-tight">钓鱼指数</h3>
        <p class="text-muted mt-0.5 text-sm">基于实时天气、潮汐综合计算</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          class="text-muted hover:bg-surface hover:text-ink inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="loading"
          @click="emit('refresh')"
        >
          <Loader v-if="loading" class="h-3 w-3 animate-spin" />
          {{ loading ? '刷新中' : '刷新' }}
        </button>
        <div
          class="bg-accent text-contrast flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition-all duration-300 group-hover:rounded-xl"
        >
          <FishingRod class="h-5 w-5" />
        </div>
      </div>
    </div>

    <!-- 主数据 / loading / error -->
    <p v-if="loading && !indexData" class="text-muted text-sm">加载中...</p>
    <p v-else-if="error && !indexData" class="text-destructive text-sm">
      {{ error }}
    </p>
    <template v-else-if="indexData">
      <div class="mb-4 flex items-end gap-3">
        <span
          class="text-5xl leading-none font-bold tabular-nums"
          :class="levelTextColor[indexData.level] || 'text-muted'"
        >
          {{ indexData.fishing_index }}
        </span>
        <span
          class="mb-1 text-lg font-medium"
          :class="levelTextColor[indexData.level] || 'text-muted'"
        >
          {{ indexData.level }}
        </span>
      </div>

      <!-- 三联指标 -->
      <div class="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div class="bg-surface/40 rounded-lg px-2 py-2">
          <p class="text-muted">默认权重</p>
          <p class="text-ink mt-1 font-medium tabular-nums">
            {{ indexData.expert_score }}
          </p>
        </div>
        <div class="bg-surface/40 rounded-lg px-2 py-2">
          <p class="text-muted">权重调整</p>
          <p class="text-ink mt-1 font-medium tabular-nums">
            {{ indexData.residual > 0 ? '+' : '' }}{{ indexData.residual }}
          </p>
        </div>
        <div class="bg-surface/40 rounded-lg px-2 py-2">
          <p class="text-muted">综合</p>
          <p class="text-ink mt-1 font-medium tabular-nums">
            {{ indexData.fishing_index }}
          </p>
        </div>
      </div>

      <!-- 特征详情 (默认展开,小尺寸) -->
      <details
        v-if="Object.keys(indexData.feature_breakdown).length > 0"
        open
        class="text-xs"
      >
        <summary class="text-muted hover:text-ink cursor-pointer select-none">
          特征详情
        </summary>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <div
            v-for="(value, keyName) in indexData.feature_breakdown"
            :key="keyName"
            class="/60 bg-surface/30 rounded-xl border p-2.5"
          >
            <p class="text-ink">{{ formatFeatureName(keyName) }}</p>
            <div
              class="bg-surface relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
            >
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                :class="gaugeGradientClass(Math.round(value * 100))"
                :style="{ width: `${Math.round(value * 100)}%` }"
              />
            </div>
          </div>
        </div>
      </details>

      <button
        class="bg-accent text-ink hover:bg-accent/90 mt-auto w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        type="button"
        @click="handleFeedback"
      >
        提交钓鱼反馈
      </button>
    </template>
    <p v-else class="text-muted text-sm">暂无数据</p>
  </DashboardCard>
</template>
