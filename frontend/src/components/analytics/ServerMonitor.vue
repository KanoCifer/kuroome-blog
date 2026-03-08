<template>
  <!-- Server Monitoring Section -->
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2
        class="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100"
      >
        <svg
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
        Server System Monitor
      </h2>
      <div class="flex items-center gap-3">
        <div
          class="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400"
        >
          <div
            :class="[
              isSSEConnected
                ? 'h-2 w-2 animate-pulse rounded-full bg-green-500'
                : 'h-2 w-2 rounded-full bg-gray-400',
            ]"
          ></div>
          {{ isSSEConnected ? "Auto-refresh active" : "Auto-refresh paused" }}
        </div>
        <button
          type="button"
          @click="toggleAutoRefresh"
          class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          {{ isSSEConnected ? "Pause" : "Start" }} Auto-refresh
        </button>
      </div>
    </div>

    <!-- Server Status Cards -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- CPU Gauge -->
      <div class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800/80">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">
            <div class="flex items-center gap-2">
              <svg
                class="h-5 w-5 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
              CPU Usage
            </div>
          </h3>
          <span
            :style="{ color: getStatusColor(serverStatus?.cpu_percent ?? 0) }"
            class="text-sm font-semibold"
          >
            {{ serverStatus?.cpu_cores }} Cores
          </span>
        </div>
        <div class="h-48">
          <v-chart :option="cpuGaugeOption" autoresize class="h-full w-full" />
        </div>
      </div>

      <!-- Memory Gauge -->
      <div class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800/80">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">
            <div class="flex items-center gap-2">
              <svg
                class="h-5 w-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Memory Usage
            </div>
          </h3>
          <span class="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {{ serverStatus?.mem_used ?? 0 }} MB /
            {{ serverStatus?.mem_total ?? 0 }} MB
          </span>
        </div>
        <div class="h-48">
          <v-chart
            :option="memoryGaugeOption"
            autoresize
            class="h-full w-full"
          />
        </div>
      </div>

      <!-- Disk Usage Card -->
      <div class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800/80">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">
            <div class="flex items-center gap-2">
              <svg
                class="h-5 w-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
              Disk Usage
            </div>
          </h3>
          <span
            :style="{ color: getStatusColor(serverStatus?.disk_usage ?? 0) }"
            class="text-sm font-semibold"
          >
            {{ serverStatus?.disk_usage?.toFixed(1) }}%
          </span>
        </div>
        <div class="space-y-4">
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Used</span>
              <span class="font-medium text-gray-800 dark:text-gray-100">
                {{ serverStatus?.disk_used ?? 0 }} GB
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Total</span>
              <span class="font-medium text-gray-800 dark:text-gray-100">
                {{ serverStatus?.disk_total ?? 0 }} GB
              </span>
            </div>
          </div>
          <div
            class="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          >
            <div
              :style="{
                width: `${serverStatus?.disk_usage ?? 0}%`,
                backgroundColor: getStatusColor(serverStatus?.disk_usage ?? 0),
              }"
              class="h-full rounded-full transition-all duration-500"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Server History Chart -->
    <div class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800/80">
      <h3
        class="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
        Resource Usage History
      </h3>
      <div
        v-if="loading && !serverStatus"
        class="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"
      ></div>
      <div v-else class="h-72 w-full overflow-hidden">
        <v-chart
          :option="historyChartOption"
          autoresize
          class="h-full w-full"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import request from "@/request";
import { useThemeStore } from "@/stores/theme";
import dayjs from "dayjs";
import { GaugeChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, onMounted, onUnmounted, ref } from "vue";
import VChart from "vue-echarts";

// Register ECharts components
use([
  CanvasRenderer,
  GaugeChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

// Types
interface ServerStatus {
  cpu_percent: number;
  cpu_cores: number;
  mem_total: number;
  mem_used: number;
  mem_usage: number;
  disk_total: number;
  disk_used: number;
  disk_usage: number;
}

interface HistoryItem {
  timestamp: string;
  cpu: number;
  memory: number;
}

defineOptions({
  name: "ServerMonitor",
});

const props = defineProps<{
  autoStart?: boolean;
}>();

const emit = defineEmits<{
  (e: "status-update", status: ServerStatus): void;
}>();

const loading = ref(false);
const serverStatus = ref<ServerStatus | null>(null);
const history = ref<HistoryItem[]>([]);
const eventSource = ref<EventSource | null>(null);
const isSSEConnected = ref(false);

// theme store for dark/light detection
const themeStore = useThemeStore();
const isDark = computed(() => {
  if (themeStore.theme === "dark") return true;
  if (themeStore.theme === "light") return false;
  // system setting
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

// colors that adapt to mode
const textColor = computed(() => (isDark.value ? "#f3f4f6" : "#1f2937"));
const axisLineColor = computed(() => (isDark.value ? "#374151" : "#e5e7eb"));
const tooltipBgColor = computed(() =>
  isDark.value ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.95)",
);

// Get status color based on percentage
const getStatusColor = (percent: number): string => {
  if (percent < 50) return "#10b981";
  if (percent < 80) return "#f59e0b";
  return "#ef4444";
};

// CPU Gauge Chart Option
const cpuGaugeOption = computed(() => ({
  series: [
    {
      type: "gauge",
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 5,
      itemStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: "#10b981" },
            { offset: 0.5, color: "#f59e0b" },
            { offset: 1, color: "#ef4444" },
          ],
        },
      },
      progress: { show: true, width: 18 },
      pointer: { show: false },
      axisLine: {
        lineStyle: {
          width: 18,
          color: [[1, "#e5e7eb"]],
        },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { show: false },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, "0%"],
        fontSize: 32,
        fontWeight: "bold",
        formatter: "{value}%",
        color: textColor.value,
      },
      data: [{ value: serverStatus.value?.cpu_percent ?? 0 }],
    },
  ],
}));

// Memory Gauge Chart Option
const memoryGaugeOption = computed(() => ({
  series: [
    {
      type: "gauge",
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 5,
      itemStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: "#3b82f6" },
            { offset: 0.5, color: "#8b5cf6" },
            { offset: 1, color: "#ef4444" },
          ],
        },
      },
      progress: { show: true, width: 18 },
      pointer: { show: false },
      axisLine: {
        lineStyle: {
          width: 18,
          color: [[1, axisLineColor.value]],
        },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { show: false },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, "0%"],
        fontSize: 32,
        fontWeight: "bold",
        formatter: "{value}%",
        color: textColor.value,
      },
      data: [{ value: serverStatus.value?.mem_usage ?? 0 }],
    },
  ],
}));

// History Chart Option
const historyChartOption = computed(() => ({
  tooltip: {
    trigger: "axis",
    backgroundColor: tooltipBgColor.value,
    borderColor: axisLineColor.value,
    textStyle: { color: textColor.value },
  },
  legend: {
    data: ["CPU", "Memory"],
    top: 0,
    textStyle: { color: textColor.value },
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    top: "15%",
    containLabel: true,
  },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: history.value.map((d) => dayjs(d.timestamp).format("HH:mm:ss")),
    axisLine: { lineStyle: { color: axisLineColor.value } },
    axisLabel: { color: textColor.value, fontSize: 10 },
  },
  yAxis: {
    type: "value",
    min: 0,
    max: 100,
    axisLine: { show: false },
    axisLabel: { color: textColor.value, formatter: "{value}%" },
    splitLine: { lineStyle: { color: isDark.value ? "#4b5563" : "#f3f4f6" } },
  },
  series: [
    {
      name: "CPU",
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      lineStyle: { width: 2, color: "#f59e0b" },
      itemStyle: { color: "#f59e0b" },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(245, 158, 11, 0.2)" },
            { offset: 1, color: "rgba(245, 158, 11, 0.02)" },
          ],
        },
      },
      data: history.value.map((d) => d.cpu),
    },
    {
      name: "Memory",
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      lineStyle: { width: 2, color: "#8b5cf6" },
      itemStyle: { color: "#8b5cf6" },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(139, 92, 246, 0.2)" },
            { offset: 1, color: "rgba(139, 92, 246, 0.02)" },
          ],
        },
      },
      data: history.value.map((d) => d.memory),
    },
  ],
}));

// Fetch server status
const fetchStatus = async () => {
  try {
    const res = await request.get("/monitor/status/server/status");
    if (res.data.code === 200) {
      serverStatus.value = res.data.data;
      emit("status-update", res.data.data);

      // Add to history
      history.value.push({
        timestamp: new Date().toISOString(),
        cpu: res.data.data.cpu_percent,
        memory: res.data.data.mem_usage,
      });

      // Keep only last 100 records (~8 minutes of data at 5s intervals)
      if (history.value.length > 100) {
        history.value = history.value.slice(-100);
      }
    }
  } catch (err) {
    console.error("Failed to fetch server status:", err);
  }
};

const fetchStatusSSE = async () => {
  // Close existing connection if any
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
  }

  console.log("Establishing SSE connection for server status...");
  try {
    const es = new EventSource("/api/v1/status/server/status/stream", {
      withCredentials: true,
    });

    es.onopen = () => {
      console.log("SSE connection established");
      isSSEConnected.value = true;
    };

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      serverStatus.value = data;
      emit("status-update", data);

      // Add to history
      history.value.push({
        timestamp: new Date().toISOString(),
        cpu: data.cpu_percent,
        memory: data.mem_usage,
      });

      // Keep only last 100 records (~8 minutes of data at 5s intervals)
      if (history.value.length > 100) {
        history.value = history.value.slice(-100);
      }
    };

    es.onerror = (err) => {
      console.error("SSE error:", err);
      es.close();
      eventSource.value = null;
      isSSEConnected.value = false;
    };

    eventSource.value = es;
  } catch (err) {
    console.error("Failed to establish SSE connection:", err);
    isSSEConnected.value = false;
  }
};

// Toggle auto refresh
const toggleAutoRefresh = () => {
  if (isSSEConnected.value && eventSource.value) {
    // Pause: close connection
    eventSource.value.close();
    eventSource.value = null;
    isSSEConnected.value = false;
    console.log("SSE connection closed");
  } else {
    // Start: establish new connection
    fetchStatusSSE();
  }
};

// Expose methods for parent component
defineExpose({
  fetchStatus,
  toggleAutoRefresh,
});

// Lifecycle
onMounted(() => {
  if (props.autoStart) {
    toggleAutoRefresh();
  }
});

onUnmounted(() => {
  // Clean up SSE connection when component is destroyed
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
    isSSEConnected.value = false;
  }
});
</script>
