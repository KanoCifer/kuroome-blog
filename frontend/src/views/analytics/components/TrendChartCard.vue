<template>
  <div
    class="border-border/60 bg-background h-full rounded-3xl border p-6 shadow-sm"
  >
    <h2 class="text-foreground mb-4 flex items-center gap-2 text-lg font-bold">
      <icon-trend class="size-6" /> Visits Trend (Last {{ selectedDays }} days)
    </h2>
    <div
      v-if="loading && !overviewData"
      class="bg-muted h-80 animate-pulse rounded-xl"
    ></div>
    <!-- Empty state -->
    <div
      v-else-if="!hasTrendData"
      class="flex h-80 flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <div
        class="bg-muted text-muted-foreground/50 flex h-12 w-12 items-center justify-center rounded-full"
      >
        <icon-trend class="size-6" />
      </div>
      <p class="text-foreground text-sm font-medium">No visits recorded yet</p>
      <p class="text-muted-foreground max-w-xs text-xs">
        Visit data for the last {{ selectedDays }} days will appear here once
        your site starts receiving traffic.
      </p>
    </div>
    <div v-else class="h-80 w-full overflow-hidden">
      <v-chart :option="trendChartOption" autoresize class="h-full w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconTrend from '@/components/icons/IconTrend.vue';
import { useChartColors, withAlpha } from '@/composables/shared';
import dayjs from 'dayjs';
import { computed } from 'vue';
import VChart from 'vue-echarts';

interface OverviewData {
  daily_trend: { date: string; count: number }[];
  period_days: number;
  [key: string]: unknown;
}

const props = defineProps<{
  loading: boolean;
  overviewData: OverviewData | null;
  selectedDays: number;
}>();

const { palette } = useChartColors();

const hasTrendData = computed(
  () => (props.overviewData?.daily_trend ?? []).length > 0,
);

const trendChartOption = computed(() => {
  const p = palette.value;
  const data = props.overviewData?.daily_trend ?? [];
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const stroke = p.series[0];

  return {
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: p.card,
      borderColor: p.border,
      borderWidth: 1,
      textStyle: { color: p.foreground },
      axisPointer: {
        type: 'line',
        lineStyle: { color: withAlpha(p.foreground, 0.18), width: 1 },
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: sortedData.map((d) => d.date),
      axisLine: { lineStyle: { color: p.border } },
      axisLabel: {
        color: p.mutedForeground,
        formatter: (value: string) => dayjs(value).format('MM/DD'),
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: p.mutedForeground },
      splitLine: { lineStyle: { color: withAlpha(p.border, 0.45) } },
    },
    series: [
      {
        name: 'Visits',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2, color: stroke, cap: 'round' },
        itemStyle: { color: stroke },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(stroke, 0.22) },
              { offset: 1, color: withAlpha(stroke, 0.02) },
            ],
          },
        },
        data: sortedData.map((d) => d.count),
      },
    ],
  };
});
</script>
