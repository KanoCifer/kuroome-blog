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
const now = ref(Date.now());

async function loadStatus() {
  try {
    serverStatus.value = await fetchStatusDetail();
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

/* ── Memory formatters ── */
function bytesToMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function bytesToGB(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatStartTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

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
                  serverStatus?.service.db_ok
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground/40'
                "
              />
              <span
                class="relative inline-flex h-2 w-2 rounded-full"
                :class="
                  serverStatus?.service.db_ok
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground/40'
                "
              />
            </span>
            <span class="text-foreground font-medium">数据库</span>
          </div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ serverStatus?.service.db_ok ? '连接正常' : '检测中…' }}
          </p>
          <p class="text-foreground text-2xl font-bold">
            {{ serverStatus?.service.db_ok ? 'OK' : '--' }}
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

      <!-- 版本信息 -->
      <div class="border-border bg-card rounded-xl border p-6 shadow-md">
        <div class="mb-4 flex items-center gap-2">
          <svg
            class="text-muted-foreground h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 class="text-foreground text-lg font-semibold">版本信息</h2>
        </div>

        <div v-if="serverStatus" class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground text-sm">项目仓库</span>
            <div class="flex items-center gap-2">
              <a
                :href="serverStatus.version.repo_url"
                target="_blank"
                class="text-primary text-sm hover:underline"
                >GitHub 仓库</a
              >
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground text-sm">后端运行版本</span>
            <span class="text-foreground font-mono text-sm"
              >v{{ serverStatus.version.current_version }}</span
            >
          </div>
        </div>
      </div>

      <!-- 服务信息 + 系统信息 -->
      <div class="border-border bg-card rounded-xl border p-6 shadow-md">
        <div class="mb-5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg
              class="text-muted-foreground h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
              />
            </svg>
            <h2 class="text-foreground text-lg font-semibold">服务信息</h2>
          </div>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors"
            title="刷新"
            @click="loadStatus"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div v-if="serverStatus" class="space-y-6">
          <!-- 服务信息 -->
          <div>
            <div class="mb-3 flex items-center gap-1.5">
              <svg
                class="text-muted-foreground h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span class="text-foreground text-sm font-medium">服务信息</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm"
                  >运行时版本 / 协程数量 / GC 次数</span
                >
                <span class="text-foreground text-sm">
                  {{ serverStatus.service.runtime }} |
                  {{ serverStatus.service.coroutines }} |
                  {{ serverStatus.service.gc_count[0] }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm"
                  >启动时间 / 运行时间</span
                >
                <span class="text-foreground text-sm">
                  {{ formatStartTime(serverStatus.service.start_time) }} (GMT+8)
                  |
                  {{
                    formatUptime(
                      Math.floor(
                        (now - serverStatus.service.start_time * 1000) / 1000,
                      ),
                    )
                  }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm"
                  >堆内存 / 总占用</span
                >
                <span class="text-foreground text-sm">
                  {{ bytesToMB(serverStatus.service.heap_memory_bytes) }} /
                  {{ bytesToMB(serverStatus.service.total_memory_bytes) }}
                </span>
              </div>
              <div class="bg-secondary h-1 w-full rounded-full">
                <div
                  class="bg-primary h-1 rounded-full transition-all duration-500"
                  :style="{
                    width: `${(serverStatus.service.heap_memory_bytes / serverStatus.service.total_memory_bytes) * 100}%`,
                  }"
                />
              </div>
            </div>
          </div>

          <!-- 系统信息 -->
          <div>
            <div class="mb-3 flex items-center gap-1.5">
              <svg
                class="text-muted-foreground h-4 w-4"
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
              <span class="text-foreground text-sm font-medium">系统信息</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm">系统时间</span>
                <span class="text-foreground text-sm">
                  {{ serverStatus.system.system_time }} ({{
                    serverStatus.system.system_timezone
                  }})
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm"
                  >操作系统 / 内核版本 / 处理器型号</span
                >
                <span class="text-foreground text-right text-sm">
                  {{ serverStatus.system.os_name }} |
                  {{ serverStatus.system.kernel_version }} |
                  {{ serverStatus.system.cpu_model }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm"
                  >核心 (逻辑/物理) / 平均负载 (1/5/15)</span
                >
                <span class="text-foreground text-sm">
                  {{ serverStatus.system.cpu_count_logical }}/{{
                    serverStatus.system.cpu_count_physical
                  }}
                  | {{ serverStatus.system.load_average['1m'] }}
                  {{ serverStatus.system.load_average['5m'] }}
                  {{ serverStatus.system.load_average['15m'] }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm"
                  >内存使用率 / 已用内存 / 总内存</span
                >
                <span class="text-foreground text-sm">
                  {{ serverStatus.system.memory_usage_percent }}% |
                  {{ bytesToMB(serverStatus.system.memory_used_bytes) }} /
                  {{ bytesToGB(serverStatus.system.memory_total_bytes) }}
                </span>
              </div>
              <div class="bg-secondary h-1 w-full rounded-full">
                <div
                  class="bg-primary h-1 rounded-full transition-all duration-500"
                  :style="{
                    width: `${serverStatus.system.memory_usage_percent}%`,
                  }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Loading skeleton -->
        <div v-else class="space-y-4">
          <div class="bg-secondary h-4 w-3/4 animate-pulse rounded" />
          <div class="bg-secondary h-4 w-1/2 animate-pulse rounded" />
          <div class="bg-secondary h-4 w-2/3 animate-pulse rounded" />
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
          CPU {{ serverStatus.system.cpu_percent }}% · 内存
          {{ serverStatus.system.memory_usage_percent }}%
        </span>
        <span v-if="serverStatus">
          运行
          {{
            formatUptime(
              Math.floor((now - serverStatus.service.start_time * 1000) / 1000),
            )
          }}
        </span>
      </div>
    </motion.div>
  </div>
</template>
