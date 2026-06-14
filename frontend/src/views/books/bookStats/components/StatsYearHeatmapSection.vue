<script setup lang="ts">
import type { ReadDetailSnapshot, ReadStatsMode } from '@/api/wereadGateway';
import { computed, toRef } from 'vue';
import VChart from 'vue-echarts';
import { useEChartsTheme } from '../composables/useEChartsTheme';
import { useYearHeatmapView } from '../composables/useYearHeatmapView';

const props = defineProps<{
  snapshot: ReadDetailSnapshot;
  mode: ReadStatsMode;
}>();

// 把非 ref 的 props 包成 ref,让 narrow composable 可以订阅
const snapshotRef = toRef(props, 'snapshot');
const modeRef = toRef(props, 'mode');
const theme = useEChartsTheme();

const { hasData, subtitle, heatmapOption } = useYearHeatmapView(
  snapshotRef,
  modeRef,
  theme,
);

const visible = computed(() => hasData.value);
</script>

<template>
  <section v-if="visible" class="mb-14">
    <h2
      class="text-foreground font-serif text-2xl font-semibold tracking-tight sm:text-3xl"
    >
      本年的阅读足迹
    </h2>
    <p class="text-muted-foreground mt-2 mb-4 text-sm">
      {{ subtitle }}
    </p>
    <div class="h-44 sm:h-48">
      <v-chart :option="heatmapOption" autoresize />
    </div>
  </section>
</template>
