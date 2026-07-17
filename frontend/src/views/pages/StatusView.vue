<script setup lang="ts">
import { connectionDelay, isConnected, sendPing } from '@/plugins/visitorWs';
import { useVisitorCountStore } from '@/stores/visitorCount';
import {
  fetchStatusDetail,
  type StatusDetailData,
  fetchRecentEvents,
  type EventItem,
} from '@/api/shared';
import { useChartColors, withAlpha } from '@/composables/shared/useChartColors';
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { motion } from 'motion-v';
import VChart from 'vue-echarts';

/* ── Stores ── */
const visitorCount = useVisitorCountStore();
const { palette } = useChartColors();

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

/* ── Recent events ── */
const recentEvents = ref<EventItem[]>([]);
let eventsTimer: ReturnType<typeof setInterval> | null = null;

async function loadRecentEvents() {
  try {
    recentEvents.value = await fetchRecentEvents({ perPage: 10 });
  } catch {
    /* silent */
  }
}

/* type → 语义色（用 chart palette 的语义色，不引未定义 token） */
const typeClass: Record<string, string> = {
  startup: 'text-success bg-success/10',
  deploy: 'text-primary bg-primary/10',
  notify_failure: 'text-danger bg-danger/10',
};

function typeChipClass(type: string): string {
  return typeClass[type] ?? 'text-muted-foreground bg-muted';
}

function formatLogTime(iso: string): string {
  const d = new Date(iso);
  return (
    `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

/* ── Latency history ── */
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
  const base = import.meta.env.VITE_API_BASE || '/';
  const start = performance.now();
  try {
    const res = await fetch(`${base}/v3/status/detail`, {
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

/* ── Time formatters ── */
function pad2(n: number) {
  return n < 10 ? '0' + n : '' + n;
}
function fmtClock(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('zh-CN', { month: 'short', day: '2-digit' });
}
function formatUptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  // 不足 1 分钟时显示秒级，避免 "0d 00h 00m" 看起来像显示异常
  if (d === 0 && h === 0 && m === 0) {
    return `${d}d ${pad2(h)}h ${pad2(m)}m ${pad2(s % 60)}s`;
  }
  return `${d}d ${pad2(h)}h ${pad2(m)}m`;
}
function formatStartTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function bytesToMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function bytesToGB(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/* ── Status helpers ── */
type StatusKey = 'ok' | 'warn' | 'danger' | 'idle';

const overallStatus = computed<{
  label: string;
  dotClass: StatusKey;
  sub: string;
}>(() => {
  if (!apiHealthy.value) {
    return { label: '服务中断', dotClass: 'danger', sub: '请稍后重试' };
  }
  const delay = connectionDelay?.value ?? 0;
  if (!isConnected?.value || delay > 2000) {
    return { label: '性能降级', dotClass: 'warn', sub: '响应存在延迟' };
  }
  return { label: '运行正常', dotClass: 'ok', sub: '所有系统运行中' };
});

const wsLatency = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  return ms ? Math.round(ms) : 0;
});
const wsDot = computed<StatusKey>(() => {
  const ms = connectionDelay?.value ?? 0;
  if (!ms) return 'idle';
  if (ms < 200) return 'ok';
  if (ms < 2000) return 'warn';
  return 'danger';
});

/* ── Latency chart (echarts) ── */
const chartOption = computed(() => {
  const data = latencyHistory.value;
  const xData = data.map((_, i) => `${i}s`);

  // ECharts 用 canvas fillStyle 喂浏览器，不解析 var() / color-mix() / oklch()。
  // 通过 useChartColors() 拿到 design-system 颜色经 canvas 解析后的 rgb 字符串。
  const fg = palette.value.foreground;
  const muted = palette.value.mutedForeground;
  const border = palette.value.border;
  const card = palette.value.card;
  const primary = palette.value.primary;
  const gridLine = withAlpha(palette.value.mutedForeground, 0.25);

  return {
    backgroundColor: 'transparent',
    textStyle: { color: muted, fontSize: 12 },
    grid: { left: 40, right: 0, top: 10, bottom: 24, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: card,
      borderColor: border,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: fg, fontSize: 12 },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: primary,
          type: 'solid',
          width: 1,
          opacity: 0.4,
        },
      },
      formatter: (
        params: { seriesName: string; value: number; axisValue: string }[],
      ) => {
        const p = params[0];
        return `<div style="font-size:11px;color:${muted};font-family:var(--font-mono)">${p.axisValue}</div><div style="font-size:14px;font-weight:600;color:${fg};font-family:var(--font-mono);margin-top:2px">${p.value} ms</div>`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: muted,
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        interval: Math.max(0, Math.floor(data.length / 5) - 1),
        formatter: (v: string) => `-${v}`,
      },
    },
    yAxis: {
      type: 'value',
      max: 800,
      min: 0,
      interval: 200,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: gridLine, type: 'dashed' } },
      axisLabel: {
        color: muted,
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
      },
    },
    series: [
      {
        name: '延迟',
        type: 'line',
        data,
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: (value: number, params: { dataIndex: number }) =>
          params.dataIndex === data.length - 1 ? 6 : 0,
        showSymbol: data.length > 0,
        lineStyle: { width: 1.6, color: primary },
        itemStyle: {
          color: primary,
          borderColor: card,
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
              { offset: 0, color: withAlpha(primary, 0.28) },
              { offset: 1, color: withAlpha(primary, 0) },
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
  loadRecentEvents();
  eventsTimer = setInterval(loadRecentEvents, 30_000);
  nowTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  pingApi();
  apiTimer = setInterval(pingApi, 10_000);
  pingTimer = setInterval(sendPing, 1000);
});

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer);
  if (eventsTimer) clearInterval(eventsTimer);
  if (nowTimer) clearInterval(nowTimer);
  if (apiTimer) clearInterval(apiTimer);
  if (pingTimer) clearInterval(pingTimer);
});
</script>

<template>
  <div
    class="bg-background flex min-h-screen justify-center px-4 py-12 sm:px-6"
  >
    <motion.div
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
      class="w-full max-w-6xl space-y-5"
    >
      <!-- ── Masthead ── -->
      <header
        class="border-border flex items-end justify-between gap-6 border-b pb-4"
        data-od-id="masthead"
      >
        <div>
          <div
            class="text-muted-foreground font-mono text-[11px] tracking-[0.1em] uppercase"
          >
            Service Status
          </div>
          <h1
            class="text-foreground mt-1.5 text-[28px] leading-tight font-semibold tracking-[-0.02em]"
          >
            服务状态
          </h1>
          <p class="text-muted-foreground mt-1.5 max-w-[56ch] text-[13px]">
            所有依赖项、运行时指标与最近事件的实时视图。延迟每 1s
            刷新，系统指标每 30s 拉取。
          </p>
        </div>
        <div class="flex flex-col items-end gap-1 text-right">
          <span
            class="text-success inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] uppercase"
          >
            <span
              class="live-dot inline-block h-1.5 w-1.5 rounded-full bg-current"
            />
            Live
          </span>
          <span
            class="text-muted-foreground font-mono text-[12px] tracking-[0.04em]"
          >
            {{ fmtClock(now) }} · {{ fmtDate(now) }}
          </span>
          <span
            class="text-muted-foreground font-mono text-[12px] tracking-[0.04em]"
          >
            最后检测 {{ fmtClock(now) }}
          </span>
        </div>
      </header>

      <!-- ── Status banner：横向 4 列 ── -->
      <section
        class="border-border bg-muted grid grid-cols-1 overflow-hidden rounded-md border md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
        data-od-id="status-banner"
        aria-label="整体状态"
      >
        <!-- Overall -->
        <div
          class="border-border flex flex-col gap-2 border-b p-5 md:border-r md:border-b-0 lg:border-b-0"
        >
          <div class="flex items-center gap-2.5">
            <span
              :class="['status-dot', `status-dot--${overallStatus.dotClass}`]"
            />
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase"
              >Overall</span
            >
          </div>
          <div
            class="text-foreground font-mono text-[26px] leading-none font-semibold tracking-[-0.02em]"
          >
            {{ overallStatus.label }}
          </div>
          <div
            class="text-muted-foreground font-mono text-[11px] tracking-[0.04em]"
          >
            {{ overallStatus.sub }}
          </div>
        </div>
        <!-- API -->
        <div
          class="border-border flex flex-col gap-2 border-b p-5 md:border-r md:border-b-0 lg:border-b-0"
        >
          <div class="flex items-center gap-2.5">
            <span
              :class="[
                'status-dot',
                apiHealthy ? 'status-dot--ok' : 'status-dot--danger',
              ]"
            />
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase"
              >API</span
            >
          </div>
          <div
            class="text-foreground font-mono text-[24px] leading-none font-semibold tracking-[-0.02em]"
          >
            <span>{{ apiHealthy ? apiLatency : '—' }}</span>
            <span class="text-muted-foreground ml-1 text-[12px] font-normal"
              >ms</span
            >
          </div>
          <div
            class="text-muted-foreground font-mono text-[11px] tracking-[0.04em]"
          >
            {{ apiHealthy ? `探测 ${apiLatency} ms` : '无法连接' }}
          </div>
        </div>
        <!-- WebSocket -->
        <div
          class="border-border flex flex-col gap-2 border-b p-5 md:border-r md:border-b-0 lg:border-b-0"
        >
          <div class="flex items-center gap-2.5">
            <span :class="['status-dot', `status-dot--${wsDot}`]" />
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase"
              >WebSocket</span
            >
          </div>
          <div
            class="text-foreground font-mono text-[24px] leading-none font-semibold tracking-[-0.02em]"
          >
            <span>{{ isConnected ? wsLatency : '—' }}</span>
            <span class="text-muted-foreground ml-1 text-[12px] font-normal"
              >ms</span
            >
          </div>
          <div
            class="text-muted-foreground font-mono text-[11px] tracking-[0.04em]"
          >
            {{ isConnected ? 'ping/pong 正常' : '未连接' }}
          </div>
        </div>
        <!-- Database -->
        <div class="flex flex-col gap-2 p-5">
          <div class="flex items-center gap-2.5">
            <span
              :class="[
                'status-dot',
                serverStatus?.service.db_ok
                  ? 'status-dot--ok'
                  : 'status-dot--idle',
              ]"
            />
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase"
              >Database</span
            >
          </div>
          <div
            class="text-foreground font-mono text-[24px] leading-none font-semibold tracking-[-0.02em]"
          >
            {{ serverStatus?.service.db_ok ? 'OK' : '—' }}
          </div>
          <div
            class="text-muted-foreground font-mono text-[11px] tracking-[0.04em]"
          >
            {{ serverStatus?.service.db_ok ? 'postgres · primary' : '检测中…' }}
          </div>
        </div>
      </section>

      <!-- ── 资源条：CPU / 内存 / 负载 ── -->
      <section
        class="border-border bg-muted overflow-hidden rounded-md border"
        data-od-id="resource-panel"
      >
        <header
          class="border-border bg-background/40 flex items-center justify-between border-b px-4 py-3"
        >
          <div
            class="text-foreground flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]"
          >
            <span class="bg-accent block h-3.5 w-1 rounded-sm" />
            系统资源
          </div>
          <div
            class="text-muted-foreground flex items-center gap-3 font-mono text-[11px] tracking-[0.06em] uppercase"
          >
            <span>host · {{ serverStatus?.system.os_name ?? '—' }}</span>
            <span class="inline-flex items-center gap-1.5">
              <span
                class="bg-success inline-block h-1.5 w-1.5 animate-[livePulse_1.6s_ease-out_infinite] rounded-full"
              />
              30s
            </span>
          </div>
        </header>
        <div class="space-y-1.5 px-5 py-4" v-if="serverStatus">
          <div
            class="grid grid-cols-[180px_1fr_120px] items-center gap-4 py-1.5"
          >
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase"
              >CPU 使用率</span
            >
            <div class="bg-warm-gray h-1.5 overflow-hidden rounded-full">
              <div
                class="bg-accent h-full rounded-full transition-all duration-700"
                :style="{ width: serverStatus.system.cpu_percent + '%' }"
              />
            </div>
            <span
              class="text-foreground text-right font-mono text-[13px] tabular-nums"
            >
              {{ serverStatus.system.cpu_percent.toFixed(1) }}%
            </span>
          </div>
          <div
            class="grid grid-cols-[180px_1fr_120px] items-center gap-4 py-1.5"
          >
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase"
              >内存使用率</span
            >
            <div class="bg-warm-gray h-1.5 overflow-hidden rounded-full">
              <div
                class="bg-accent h-full rounded-full transition-all duration-700"
                :style="{
                  width: serverStatus.system.memory_usage_percent + '%',
                }"
              />
            </div>
            <span
              class="text-foreground text-right font-mono text-[13px] tabular-nums"
            >
              {{ serverStatus.system.memory_usage_percent.toFixed(1) }}%
            </span>
          </div>
          <div
            class="grid grid-cols-[180px_1fr_120px] items-center gap-4 py-1.5"
          >
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase"
            >
              负载 (1m / 5m / 15m)
            </span>
            <div class="bg-warm-gray h-1.5 overflow-hidden rounded-full">
              <div
                class="bg-accent h-full rounded-full transition-all duration-700"
                :style="{
                  width:
                    Math.min(
                      (serverStatus.system.load_average['1m'] / 4) * 100,
                      100,
                    ) + '%',
                }"
              />
            </div>
            <span
              class="text-foreground text-right font-mono text-[12px] tabular-nums"
            >
              {{ serverStatus.system.load_average['1m'].toFixed(2) }}
              <span class="text-muted-foreground">/</span>
              {{ serverStatus.system.load_average['5m'].toFixed(2) }}
              <span class="text-muted-foreground">/</span>
              {{ serverStatus.system.load_average['15m'].toFixed(2) }}
            </span>
          </div>
          <div
            class="grid grid-cols-[180px_1fr_120px] items-center gap-4 py-1.5"
          >
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase"
              >堆 / 总占用</span
            >
            <div class="bg-warm-gray h-1.5 overflow-hidden rounded-full">
              <div
                class="bg-accent h-full rounded-full transition-all duration-700"
                :style="{
                  width:
                    (serverStatus.service.heap_memory_bytes /
                      serverStatus.service.total_memory_bytes) *
                      100 +
                    '%',
                }"
              />
            </div>
            <span
              class="text-foreground text-right font-mono text-[12px] tabular-nums"
            >
              {{ bytesToMB(serverStatus.service.heap_memory_bytes) }}
              <span class="text-muted-foreground">/</span>
              {{ bytesToMB(serverStatus.service.total_memory_bytes) }}
            </span>
          </div>
        </div>
        <div v-else class="space-y-3 px-5 py-4">
          <div class="bg-warm-gray h-2 w-3/4 animate-pulse rounded" />
          <div class="bg-warm-gray h-2 w-1/2 animate-pulse rounded" />
          <div class="bg-warm-gray h-2 w-2/3 animate-pulse rounded" />
        </div>
      </section>

      <!-- ── 延迟图 + 系统信息（两列） ── -->
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section
          class="border-border bg-muted overflow-hidden rounded-md border"
          data-od-id="latency-panel"
        >
          <header
            class="border-border bg-background/40 flex items-center justify-between border-b px-4 py-3"
          >
            <div
              class="text-foreground flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]"
            >
              <span class="bg-accent block h-3.5 w-1 rounded-sm" />
              API 延迟趋势
            </div>
            <div
              class="text-muted-foreground flex items-center gap-3 font-mono text-[11px] tracking-[0.06em] uppercase"
            >
              <span class="inline-flex items-center gap-1.5">
                <span
                  class="bg-success inline-block h-1.5 w-1.5 animate-[livePulse_1.6s_ease-out_infinite] rounded-full"
                />
                实时
              </span>
              <span>60s · ms</span>
            </div>
          </header>
          <div class="px-2 pt-2 pb-3">
            <div v-if="latencyHistory.length > 1" class="h-[220px]">
              <v-chart :option="chartOption" autoresize />
            </div>
            <div
              v-else
              class="text-muted-foreground flex h-[220px] items-center justify-center font-mono text-[12px]"
            >
              等待数据…
            </div>
          </div>
        </section>

        <section
          class="border-border bg-muted overflow-hidden rounded-md border"
          data-od-id="system-panel"
        >
          <header
            class="border-border bg-background/40 flex items-center justify-between border-b px-4 py-3"
          >
            <div
              class="text-foreground flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]"
            >
              <span class="bg-accent block h-3.5 w-1 rounded-sm" />
              主机信息
            </div>
            <span
              class="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase"
            >
              linux · amd64
            </span>
          </header>
          <div v-if="serverStatus" class="font-mono text-[12px]">
            <div
              class="border-border flex items-center justify-between border-b border-dashed px-4 py-2"
            >
              <span
                class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
                >OS / Kernel</span
              >
              <span class="text-foreground text-right"
                >{{ serverStatus.system.os_name }} ·
                {{ serverStatus.system.kernel_version }}</span
              >
            </div>
            <div
              class="border-border flex items-center justify-between border-b border-dashed px-4 py-2"
            >
              <span
                class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
                >CPU 型号</span
              >
              <span
                class="text-foreground truncate text-right"
                :title="serverStatus.system.cpu_model"
                >{{ serverStatus.system.cpu_model }}</span
              >
            </div>
            <div
              class="border-border flex items-center justify-between border-b border-dashed px-4 py-2"
            >
              <span
                class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
                >核心 (逻辑/物理)</span
              >
              <span class="text-foreground"
                >{{ serverStatus.system.cpu_count_logical }} /
                {{ serverStatus.system.cpu_count_physical }}</span
              >
            </div>
            <div
              class="border-border flex items-center justify-between border-b border-dashed px-4 py-2"
            >
              <span
                class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
                >总内存</span
              >
              <span class="text-foreground tabular-nums">{{
                bytesToGB(serverStatus.system.memory_total_bytes)
              }}</span>
            </div>
            <div
              class="border-border flex items-center justify-between border-b border-dashed px-4 py-2"
            >
              <span
                class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
                >已用</span
              >
              <span class="text-foreground tabular-nums">{{
                bytesToMB(serverStatus.system.memory_used_bytes)
              }}</span>
            </div>
            <div class="flex items-center justify-between px-4 py-2">
              <span
                class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
                >时区</span
              >
              <span class="text-foreground">{{
                serverStatus.system.system_timezone
              }}</span>
            </div>
          </div>
          <div v-else class="space-y-2 px-4 py-3">
            <div class="bg-warm-gray h-2 w-3/4 animate-pulse rounded" />
            <div class="bg-warm-gray h-2 w-1/2 animate-pulse rounded" />
            <div class="bg-warm-gray h-2 w-2/3 animate-pulse rounded" />
          </div>
        </section>
      </div>

      <!-- ── 服务运行时（紧凑 key-value 表） ── -->
      <section
        class="border-border bg-muted overflow-hidden rounded-md border"
        data-od-id="runtime-panel"
      >
        <header
          class="border-border bg-background/40 flex items-center justify-between border-b px-4 py-3"
        >
          <div
            class="text-foreground flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]"
          >
            <span class="bg-accent block h-3.5 w-1 rounded-sm" />
            服务运行时
          </div>
          <span
            class="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase"
            v-if="serverStatus"
          >
            运行
            <span class="text-foreground">{{
              formatUptime(now - serverStatus.service.start_time * 1000)
            }}</span>
          </span>
        </header>
        <div
          v-if="serverStatus"
          class="grid grid-cols-1 font-mono text-[12px] md:grid-cols-2"
        >
          <div
            class="border-border flex items-center justify-between border-b border-dashed px-4 py-2.5"
          >
            <span
              class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
              >Runtime</span
            >
            <span class="text-foreground">{{
              serverStatus.service.runtime
            }}</span>
          </div>
          <div
            class="border-border flex items-center justify-between border-b border-dashed px-4 py-2.5"
          >
            <span
              class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
              >协程</span
            >
            <span class="text-foreground tabular-nums">{{
              serverStatus.service.goroutines
            }}</span>
          </div>
          <div
            class="border-border flex items-center justify-between border-b border-dashed px-4 py-2.5"
          >
            <span
              class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
              >GC 次数</span
            >
            <span class="text-foreground tabular-nums">{{
              serverStatus.service.gc_count
            }}</span>
          </div>
          <div
            class="border-border flex items-center justify-between border-b border-dashed px-4 py-2.5"
          >
            <span
              class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
              >启动时间</span
            >
            <span class="text-foreground"
              >{{
                formatStartTime(serverStatus.service.start_time)
              }}
              (GMT+8)</span
            >
          </div>
        </div>
        <div v-else class="space-y-2 px-4 py-3">
          <div class="bg-warm-gray h-2 w-3/4 animate-pulse rounded" />
          <div class="bg-warm-gray h-2 w-1/2 animate-pulse rounded" />
        </div>
      </section>

      <!-- ── 最近事件 ── -->
      <section
        class="border-border bg-muted overflow-hidden rounded-md border"
        data-od-id="events-panel"
      >
        <header
          class="border-border bg-background/40 flex items-center justify-between border-b px-4 py-3"
        >
          <div
            class="text-foreground flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]"
          >
            <span class="bg-accent block h-3.5 w-1 rounded-sm" />
            最近事件
          </div>
          <div
            class="text-muted-foreground flex items-center gap-3 font-mono text-[11px] tracking-[0.06em] uppercase"
          >
            <span class="inline-flex items-center gap-1.5">
              <span
                class="bg-success inline-block h-1.5 w-1.5 animate-[livePulse_1.6s_ease-out_infinite] rounded-full"
              />
              30s
            </span>
            <span>最近 {{ recentEvents.length }} 条</span>
          </div>
        </header>
        <div v-if="recentEvents.length" class="font-mono text-[12px]">
          <div
            v-for="(event, idx) in recentEvents"
            :key="event.id"
            class="border-border flex items-start gap-3 px-4 py-2.5"
            :class="
              idx < recentEvents.length - 1 ? 'border-b border-dashed' : ''
            "
          >
            <span class="text-muted-foreground shrink-0 tabular-nums">
              {{ formatLogTime(event.timestamp) }}
            </span>
            <span
              :class="[
                'shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-[0.06em] uppercase',
                typeChipClass(event.type),
              ]"
            >
              {{ event.type }}
            </span>
            <span class="text-foreground min-w-0 flex-1 break-words">
              {{ event.title }}
            </span>
          </div>
        </div>
        <div v-else class="space-y-2 px-4 py-3">
          <div class="bg-warm-gray h-2 w-3/4 animate-pulse rounded" />
          <div class="bg-warm-gray h-2 w-1/2 animate-pulse rounded" />
          <div class="bg-warm-gray h-2 w-2/3 animate-pulse rounded" />
        </div>
      </section>

      <!-- ── 版本信息 ── -->
      <section
        class="border-border bg-muted overflow-hidden rounded-md border"
        data-od-id="version-panel"
      >
        <header
          class="border-border bg-background/40 flex items-center justify-between border-b px-4 py-3"
        >
          <div
            class="text-foreground flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]"
          >
            <span class="bg-accent block h-3.5 w-1 rounded-sm" />
            版本信息
          </div>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors"
            title="刷新"
            @click="loadStatus"
          >
            <svg
              class="h-3.5 w-3.5"
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
        </header>
        <div
          v-if="serverStatus"
          class="grid grid-cols-1 font-mono text-[12px] md:grid-cols-2"
        >
          <div
            class="border-border flex items-center justify-between border-b border-dashed px-4 py-2.5"
          >
            <span
              class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
              >当前版本</span
            >
            <span class="text-foreground">
              <code
                class="bg-warm-gray text-accent rounded-sm px-1.5 py-0.5 font-mono"
                >v{{ serverStatus.version.current_version }}</code
              >
            </span>
          </div>
          <div
            class="border-border flex items-center justify-between border-b border-dashed px-4 py-2.5"
          >
            <span
              class="text-muted-foreground text-[11px] tracking-[0.06em] uppercase"
              >仓库</span
            >
            <a
              :href="serverStatus.version.repo_url"
              target="_blank"
              class="text-accent underline underline-offset-4 hover:opacity-80"
              >GitHub 仓库</a
            >
          </div>
        </div>
      </section>

      <!-- ── Footer strip ── -->
      <footer
        class="text-muted-foreground border-border bg-muted flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border px-4 py-3 font-mono text-[11px] tracking-[0.08em] uppercase"
        data-od-id="footer-strip"
      >
        <span class="inline-flex items-center gap-2">
          <span
            class="bg-success inline-block h-1.5 w-1.5 animate-[livePulse_1.6s_ease-out_infinite] rounded-full"
          />
          <strong
            class="text-foreground font-medium tracking-[-0.01em] normal-case"
            >{{ visitorCount.count }}</strong
          >
          在线
        </span>
        <span v-if="serverStatus"
          >CPU
          <strong
            class="text-foreground font-medium tracking-[-0.01em] normal-case"
            >{{ serverStatus.system.cpu_percent.toFixed(0) }}%</strong
          ></span
        >
        <span v-if="serverStatus"
          >内存
          <strong
            class="text-foreground font-medium tracking-[-0.01em] normal-case"
            >{{ serverStatus.system.memory_usage_percent.toFixed(0) }}%</strong
          ></span
        >
        <span v-if="serverStatus"
          >运行时
          <strong
            class="text-foreground font-medium tracking-[-0.01em] normal-case"
            >{{
              formatUptime(now - serverStatus.service.start_time * 1000)
            }}</strong
          ></span
        >
      </footer>
    </motion.div>
  </div>
</template>

<style scoped>
/* 状态点（ok / warn / danger / idle）—— Datadog 风的发光小点 + 周期 ripple */
.status-dot {
  position: relative;
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid currentColor;
  opacity: 0;
  animation: dotRipple 1.8s ease-out infinite;
}
.status-dot--ok {
  color: var(--color-success);
  background: var(--color-success);
}
.status-dot--warn {
  color: var(--color-warning);
  background: var(--color-warning);
}
.status-dot--danger {
  color: var(--color-danger);
  background: var(--color-danger);
}
.status-dot--idle {
  color: var(--color-muted-foreground);
  background: var(--color-muted-foreground);
  opacity: 0.5;
}

@keyframes dotRipple {
  0% {
    opacity: 0.5;
    transform: scale(0.6);
  }
  100% {
    opacity: 0;
    transform: scale(1.4);
  }
}

/* Live 圆点呼吸 */
.live-dot {
  position: relative;
  box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 60%, transparent);
  animation: livePulse 1.6s ease-out infinite;
}
@keyframes livePulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 60%, transparent);
  }
  70% {
    box-shadow: 0 0 0 6px color-mix(in srgb, currentColor 0%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 0%, transparent);
  }
}
</style>
