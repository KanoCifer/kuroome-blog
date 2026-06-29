<template>
  <div
    class="border-border/60 bg-background h-full rounded-3xl border p-6 shadow-sm"
  >
    <h2 class="text-foreground flex items-center gap-2 text-lg font-bold">
      <icon-popular class="size-6" /> Popular Pages
    </h2>
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
import { computed } from 'vue';
import VChart from 'vue-echarts';

interface OverviewData {
  total_visits: number;
  unique_visitors: number;
  unique_visitor_ids: number;
  top_pages: { page_path: string; count: number }[];
  browser_stats: {
    browser_name: string;
    browser_version: string;
    count: number;
  }[];
  os_stats: { os_name: string; count: number }[];
  daily_trend: { date: string; count: number }[];
  period_days: number;
}

const props = defineProps<{
  loading: boolean;
  overviewData: OverviewData | null;
}>();

const hasPagesData = computed(
  () => (props.overviewData?.top_pages ?? []).length > 0,
);

const popularPagesChartOption = computed(() => {
  const pages = props.overviewData?.top_pages ?? [];
  const sortedPages = [...pages].reverse();

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: {
        color: '#374151',
      },
    },
    grid: {
      left: 0,
      right: 0,
      bottom: 0,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: '#6b7280',
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: sortedPages.map((p) => p.page_path || '/'),
      axisLine: {
        lineStyle: {
          color: '#e5e7eb',
        },
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 11,
        width: 40,
        overflow: 'truncate',
      },
    },
    series: [
      {
        name: 'Views',
        type: 'bar',
        barWidth: '60%',
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(255, 101, 0, 0.8)' },
              { offset: 1, color: 'rgba(255, 190, 147, 0.8)' },
            ],
          },
        },
        data: sortedPages.map((p) => p.count),
      },
    ],
  };
});
</script>
