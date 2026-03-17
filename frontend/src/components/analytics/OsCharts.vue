<template>
  <div class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800/80">
    <h2 class="mb-4 text-lg font-bold text-gray-800 dark:text-gray-100">
      <icon-analytics class="inline-block size-6" /> Operating System
      Distribution
    </h2>
    <div
      v-if="loading && !osStats"
      class="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"
    ></div>
    <div v-else class="h-72 w-full overflow-hidden">
      <v-chart :option="osChartOption" autoresize class="h-full w-full" />
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

interface OsStat {
  os_name: string;
  count: number;
}

interface Props {
  loading: boolean;
  osStats: OsStat[] | null;
}

const props = defineProps<Props>();

const osChartOption = computed(() => {
  const data = props.osStats ?? [];

  const colorPalette = [
    "#3b82f6", // 蓝
    "#10b981", // 绿
    "#f59e0b", // 橙
    "#ef4444", // 红
    "#8b5cf6", // 紫
    "#ec4899", // 粉
    "#6366f1", // 靛蓝
    "#14b8a6", // 青
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
        name: "OS",
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
          name: item.os_name || "Unknown",
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
