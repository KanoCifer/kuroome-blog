<template>
  <div class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800/80">
    <h2 class="mb-4 text-lg font-bold text-gray-800 dark:text-gray-100">
      <icon-analytics class="inline-block size-6" /> Browser Distribution
    </h2>
    <div
      v-if="loading && !browserStats"
      class="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"
    ></div>
    <div v-else class="h-72 w-full overflow-hidden">
      <v-chart :option="browserChartOption" autoresize class="h-full w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconAnalytics from "@/components/icons/IconAnalytics.vue";
import { PieChart } from "echarts/charts";
import {
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
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
]);

interface BrowserStat {
  browser_name: string;
  browser_version: string;
  count: number;
}

interface Props {
  loading: boolean;
  browserStats: BrowserStat[] | null;
}

const props = defineProps<Props>();

const browserChartOption = computed(() => {
  const data = props.browserStats ?? [];

  const colorPalette = [
    "#3b82f6", // Chrome 蓝
    "#ea4335", // Edge/Google 红
    "#4285f4", // Firefox 蓝
    "#fbbd00", // Safari 黄
    "#00bfa5", // Opera 青
    "#7b1fa2", // IE 紫
    "#f06292", // 其他浏览器 粉
    "#ff9800", // 橙
  ];

  return {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e5e7eb",
      textStyle: {
        color: "#374151",
      },
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      left: "left",
      top: "center",
      textStyle: {
        color: "#6b7280",
      },
    },
    series: [
      {
        name: "Browser",
        type: "pie",
        radius: ["40%", "70%"],
        center: ["65%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: "bold",
          },
        },
        labelLine: {
          show: false,
        },
        data: data.map((item, index) => ({
          value: item.count,
          name: item.browser_name ? `${item.browser_name} ${item.browser_version || ''}`.trim() : "Unknown",
          itemStyle: {
            color: colorPalette[index % colorPalette.length],
          },
        })),
      },
    ],
  };
});
</script>

<style scoped></style>
