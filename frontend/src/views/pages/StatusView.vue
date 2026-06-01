<script setup lang="ts">
import { connectionDelay, isConnected, sendPing } from '@/plugins/visitorWs';
import { useVisitorCountStore } from '@/stores/visitorCount';
import { fetchStatusDetail, type StatusDetailData } from '@/api/statusGateway';
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { motion } from 'motion-v';
import VChart from 'vue-echarts';

/* ── Stores ── */
const visitorCount = useVisitorCountStore();

/* ── Server metrics ── */
const serverStatus = ref<StatusDetailData | null>(null);
let statusTimer: ReturnType<typeof setInterval> | null = null;
let nowTimer: ReturnType<typeof setInterval> | null = null;
const startTime = ref<number | null>(null);
const now = ref(Date.now());
const uptime = computed(() => {
  if (startTime.value === null) return 0;
  return Math.floor((now.value - startTime.value * 1000) / 1000);
});

async function loadStatus() {
  try {
    serverStatus.value = await fetchStatusDetail();
    if (serverStatus.value && startTime.value === null) {
      startTime.value = serverStatus.value.startuptime;
    }
  } catch {
    /* silent */
  }
}

/* ── Latency history (reuses global visitor WS) ── */
const latencyHistory = ref<number[]>([]);
const MAX_HISTORY = 60;
let pingTimer: ReturnType<typeof setInterval> | null = null;

watchEffect(() => {
  const ms = connectionDelay?.value;
  if (ms && ms > 0) {
    latencyHistory.value = [
      ...latencyHistory.value.slice(-(MAX_HISTORY - 1)),
      Math.round(ms * 10) / 10,
    ];
  }
});

/* ── API health check (direct fetch) ── */
const apiLatency = ref(0);
const apiHealthy = ref(true);

async function pingApi() {
  const base = import.meta.env.VITE_API_BASE || '/api';
  const start = performance.now();
  try {
    const res = await fetch(`${base}/v1/status`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error();
    apiLatency.value = Math.round(performance.now() - start);
    apiHealthy.value = true;
  } catch {
    apiHealthy.value = false;
  }
}

let apiTimer: ReturnType<typeof setInterval> | null = null;

/* ── Uptime formatter ── */
function formatUptime(s: number): string {
  if (s < 60) return `00 天 00 时 00 分 ${s} 秒`;
  if (s < 3600) return `00 天 00 时 ${Math.floor(s / 60)} 分 ${s % 60} 秒`;
  if (s < 86400)
    return `00 天 ${Math.floor(s / 3600)} 时 ${Math.floor((s % 3600) / 60)} 分`;
  return `${Math.floor(s / 86400)} 天 ${Math.floor((s % 86400) / 3600)} 时`;
}

/* ── Overall status ── */
interface StatusInfo {
  label: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
}

const overallStatus = computed<StatusInfo>(() => {
  if (!apiHealthy.value)
    return {
      label: '服务中断',
      dotClass: 'bg-red-500',
      bgClass: 'bg-destructive/10',
      textClass: 'text-destructive',
    };
  const delay = connectionDelay?.value ?? 0;
  if (!isConnected?.value || delay > 2000)
    return {
      label: '性能降级',
      dotClass: 'bg-yellow-500',
      bgClass: 'bg-warning/10',
      textClass: 'text-warning',
    };
  return {
    label: '运行正常',
    dotClass: 'bg-emerald-500',
    bgClass: 'bg-success/20',
    textClass: 'text-success',
  };
});

const wsLatency = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  return ms ? `${Math.round(ms)} ms` : '-- ms';
});

const wsDotClass = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  if (!ms) return 'bg-muted-foreground/40';
  if (ms < 200) return 'bg-emerald-500';
  if (ms < 2000) return 'bg-yellow-500';
  return 'bg-red-500';
});

/* ── Latency chart (echarts) ── */
const chartOption = computed(() => {
  const data = latencyHistory.value;
  const xData = data.map((_, i) => `${i}s`);

  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#6b7280', fontSize: 12 },
    grid: {
      left: '6%',
      right: '4%',
      top: 20,
      bottom: 30,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderRadius: 12,
      padding: [12, 16],
      textStyle: { color: '#1f2937', fontSize: 14 },
      axisPointer: {
        type: 'line',
        lineStyle: { color: 'rgba(0,0,0,0.1)', type: 'dashed' },
      },
      formatter: (
        params: { seriesName: string; value: number; axisValue: string }[],
      ) => {
        const p = params[0];
        return `<div style="font-size:13px;color:#6b7280">${p.axisValue}</div><div style="font-size:16px;font-weight:600;margin-top:4px">${p.value} ms</div>`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLine: { lineStyle: { color: '#e5e7eb', width: 1 } },
      axisTick: { show: false },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 800,
      min: 0,
      interval: 200,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: 'rgba(128,128,128,0.12)', type: 'dashed' },
      },
      axisLabel: { color: '#9ca3af', fontSize: 11, formatter: '{value}' },
    },
    series: [
      {
        name: '延迟',
        type: 'line',
        data,
        smooth: 0.2,
        symbol: 'circle',
        symbolSize: (value: number, params: { dataIndex: number }) =>
          params.dataIndex === data.length - 1 ? 8 : 0,
        showSymbol: data.length > 0,
        lineStyle: { width: 2, color: 'rgba(16,185,129,0.7)' },
        itemStyle: {
          color: 'rgba(16,185,129,0.9)',
          borderColor: '#fff',
          borderWidth: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239,68,68,0.15)' },
              { offset: 0.25, color: 'rgba(234,179,8,0.10)' },
              { offset: 1, color: 'rgba(16,185,129,0.20)' },
            ],
          },
        },
      },
    ],
  };
});

/* ── Lifecycle ── */
onMounted(() => {
  loadStatus();
  statusTimer = setInterval(loadStatus, 30_000);
  nowTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  pingApi();
  apiTimer = setInterval(pingApi, 10_000);
  pingTimer = setInterval(sendPing, 1000);
});

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer);
  if (nowTimer) clearInterval(nowTimer);
  if (apiTimer) clearInterval(apiTimer);
  if (pingTimer) clearInterval(pingTimer);
});
</script>

<template>
  <div class="bg-background flex min-h-screen justify-center px-4 py-16">
    <motion.div
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      class="mt-8 w-full max-w-3xl space-y-8"
    >
      <!-- Header -->
      <header class="space-y-2 text-center">
        <h1 class="text-foreground text-3xl font-bold">服务状态</h1>
        <p class="text-muted-foreground text-sm">
          Kuroome Blog 各项服务的实时运行状况
        </p>
      </header>

      <!-- Overall status banner -->
      <div :class="[overallStatus.bgClass, 'rounded-xl p-6 text-center']">
        <div class="mb-1 flex items-center justify-center gap-2">
          <span class="relative flex h-3 w-3">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              :class="overallStatus.dotClass"
            />
            <span
              class="relative inline-flex h-3 w-3 rounded-full"
              :class="overallStatus.dotClass"
            />
          </span>
          <span :class="overallStatus.textClass" class="text-lg font-semibold">
            {{ overallStatus.label }}
          </span>
        </div>
        <p class="text-muted-foreground text-sm">
          所有系统运行中 · 上次检测 · 刚刚
        </p>
      </div>

      <!-- Service cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- API -->
        <div
          class="border-border bg-card rounded-xl border p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <div class="mb-3 flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                :class="apiHealthy ? 'bg-emerald-500' : 'bg-red-500'"
              />
              <span
                class="relative inline-flex h-2 w-2 rounded-full"
                :class="apiHealthy ? 'bg-emerald-500' : 'bg-red-500'"
              />
            </span>
            <span class="text-foreground font-medium">API 服务</span>
          </div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ apiHealthy ? '正常运行' : '无法连接' }}
          </p>
          <p class="text-foreground text-2xl font-bold">
            {{ apiHealthy ? `${apiLatency} ms` : '--' }}
          </p>
        </div>

        <!-- WebSocket -->
        <div
          class="border-border bg-card rounded-xl border p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <div class="mb-3 flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                :class="wsDotClass"
              />
              <span
                class="relative inline-flex h-2 w-2 rounded-full"
                :class="wsDotClass"
              />
            </span>
            <span class="text-foreground font-medium">WebSocket</span>
          </div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ isConnected ? '已连接' : '未连接' }}
          </p>
          <p class="text-foreground text-2xl font-bold">{{ wsLatency }}</p>
        </div>

        <!-- Database -->
        <div
          class="border-border bg-card rounded-xl border p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <div class="mb-3 flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                :class="
                  serverStatus?.db_ok
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground/40'
                "
              />
              <span
                class="relative inline-flex h-2 w-2 rounded-full"
                :class="
                  serverStatus?.db_ok
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground/40'
                "
              />
            </span>
            <span class="text-foreground font-medium">数据库</span>
          </div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ serverStatus?.db_ok ? '连接正常' : '检测中…' }}
          </p>
          <p class="text-foreground text-2xl font-bold">
            {{ serverStatus?.db_ok ? 'OK' : '--' }}
          </p>
        </div>
      </div>

      <!-- Latency chart -->
      <div class="border-border bg-card rounded-xl border p-5 shadow-md">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-foreground font-medium">延迟趋势</h2>
          <div class="flex items-center gap-1.5">
            <span class="relative flex h-2 w-2">
              <span
                class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              />
              <span
                class="bg-success relative inline-flex h-2 w-2 rounded-full"
              />
            </span>
            <span class="text-muted-foreground text-sm">实时</span>
          </div>
        </div>
        <div v-if="latencyHistory.length > 1" class="h-[220px]">
          <v-chart :option="chartOption" autoresize />
        </div>
        <div v-else class="flex h-[220px] items-center justify-center">
          <p class="text-muted-foreground text-sm">等待数据…</p>
        </div>
      </div>

      <!-- Footer meta -->
      <div
        class="text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
      >
        <span class="inline-flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span
              class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            />
            <span
              class="bg-success relative inline-flex h-2 w-2 rounded-full"
            />
          </span>
          {{ visitorCount.count }} 人在线
        </span>
        <span v-if="serverStatus">
          CPU {{ serverStatus.cpu_percent }}% · 内存
          {{ serverStatus.mem_usage }}%
        </span>
        <span v-if="serverStatus"> 运行 {{ formatUptime(uptime) }} </span>
      </div>
    </motion.div>
  </div>
</template>
