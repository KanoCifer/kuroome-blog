<script setup lang="ts">
import { useFishingMapStore } from "@/stores/fishingMap";
import dayjs from "dayjs";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";
import VChart from "vue-echarts";

use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  BarChart,
  SVGRenderer,
  LineChart,
]);

const fishingMapStore = useFishingMapStore();
const { weatherHourly } = storeToRefs(fishingMapStore);
// console.log("小时天气数据：", weatherHourly.value);

const isDarkMode = ref(false);

const checkDarkMode = () => {
  isDarkMode.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
};

onMounted(() => {
  checkDarkMode();
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", checkDarkMode);
});

const chartOption = computed(() => {
  if (!weatherHourly.value || weatherHourly.value.length === 0) {
    return {};
  }

  const xData = weatherHourly.value.map((item) =>
    dayjs(item.fxTime).format("HH:mm"),
  );
  const rainData = weatherHourly.value.map((item) => item.precip ?? 0);
  const tempData = weatherHourly.value.map((item) => item.temp ?? 0);

  return {
    backgroundColor: "transparent",
    textStyle: {
      color: "#333",
      fontSize: 13,
    },
    borderWidth: 1,
    borderRadius: 8,
    padding: [12, 16],
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "rgba(0, 0, 0, 0.05)",
      borderWidth: 1,
      borderRadius: 12,
      padding: [12, 16],
      textStyle: { color: "#1f2937", fontSize: 14 },
      axisPointer: {
        type: "line",
        lineStyle: { color: "rgba(0,0,0,0.1)", type: "dashed" },
      },
    },
    legend: {
      data: ["降水量 (mm)", "温度 (°C)"],
      top: 0,
      right: 10,
      itemWidth: 16,
      itemHeight: 6,
      itemGap: 20,
      textStyle: { color: "#6b7280", fontSize: 13 },
    },
    grid: {
      left: "6%",
      right: "4%",
      top: 40,
      bottom: 30,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: xData,
      axisLine: { lineStyle: { color: "#e5e7eb", width: 1 } },
      axisTick: { show: false },
      axisLabel: { color: "#9ca3af", fontSize: 11 },
    },
    yAxis: [
      {
        type: "value",
        position: "left",
        max: 18,
        min: 0,
        nameTextStyle: { color: "#9ca3af", fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
      },
      {
        type: "value",
        max: (value: { max: number }) => Math.round(value.max + 5),
        min: 0,
        position: "right",
        nameTextStyle: { color: "#9ca3af", fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 11 },
      },
    ],
    series: [
      {
        name: "降水量 (mm)",
        type: "bar",
        data: rainData,
        yAxisIndex: 0,
        barMaxWidth: 12,
        itemStyle: {
          color: "#3b82f6",
          borderRadius: [4, 4, 0, 0],
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", width: 1 },
          data: [
            {
              yAxis: 0.5,
              lineStyle: { color: "#94a3b8" },
              label: {
                formatter: "小雨",
                color: "#94a3b8",
                position: "start",
              },
            },
            {
              yAxis: 8,
              lineStyle: { color: "#3b82f6" },
              label: {
                formatter: "中雨",
                color: "#3b82f6",
                position: "start",
              },
            },
            {
              yAxis: 16,
              lineStyle: { color: "#f97316" },
              label: {
                formatter: "大雨",
                color: "#f97316",
                position: "start",
              },
            },
          ],
        },
      },
      {
        name: "温度 (°C)",
        type: "line",
        data: tempData,
        yAxisIndex: 1,
        lineStyle: { width: 2.5, color: "#f97316" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(249, 115, 22, 0.1)" },
              { offset: 0.7, color: "rgba(249, 115, 22, 0.05)" },
              { offset: 1, color: "rgba(249, 115, 22, 0)" },
            ],
          },
        },
        smooth: 0.2,
        symbol: "none",
        symbolSize: 6,
        itemStyle: { color: "#f97316", borderWidth: 2, borderColor: "#fff" },
        markArea: {
          silent: true,
          data: [
            [
              { yAxis: 20, itemStyle: { color: "rgba(250, 204, 21, 0.1)" } },
              { yAxis: 28 },
            ],
          ],
        },
      },
    ],
  };
});
</script>

<template>
  <div
    class="hourly-weather squircle border-border/30 bg-card relative overflow-hidden border p-5 shadow-xl backdrop-blur-md"
  >
    <!-- Decorative background elements -->
    <div
      class="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-linear-to-br from-sky-400/20 to-blue-500/10 blur-3xl dark:from-sky-500/10 dark:to-blue-600/5"
    />
    <div
      class="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-linear-to-tr from-orange-400/15 to-amber-500/5 blur-2xl dark:from-orange-500/10 dark:to-amber-600/5"
    />

    <!-- Header -->
    <div class="relative mb-4 flex items-center justify-between">
      <div>
        <h3 class="text-foreground text-lg font-semibold">
          小时天气预报
          <span class="text-muted-foreground ml-2 text-sm font-normal"
            >未来24小时</span
          >
        </h3>
        <p class="text-muted-foreground mt-0.5 text-sm">天气变化趋势</p>
      </div>
      <!-- Legend pills -->
      <div class="flex items-center gap-3">
        <div
          class="bg-card/60 flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm"
        >
          <span class="bg-primary h-2.5 w-2.5 rounded-full" />
          <span class="text-foreground text-xs">降水量</span>
        </div>
        <div
          class="bg-card/60 flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm"
        >
          <span class="bg-warning h-2.5 w-2.5 rounded-full" />
          <span class="text-foreground text-xs">温度</span>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div
      v-if="weatherHourly && weatherHourly.length > 0"
      class="relative h-full"
    >
      <v-chart :option="chartOption" autoresize />
    </div>
    <div v-else class="flex h-64 items-center justify-center">
      <div class="text-center">
        <div
          class="border-border border-t-primary mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2"
        />
        <p class="text-muted-foreground text-sm">正在加载天气数据...</p>
      </div>
    </div>
  </div>
</template>
