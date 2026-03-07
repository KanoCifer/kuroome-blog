<template>
  <div class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800/80">
    <h2 class="mb-4 text-lg font-bold text-gray-800 dark:text-gray-100">
      <icon-popular class="inline-block size-6 dark:text-gray-50" /> Popular
      Pages
    </h2>
    <div
      v-if="loading && !overviewData"
      class="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"
    ></div>
    <div v-else class="h-full w-full overflow-hidden">
      <v-chart :option="popularPagesChartOption" autoresize />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconPopular from "@/components/icons/IconPopular.vue";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed } from "vue";
import VChart from "vue-echarts";

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

interface DailyTrend {
  date: string;
  count: number;
}

interface TopPage {
  page_path: string;
  count: number;
}

interface OverviewData {
  total_visits: number;
  unique_visitors: number;
  unique_visitor_ids: number;
  top_pages: TopPage[];
  browser_stats: { browser: string; count: number }[];
  daily_trend: DailyTrend[];
  period_days: number;
}

const props = defineProps<{
  loading: boolean;
  overviewData: OverviewData | null;
}>();

const popularPagesChartOption = computed(() => {
  const pages = props.overviewData?.top_pages ?? [];
  const sortedPages = [...pages].reverse();

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e5e7eb",
      textStyle: {
        color: "#374151",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: "#6b7280",
      },
      splitLine: {
        lineStyle: {
          color: "#f3f4f6",
        },
      },
    },
    yAxis: {
      type: "category",
      data: sortedPages.map((p) => p.page_path || "/"),
      axisLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
        width: 120,
        overflow: "truncate",
      },
    },
    series: [
      {
        name: "Views",
        type: "bar",
        barWidth: "60%",
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "rgba(255, 101, 0, 0.8)" },
              { offset: 1, color: "rgba(255, 190, 147, 0.8)" },
            ],
          },
        },
        data: sortedPages.map((p) => p.count),
      },
    ],
  };
});
</script>
