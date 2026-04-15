<template>
  <div
    class="group squircle relative overflow-hidden border border-white/20 bg-linear-to-br from-white/80 to-white/40 p-6 shadow-lg backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl dark:border-gray-700/50 dark:from-gray-900/80 dark:to-gray-800/40"
  >
    <!-- Decorative gradient orbs -->
    <div
      class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-linear-to-br from-cyan-300/30 to-blue-500/20 blur-3xl transition-transform duration-700 group-hover:scale-110"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-linear-to-tr from-teal-300/20 to-emerald-400/10 blur-3xl transition-transform duration-700 group-hover:scale-110"
    ></div>

    <!-- Header -->
    <div class="relative z-10 mb-4 flex items-start justify-between gap-2">
      <div>
        <h3 class="text-lg font-bold tracking-tight text-gray-900 dark:text-white">潮汐预报</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ tideSpotName }} · {{ todayStr }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <select
          v-model="selectedHarbor"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white/80 px-1.5 py-1 text-xs text-gray-700 focus:ring-1 focus:ring-cyan-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        >
          <option v-for="opt in HARBOR_OPTIONS" :key="opt.code" :value="opt.code">
            {{ opt.name }}
          </option>
        </select>
        <select
          v-model="selectedDate"
          class="cursor-pointer rounded-lg border border-gray-200 bg-white/80 px-1.5 py-1 text-xs text-gray-700 focus:ring-1 focus:ring-cyan-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        >
          <option v-for="opt in dateOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }} {{ opt.weekday }}
          </option>
        </select>
      </div>
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/25 transition-transform duration-300 group-hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="relative z-10 flex flex-col items-center justify-center py-12">
      <div class="relative">
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-500 dark:border-gray-700 dark:border-t-cyan-400"
        ></div>
      </div>
      <span class="mt-4 text-sm text-gray-500 dark:text-gray-400"> 获取潮汐数据... </span>
    </div>

    <!-- Chart -->
    <div v-else-if="tideData" class="relative z-10">
      <v-chart :option="tideOptions" style="width: 100%; height: 280px" autoresize />

      <!-- Tide Summary -->
      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-white/50 p-3 dark:bg-gray-800/50">
          <div class="mb-1 flex items-center gap-1.5 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span class="text-xs">最高潮</span>
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ highTide ? highTide.height.toFixed(2) : "--" }}m
          </p>
          <p class="text-xs text-gray-500">{{ highTide?.time ?? "--:--" }}</p>
        </div>

        <div class="rounded-xl bg-white/50 p-3 dark:bg-gray-800/50">
          <div class="mb-1 flex items-center gap-1.5 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span class="text-xs">最低潮</span>
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ lowTide ? lowTide.height.toFixed(2) : "--" }}m
          </p>
          <p class="text-xs text-gray-500">{{ lowTide?.time ?? "--:--" }}</p>
        </div>
      </div>
    </div>

    <!-- No Data -->
    <div v-else class="relative z-10 py-4 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">暂无潮汐数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { weatherService } from "@/service/weatherService";
import { useNotificationStore } from "@/stores/notification";
import dayjs from "dayjs";
import { LineChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, MarkPointComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { computed, onMounted, ref, watch } from "vue";
import VChart from "vue-echarts";

use([TooltipComponent, GridComponent, MarkLineComponent, MarkPointComponent, LineChart, SVGRenderer]);

interface TideData {
  updateTime: string;
  tideTable: { fxTime: string; height: number | string; type: "H" | "L" }[];
  tideHourly: { fxTime: string; height: number | string }[];
}

const HARBOR_OPTIONS = [
  { code: "P2352", name: "黄埔港" },
  { code: "P2932", name: "舢舨洲" },
  { code: "P2299", name: "南沙港" },
  { code: "P2474", name: "海沁" },
  { code: "P2609", name: "东沙" },
];

const notifier = useNotificationStore();
const tideData = ref<TideData | null>(null);
const loading = ref<boolean>(false);
const isDarkMode = ref<boolean>(false);
const selectedHarbor = ref<string>("P2352");
const selectedDate = ref<string>(dayjs().format("YYYYMMDD"));
const tideSpotName = ref<string>("黄埔港");

const emit = defineEmits<{
  (e: "update", payload: { tideData: TideData | null; spotName: string }): void;
}>();

// 今日 ~ +7天
const dateOptions = computed(() =>
  Array(8)
    .fill(null)
    .map((_, i) => {
      const d = dayjs().add(i, "day");
      return {
        value: d.format("YYYYMMDD"),
        label: d.format("MM-DD"),
        weekday: d.format("dd"),
      };
    }),
);

const todayStr = computed(() => {
  const opt = dateOptions.value.find((o) => o.value === selectedDate.value);
  return opt ? `${opt.label} ${opt.weekday}` : dayjs().format("YYYY-MM-DD");
});

// 检测深色模式
const checkDarkMode = () => {
  isDarkMode.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
};

// 从后端获取潮汐数据
const fetchTideData = async (harbor: string, date: string) => {
  loading.value = true;
  try {
    const res = await weatherService.getTide({ harbor, date });
    if (res.tideHourly && res.tideHourly.length > 0) {
      tideData.value = {
        updateTime: res.updateTime,
        tideTable: res.tideTable,
        tideHourly: res.tideHourly,
      };
      const harborName = HARBOR_OPTIONS.find((h) => h.code === harbor)?.name ?? "黄埔港";
      tideSpotName.value = harborName;
      emit("update", { tideData: tideData.value, spotName: harborName });
    }
  } catch {
    notifier.error("获取潮汐信息失败，请稍后再试");
  } finally {
    loading.value = false;
  }
};

// harbor 或 date 变化时自动刷新
watch([selectedHarbor, selectedDate], ([harbor, date]) => {
  void fetchTideData(harbor, date);
});

// 计算最高潮和最低潮
const highTide = computed(() => {
  if (!tideData.value) return null;
  const highs: { height: number | string; fxTime: string }[] = tideData.value.tideTable.filter((t) => t.type === "H");
  if (highs.length === 0) return null;
  let maxEntry = highs[0];
  for (const h of highs) {
    if (Number(h.height) > Number(maxEntry.height)) {
      maxEntry = h;
    }
  }
  return {
    height: Number(maxEntry.height),
    time: dayjs(maxEntry.fxTime).format("HH:mm"),
  };
});

// 计算最低潮及其时间
const lowTide = computed(() => {
  if (!tideData.value) return null;
  const lows: { height: number | string; fxTime: string }[] = tideData.value.tideTable.filter((t) => t.type === "L");
  if (lows.length === 0) return null;
  let minEntry = lows[0];
  for (const l of lows) {
    if (Number(l.height) < Number(minEntry.height)) {
      minEntry = l;
    }
  }
  return {
    height: Number(minEntry.height),
    time: dayjs(minEntry.fxTime).format("HH:mm"),
  };
});

const tideOptions = computed(() => {
  if (!tideData.value) return {};

  const textColor = isDarkMode.value ? "#e5e7eb" : "#333";
  const subTextColor = isDarkMode.value ? "#9ca3af" : "#666";
  const lineColor = "#06b6d4";

  // 获取当前时间索引
  const now = dayjs();
  let currentTimeIndex = -1;
  tideData.value.tideHourly.forEach((point, index) => {
    const pointTime = dayjs(point.fxTime);
    if (pointTime.isBefore(now) || pointTime.isSame(now)) {
      currentTimeIndex = index;
    }
  });

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: isDarkMode.value ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderColor: isDarkMode.value ? "#475569" : "#e5e7eb",
      borderWidth: 1,
      borderRadius: 8,
      padding: [12, 16],
      textStyle: {
        color: textColor,
        fontSize: 13,
      },
      formatter: (params: unknown[]) => {
        const param = params[0] as { axisValue: string; data: number };
        const timeStr = dayjs(param.axisValue).format("HH:mm");
        return `<div style="padding: 2px 0;">
          <div style="font-weight: 600; margin-bottom: 4px;">${timeStr}</div>
          <div>潮高: <span style="color: ${lineColor}; font-weight: bold;">${param.data.toFixed(2)} m</span></div>
        </div>`;
      },
    },
    grid: {
      left: "4%",
      right: "4%",
      bottom: "12%",
      top: "10%",
      containLabel: false,
    },
    xAxis: {
      type: "category",
      data: tideData.value.tideHourly.map((point) => point.fxTime),
      axisLabel: {
        formatter: (value: string) => dayjs(value).format("HH:mm"),
        color: subTextColor,
        fontSize: 11,
        interval: Math.floor(tideData.value!.tideHourly.length / 5),
      },
      axisLine: {
        lineStyle: { color: isDarkMode.value ? "#334155" : "#e5e7eb" },
      },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: subTextColor,
        fontSize: 11,
        formatter: (v: number) => `${v}m`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: isDarkMode.value ? "#1e293b" : "#f1f5f9",
          type: "dashed",
        },
      },
    },
    series: [
      {
        name: "潮高",
        data: tideData.value.tideHourly.map((point) => Number(point.height)),
        type: "line",
        smooth: 0.4,
        symbol: "none",
        lineStyle: {
          color: lineColor,
          width: 2.5,
        },
        itemStyle: {
          color: lineColor,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(6, 182, 212, 0.25)" },
              { offset: 0.7, color: "rgba(6, 182, 212, 0.05)" },
              { offset: 1, color: "rgba(6, 182, 212, 0)" },
            ],
          },
        },
        markLine:
          currentTimeIndex >= 0
            ? {
                symbol: ["none", "none"],
                lineStyle: {
                  color: "#f59e0b",
                  type: "dashed",
                  width: 1.5,
                },
                label: {
                  show: true,
                  formatter: "现在",
                  color: "#f59e0b",
                  fontWeight: "600",
                  fontSize: 12,
                },
                data: [{ xAxis: currentTimeIndex }],
              }
            : undefined,
        markPoint: {
          symbol: "circle",
          symbolSize: 6,
          label: {
            show: true,
            position: "top",
            color: textColor,
            fontSize: 10,
            fontWeight: "600",
            formatter: (p: { name: string; value: string }) => `${p.name}\n${p.value}`,
            lineHeight: 14,
          },
        },
      },
    ],
  };
});

onMounted(() => {
  checkDarkMode();
  void fetchTideData(selectedHarbor.value, selectedDate.value);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", checkDarkMode);
});
</script>
