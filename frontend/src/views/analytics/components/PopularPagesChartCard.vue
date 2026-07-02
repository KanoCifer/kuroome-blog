<template>
  <div
    class="border-border/60 bg-background h-full rounded-3xl border p-6 shadow-sm"
  >
    <h2 class="text-foreground mb-2 flex items-center gap-2 text-lg font-bold">
      <icon-popular class="size-6" /> Popular Pages
    </h2>
    <p class="text-muted-foreground mb-4 text-xs">
      Top 8 by views in selected period
    </p>
    <div
      v-if="loading && !overviewData"
      class="bg-muted h-full min-h-[18rem] animate-pulse rounded-xl"
    ></div>
    <!-- Empty state -->
    <div
      v-else-if="!hasPagesData"
      class="flex min-h-[18rem] flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <div
        class="bg-muted text-muted-foreground/50 flex h-12 w-12 items-center justify-center rounded-full"
      >
        <icon-popular class="size-6" />
      </div>
      <p class="text-foreground text-sm font-medium">No page views yet</p>
      <p class="text-muted-foreground max-w-xs text-xs">
        The most-visited pages will appear here once your site starts receiving
        traffic.
      </p>
    </div>
    <div v-else class="h-full min-h-[18rem] w-full overflow-hidden">
      <v-chart :option="popularPagesChartOption" autoresize />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconPopular from '@/components/icons/IconPopular.vue';
import { useChartColors, withAlpha } from '@/composables/shared';
import { computed } from 'vue';
import VChart from 'vue-echarts';

const MAX_ITEMS = 8;

interface OverviewData {
  top_pages: { page_path: string; count: number }[];
  [key: string]: unknown;
}

const props = defineProps<{
  loading: boolean;
  overviewData: OverviewData | null;
}>();

const { palette } = useChartColors();

const hasPagesData = computed(
  () => (props.overviewData?.top_pages ?? []).length > 0,
);

interface PageRow {
  page_path: string;
  count: number;
}

const chartData = computed<PageRow[]>(() => {
  const pages = props.overviewData?.top_pages ?? [];
  // Sort asc so largest bar sits at the top of the horizontal chart.
  const sorted = [...pages].sort((a, b) => a.count - b.count);
  if (sorted.length <= MAX_ITEMS) return sorted;
  const head = sorted.slice(0, MAX_ITEMS - 1);
  const othersCount = sorted
    .slice(MAX_ITEMS - 1)
    .reduce((sum, it) => sum + it.count, 0);
  return [...head, { page_path: 'Other', count: othersCount }];
});

const popularPagesChartOption = computed(() => {
  const p = palette.value;
  const rows = chartData.value;
  const data = rows.map((r) => r.count);
  const maxVal = Math.max(...data, 1);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      backgroundColor: p.card,
      borderColor: p.border,
      borderWidth: 1,
      textStyle: { color: p.foreground },
      formatter: (params: unknown) => {
        const arr = params as Array<{ name: string; value: number }>;
        const it = arr[0];
        if (!it) return '';
        return `<div style="font-weight:600;color:${p.foreground};">${it.name}</div><div style="color:${p.mutedForeground};margin-top:2px;">${it.value.toLocaleString()} views</div>`;
      },
    },
    grid: {
      left: 0,
      right: 48,
      bottom: 0,
      top: 0,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      show: false,
      max: maxVal * 1.15,
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((r) => r.page_path),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: p.foreground,
        fontSize: 11,
        fontWeight: 500,
      },
    },
    series: [
      {
        name: 'Views',
        type: 'bar',
        data,
        barMaxWidth: 20,
        itemStyle: {
          color: p.series[0],
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: p.mutedForeground,
          fontSize: 11,
          fontWeight: 600,
          distance: 8,
          formatter: (params: { value: number }) =>
            params.value.toLocaleString(),
        },
      },
    ],
  };
});
</script>
