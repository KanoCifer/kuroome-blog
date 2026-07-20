<script setup lang="ts">
import { connectionDelay, isConnected, sendPing } from '@/lib/visitorWs';
import {
  fetchStatusDetail,
  type StatusDetailData,
  fetchRecentEvents,
  type EventItem,
} from '@/shared/api';
import { useChartColors, withAlpha } from '@/shared/composables/useChartColors';
import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  watchEffect,
  type PropType,
} from 'vue';
import { motion, AnimatePresence } from 'motion-v';
import { EASE, EASE_SLOW } from '@/shared/constants/motionPresets';
import VChart from 'vue-echarts';

/* ── 类型 ── */
type Tone = 'success' | 'warning' | 'destructive';
type StatusKey = 'ok' | 'warn' | 'danger';

/* ── 语义 Tailwind 类静态映射(JIT 可扫描) ── */
const TONE_BG: Record<Tone, string> = {
  success: 'bg-success/8',
  warning: 'bg-warning/8',
  destructive: 'bg-destructive/8',
};
const TONE_BG_DEEP: Record<Tone, string> = {
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  destructive: 'bg-destructive/15',
};
const TONE_TEXT: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};
const TONE_BORDER: Record<Tone, string> = {
  success: 'border-success/20',
  warning: 'border-warning/25',
  destructive: 'border-destructive/25',
};
const TONE_DOT: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};
const STATUS_KEY_TO_TONE: Record<StatusKey, Tone> = {
  ok: 'success',
  warn: 'warning',
  danger: 'destructive',
};

/* ── Stores ── */
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

/* ── Reduced motion ── */
const prefersReducedMotion = computed(() => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
});

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
function formatLogTime(iso: string): string {
  const d = new Date(iso);
  return (
    `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

/* ── 事件类型映射 ── */
const EVENT_TONE: Record<string, Tone> = {
  startup: 'success',
  deploy: 'success',
  notify_failure: 'destructive',
};
const EVENT_LABEL: Record<string, string> = {
  startup: '启动',
  deploy: '部署',
  notify_failure: '通知失败',
};

/* ── 状态聚合 ── */
const overallStatus = computed<{
  key: StatusKey;
  tone: Tone;
  title: string;
  sub: string;
}>(() => {
  if (!apiHealthy.value) {
    return {
      key: 'danger',
      tone: 'destructive',
      title: '正在重新连接',
      sub: '请稍后重试,我们已记录问题',
    };
  }
  const delay = connectionDelay?.value ?? 0;
  if (!isConnected?.value || delay > 2000) {
    return {
      key: 'warn',
      tone: 'warning',
      title: '略感疲倦',
      sub: '响应正在变慢,可能影响加载',
    };
  }
  return {
    key: 'ok',
    tone: 'success',
    title: '一切如常',
    sub: '所有系统按预期运行',
  };
});

const wsLatency = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  return ms ? Math.round(ms) : 0;
});
const wsStatus = computed<{ key: StatusKey; label: string }>(() => {
  if (!isConnected?.value) return { key: 'warn', label: '静默' };
  const ms = connectionDelay?.value ?? 0;
  if (ms > 2000) return { key: 'danger', label: '高延迟' };
  if (ms > 200) return { key: 'warn', label: '偏慢' };
  return { key: 'ok', label: '畅通' };
});

const dbStatus = computed<{ key: StatusKey; label: string }>(() => {
  if (!serverStatus.value) return { key: 'warn', label: '检测中' };
  return serverStatus.value.service.db_ok
    ? { key: 'ok', label: '主库' }
    : { key: 'danger', label: '未响应' };
});

/* ── 30 天可用率 + 公告(暂未接 API,占位) ── */
const availability = ref<{
  rate: number;
  incidents: number;
} | null>(null);
const announcement = ref<string | null>(null);

/* ── 详情折叠 ── */
const showDetails = ref(false);

/* ── 进度计算 ── */
function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}
function resourceTone(pct: number): Tone {
  if (pct >= 85) return 'destructive';
  if (pct >= 65) return 'warning';
  return 'success';
}

/* ── Latency chart (echarts) ── */
const chartOption = computed(() => {
  const data = latencyHistory.value;
  const xData = data.map((_, i) => `${i}s`);

  const fg = palette.value.foreground;
  const muted = palette.value.mutedForeground;
  const border = palette.value.border;
  const card = palette.value.card;
  const primary = palette.value.primary;
  const gridLine = withAlpha(palette.value.mutedForeground, 0.18);

  return {
    backgroundColor: 'transparent',
    textStyle: { color: muted, fontSize: 12 },
    grid: { left: 36, right: 8, top: 8, bottom: 22, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: card,
      borderColor: border,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: fg, fontSize: 12 },
      axisPointer: {
        type: 'line',
        lineStyle: { color: primary, type: 'solid', width: 1, opacity: 0.4 },
      },
      formatter: (
        params: { seriesName: string; value: number; axisValue: string }[],
      ) => {
        const p = params[0];
        return `<div style="font-size:11px;color:${muted}">${p.axisValue}</div><div style="font-size:14px;font-weight:600;color:${fg};margin-top:2px">${p.value} ms</div>`;
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
      axisLabel: { color: muted, fontSize: 10 },
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
        itemStyle: { color: primary, borderColor: card, borderWidth: 2 },
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

/* ── 子组件:资源条 ── */
const ResourceBar = defineComponent({
  name: 'ResourceBar',
  props: {
    label: { type: String, required: true },
    value: { type: Number, required: true },
    tone: { type: String as PropType<Tone>, required: true },
    unit: { type: String, default: '%' },
    decimals: { type: Number, default: 1 },
    cap: { type: Number, default: 100 },
    rightDetail: { type: String, default: '' },
  },
  setup(props) {
    return () => {
      const barWidth = Math.min(
        100,
        Math.max(0, (props.value / props.cap) * 100),
      );
      return h('div', { class: 'space-y-1.5' }, [
        h(
          'div',
          {
            class: 'flex items-baseline justify-between gap-3 text-[13px]',
          },
          [
            h('span', { class: 'text-foreground/85' }, props.label),
            h(
              'span',
              { class: 'text-foreground font-mono tabular-nums' },
              props.rightDetail ||
                `${props.value.toFixed(props.decimals)}${props.unit}`,
            ),
          ],
        ),
        h(
          'div',
          { class: 'bg-muted relative h-1 overflow-hidden rounded-full' },
          [
            h('div', {
              class: `absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out ${TONE_DOT[props.tone]}`,
              style: { width: `${barWidth}%` },
            }),
          ],
        ),
      ]);
    };
  },
});
</script>

<template>
  <div class="bg-background min-h-screen">
    <motion.div
      :initial="prefersReducedMotion ? false : { opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="EASE_SLOW"
      class="mx-auto w-full max-w-6xl space-y-10 px-4 py-12 sm:px-6"
    >
      <!-- ─── Hero: 状态宣告 ─── -->
      <section :aria-label="overallStatus.title">
        <AnimatePresence mode="wait">
          <motion.div
            :key="overallStatus.key"
            :initial="prefersReducedMotion ? false : { opacity: 0, y: 6 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="
              prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }
            "
            :transition="EASE"
            :class="[
              'relative overflow-hidden rounded-2xl border p-6 sm:p-10',
              TONE_BORDER[overallStatus.tone],
              TONE_BG[overallStatus.tone],
            ]"
          >
            <div class="grid gap-6 md:grid-cols-[1.5fr_1fr] md:items-end">
              <!-- 状态词 -->
              <div class="space-y-3">
                <h1
                  class="text-foreground font-serif text-[clamp(2.25rem,5vw+1rem,4.5rem)] leading-[1.05] tracking-[-0.025em]"
                  style="text-wrap: balance"
                >
                  {{ overallStatus.title }}
                </h1>
                <p
                  class="text-muted-foreground max-w-[48ch] text-[15px] leading-relaxed"
                >
                  {{ overallStatus.sub
                  }}<span v-if="serverStatus">
                    · 启动于
                    <span class="text-foreground/80">{{
                      formatUptime(now - serverStatus.service.start_time * 1000)
                    }}</span
                    >前</span
                  >
                </p>

                <!-- mini 三联 -->
                <div
                  class="border-foreground/10 mt-5 grid grid-cols-3 gap-x-6 gap-y-1 border-t pt-4 text-[13px]"
                >
                  <div class="space-y-0.5">
                    <div class="text-muted-foreground">API</div>
                    <div class="flex items-baseline gap-1.5">
                      <span
                        class="text-foreground font-mono text-[15px] font-semibold tabular-nums"
                      >
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            :key="apiHealthy ? apiLatency : -1"
                            :initial="
                              prefersReducedMotion
                                ? false
                                : { opacity: 0, y: 4 }
                            "
                            :animate="{ opacity: 1, y: 0 }"
                            :exit="
                              prefersReducedMotion
                                ? { opacity: 1 }
                                : { opacity: 0, y: -4 }
                            "
                            :transition="{ duration: 0.2 }"
                          >
                            {{ apiHealthy ? apiLatency : '—' }}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                      <span class="text-muted-foreground text-[11px]">ms</span>
                    </div>
                  </div>
                  <div class="space-y-0.5">
                    <div class="text-muted-foreground">WebSocket</div>
                    <div class="flex items-baseline gap-1.5">
                      <span
                        :class="[
                          'font-mono text-[15px] font-semibold tabular-nums',
                          TONE_TEXT[STATUS_KEY_TO_TONE[wsStatus.key]],
                        ]"
                      >
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            :key="wsLatency"
                            :initial="
                              prefersReducedMotion
                                ? false
                                : { opacity: 0, y: 4 }
                            "
                            :animate="{ opacity: 1, y: 0 }"
                            :exit="
                              prefersReducedMotion
                                ? { opacity: 1 }
                                : { opacity: 0, y: -4 }
                            "
                            :transition="{ duration: 0.2 }"
                          >
                            {{ isConnected ? wsLatency : '—' }}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                      <span class="text-muted-foreground text-[11px]">ms</span>
                    </div>
                  </div>
                  <div class="space-y-0.5">
                    <div class="text-muted-foreground">Database</div>
                    <div
                      :class="[
                        'text-[15px] font-semibold',
                        TONE_TEXT[STATUS_KEY_TO_TONE[dbStatus.key]],
                      ]"
                    >
                      {{ dbStatus.label }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 右侧:时钟 -->
              <div class="space-y-1 text-right">
                <div class="text-muted-foreground text-[12px]">当前时刻</div>
                <div
                  class="text-foreground font-mono text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-none tracking-[-0.02em] tabular-nums"
                >
                  {{ fmtClock(now) }}
                </div>
                <div class="text-muted-foreground text-[12px]">
                  {{ fmtDate(now) }} · 最后检测 {{ fmtClock(now) }}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <!-- ─── 公告 + 30 天可用率 ─── -->
      <section class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
        <p class="text-foreground/85 text-[14px] leading-relaxed">
          <template v-if="announcement">
            <span
              class="bg-warning/15 text-warning mr-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
              >公告</span
            >
            {{ announcement }}
          </template>
          <template v-else>
            <span class="text-muted-foreground">暂无公告 ·</span>
            一切运行平稳,变更会同步发布在此。
          </template>
        </p>
        <p class="text-muted-foreground text-[13px] tabular-nums">
          过去 30 天 ·
          <span
            v-if="availability"
            class="text-foreground font-mono font-semibold"
            >{{ availability.rate.toFixed(2) }}%</span
          >
          <span v-else class="text-foreground/60">—</span>
          可用
          <template v-if="availability && availability.incidents > 0">
            · {{ availability.incidents }} 次中断
          </template>
          <template v-else-if="availability"> · 无中断 </template>
          <template v-else> · 历史数据收集中 </template>
        </p>
      </section>

      <!-- ─── 资源 + 延迟(双列) ─── -->
      <div class="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <!-- 资源 -->
        <section class="space-y-5" aria-label="系统资源">
          <header class="flex items-baseline justify-between">
            <h2
              class="text-foreground font-serif text-[20px] tracking-[-0.01em]"
            >
              系统资源
            </h2>
            <span
              v-if="serverStatus"
              class="text-muted-foreground text-[12px] tabular-nums"
            >
              {{ serverStatus.system.os_name }}
            </span>
          </header>

          <div v-if="serverStatus" class="space-y-4">
            <ResourceBar
              label="CPU 使用率"
              :value="serverStatus.system.cpu_percent"
              :tone="resourceTone(serverStatus.system.cpu_percent)"
              :decimals="1"
            />
            <ResourceBar
              label="内存使用率"
              :value="serverStatus.system.memory_usage_percent"
              :tone="resourceTone(serverStatus.system.memory_usage_percent)"
              :decimals="1"
            />
            <ResourceBar
              label="负载 (1m)"
              :value="serverStatus.system.load_average['1m']"
              :tone="
                resourceTone(percent(serverStatus.system.load_average['1m'], 4))
              "
              unit=""
              :decimals="2"
              :cap="4"
            />
            <ResourceBar
              label="堆 / 总占用"
              :value="
                percent(
                  serverStatus.service.heap_memory_bytes,
                  serverStatus.service.total_memory_bytes,
                )
              "
              :tone="
                resourceTone(
                  percent(
                    serverStatus.service.heap_memory_bytes,
                    serverStatus.service.total_memory_bytes,
                  ),
                )
              "
              :decimals="1"
              :right-detail="`${bytesToMB(serverStatus.service.heap_memory_bytes)} / ${bytesToMB(serverStatus.service.total_memory_bytes)}`"
            />
          </div>
          <div v-else class="space-y-4">
            <div class="bg-muted h-3 w-full animate-pulse rounded" />
            <div class="bg-muted h-3 w-2/3 animate-pulse rounded" />
            <div class="bg-muted h-3 w-1/2 animate-pulse rounded" />
          </div>
        </section>

        <!-- 延迟图 -->
        <section class="space-y-5" aria-label="API 延迟趋势">
          <header class="flex items-baseline justify-between">
            <h2
              class="text-foreground font-serif text-[20px] tracking-[-0.01em]"
            >
              API 延迟趋势
            </h2>
            <span class="text-muted-foreground text-[12px] tabular-nums">
              最近 60s · 毫秒
            </span>
          </header>
          <div class="h-[220px]">
            <v-chart
              v-if="latencyHistory.length > 1"
              :option="chartOption"
              autoresize
            />
            <div
              v-else
              class="text-muted-foreground flex h-full items-center justify-center text-[13px]"
            >
              等待数据…
            </div>
          </div>
        </section>
      </div>

      <!-- ─── 详情面板(折叠) ─── -->
      <section>
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground group inline-flex items-center gap-2 text-[13px] transition-colors"
          :aria-expanded="showDetails"
          aria-controls="status-details-panel"
          @click="showDetails = !showDetails"
        >
          <span
            class="bg-border inline-block h-px w-6 transition-all duration-300 group-hover:w-8"
          />
          {{ showDetails ? '收起详细信息' : '展开详细信息' }}
          <svg
            :class="[
              'h-3 w-3 transition-transform duration-300',
              showDetails ? 'rotate-180' : '',
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <AnimatePresence>
          <motion.div
            v-if="showDetails"
            id="status-details-panel"
            :initial="prefersReducedMotion ? false : { opacity: 0, height: 0 }"
            :animate="{ opacity: 1, height: 'auto' }"
            :exit="
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
            "
            :transition="EASE"
            class="overflow-hidden"
          >
            <div
              class="bg-card squircle border-border mt-6 grid gap-8 border p-6 shadow-[inset_0_0_20px_0px_rgba(255,255,255,0.35)] sm:p-8 md:grid-cols-2"
            >
              <!-- 主机信息 -->
              <div class="space-y-4">
                <h3
                  class="text-foreground font-serif text-[17px] tracking-[-0.01em]"
                >
                  主机信息
                </h3>
                <div v-if="serverStatus" class="text-[13px]">
                  <dl class="divide-border divide-y">
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">操作系统 / 内核</dt>
                      <dd class="text-foreground text-right">
                        {{ serverStatus.system.os_name }} ·
                        {{ serverStatus.system.kernel_version }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between gap-4 py-2">
                      <dt class="text-muted-foreground shrink-0">CPU 型号</dt>
                      <dd
                        class="text-foreground truncate text-right"
                        :title="serverStatus.system.cpu_model"
                      >
                        {{ serverStatus.system.cpu_model }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">核心(逻辑 / 物理)</dt>
                      <dd class="text-foreground tabular-nums">
                        {{ serverStatus.system.cpu_count_logical }} /
                        {{ serverStatus.system.cpu_count_physical }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">总内存</dt>
                      <dd class="text-foreground tabular-nums">
                        {{ bytesToGB(serverStatus.system.memory_total_bytes) }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">已用</dt>
                      <dd class="text-foreground tabular-nums">
                        {{ bytesToMB(serverStatus.system.memory_used_bytes) }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">时区</dt>
                      <dd class="text-foreground">
                        {{ serverStatus.system.system_timezone }}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div v-else class="space-y-2">
                  <div class="bg-muted h-3 w-3/4 animate-pulse rounded" />
                  <div class="bg-muted h-3 w-1/2 animate-pulse rounded" />
                </div>
              </div>

              <!-- 运行时 -->
              <div class="space-y-4">
                <h3
                  class="text-foreground font-serif text-[17px] tracking-[-0.01em]"
                >
                  服务运行时
                </h3>
                <div v-if="serverStatus" class="text-[13px]">
                  <dl class="divide-border divide-y">
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">运行时</dt>
                      <dd class="text-foreground">
                        {{ serverStatus.service.runtime }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">协程数</dt>
                      <dd class="text-foreground tabular-nums">
                        {{ serverStatus.service.goroutines }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">GC 次数</dt>
                      <dd class="text-foreground tabular-nums">
                        {{ serverStatus.service.gc_count }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between py-2">
                      <dt class="text-muted-foreground">启动时间</dt>
                      <dd class="text-foreground tabular-nums">
                        {{ formatStartTime(serverStatus.service.start_time) }}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div v-else class="space-y-2">
                  <div class="bg-muted h-3 w-3/4 animate-pulse rounded" />
                  <div class="bg-muted h-3 w-1/2 animate-pulse rounded" />
                </div>
              </div>

              <!-- 最近事件(跨双列) -->
              <div class="space-y-4 md:col-span-2">
                <h3
                  class="text-foreground font-serif text-[17px] tracking-[-0.01em]"
                >
                  最近事件
                </h3>
                <div v-if="recentEvents.length" class="text-[13px]">
                  <ol class="divide-border divide-y">
                    <li
                      v-for="event in recentEvents"
                      :key="event.id"
                      class="grid grid-cols-[auto_auto_1fr] items-baseline gap-3 py-2.5"
                    >
                      <span
                        class="text-muted-foreground font-mono text-[12px] tabular-nums"
                      >
                        {{ formatLogTime(event.timestamp) }}
                      </span>
                      <span
                        :class="[
                          'inline-flex items-center gap-1.5 text-[11px]',
                          TONE_TEXT[EVENT_TONE[event.type] ?? 'success'],
                        ]"
                      >
                        <span
                          :class="[
                            'inline-block h-1.5 w-1.5 rounded-full',
                            TONE_DOT[EVENT_TONE[event.type] ?? 'success'],
                          ]"
                        />
                        {{ EVENT_LABEL[event.type] ?? event.type }}
                      </span>
                      <span class="text-foreground min-w-0 truncate">
                        {{ event.title }}
                      </span>
                    </li>
                  </ol>
                </div>
                <div v-else class="space-y-2">
                  <div class="bg-muted h-3 w-3/4 animate-pulse rounded" />
                  <div class="bg-muted h-3 w-1/2 animate-pulse rounded" />
                </div>
              </div>

              <!-- 版本(跨双列) -->
              <div
                v-if="serverStatus"
                class="border-border text-muted-foreground flex items-center justify-between border-t pt-4 text-[12px] md:col-span-2"
              >
                <span>
                  当前版本
                  <code
                    class="bg-muted text-foreground ml-1.5 rounded px-1.5 py-0.5 font-mono"
                    >v{{ serverStatus.version.current_version }}</code
                  >
                </span>
                <a
                  :href="serverStatus.version.repo_url"
                  target="_blank"
                  rel="noopener"
                  class="hover:text-foreground underline underline-offset-4 transition-colors"
                  >查看仓库</a
                >
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </motion.div>
  </div>
</template>
