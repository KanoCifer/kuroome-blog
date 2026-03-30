<template>
  <div class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800/80">
    <h2 class="mb-4 text-lg font-bold text-gray-800 dark:text-gray-100">
      <icon-trend class="inline-block size-6" /> Trend (Last
      {{ selectedDays }} days)
    </h2>
    <div
      v-if="loading && !overviewData"
      class="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"
    ></div>
    <div v-else class="h-72 w-full overflow-hidden">
      <v-chart :option="trendChartOption" autoresize class="h-full w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconTrend from "@/components/icons/IconTrend.vue";
import dayjs from "dayjs";
import { LineChart } from "echarts/charts";
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
  LineChart,
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
  selectedDays: number;
}>();

const trendChartOption = computed(() => {
  const data = props.overviewData?.daily_trend ?? [];
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return {
    tooltip: {
      trigger: "axis",
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
      type: "category",
      boundaryGap: false,
      data: sortedData.map((d) => d.date),
      axisLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      axisLabel: {
        color: "#6b7280",
        formatter: (value: string) => dayjs(value).format("MM/DD"),
      },
    },
    yAxis: {
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
    series: [
      {
        name: "Visits",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: "#3b82f6",
        },
        itemStyle: {
          color: "#3b82f6",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59, 130, 246, 0.3)" },
              { offset: 1, color: "rgba(59, 130, 246, 0.05)" },
            ],
          },
        },
        data: sortedData.map((d) => d.count),
      },
    ],
  };
});
</script>
