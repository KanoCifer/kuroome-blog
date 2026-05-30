<script setup lang="ts">
import { connectionDelay } from "@/plugins/visitorWs";
import { useVisitorCountStore } from "@/stores/visitorCount";
import { useWebSocket } from "@/composables/useWebSocket";
import { fetchStatusDetail, type StatusDetailData } from "@/api/statusGateway";
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { motion } from "motion-v";

/* ── Stores ── */
const visitorCount = useVisitorCountStore();

/* ── Server metrics ── */
const serverStatus = ref<StatusDetailData | null>(null);
let statusTimer: ReturnType<typeof setInterval> | null = null;

async function loadStatus() {
  try {
    serverStatus.value = await fetchStatusDetail();
  } catch {
    /* silent */
  }
}

/* ── WebSocket (1 s ping) ── */
function buildWsUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE || "/api";
  if (apiBase.startsWith("http")) return apiBase.replace(/^http/, "ws") + "/v2/publicv2/ws";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${apiBase}/v2/publicv2/ws`;
}

const ws = useWebSocket({
  url: buildWsUrl(),
  pingIntervalMs: 1000,
  immediate: true,
});

/* ── Latency history (from status-page WS) ── */
const latencyHistory = ref<number[]>([]);
const MAX_HISTORY = 60;

watchEffect(() => {
  const ms = ws.connectionDelay.value;
  if (ms > 0) {
    latencyHistory.value = [...latencyHistory.value.slice(-(MAX_HISTORY - 1)), ms];
  }
});

/* ── API health check (direct fetch) ── */
const apiLatency = ref(0);
const apiHealthy = ref(true);

async function pingApi() {
  const base = import.meta.env.VITE_API_BASE || "/api";
  const start = performance.now();
  try {
    const res = await fetch(`${base}/v1/status`, {
      method: "GET",
      cache: "no-store",
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
  if (s < 60) return `${s} 秒`;
  if (s < 3600) return `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
  if (s < 86400) return `${Math.floor(s / 3600)} 时 ${Math.floor((s % 3600) / 60)} 分`;
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
      label: "服务中断",
      dotClass: "bg-red-500",
      bgClass: "bg-destructive/10",
      textClass: "text-destructive",
    };
  const delay = connectionDelay?.value ?? 0;
  if (!ws.isConnected.value || delay > 2000)
    return {
      label: "性能降级",
      dotClass: "bg-yellow-500",
      bgClass: "bg-warning/10",
      textClass: "text-warning",
    };
  return {
    label: "运行正常",
    dotClass: "bg-emerald-500",
    bgClass: "bg-success/10",
    textClass: "text-success",
  };
});

const wsLatency = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  return ms ? `${Math.round(ms)} ms` : "-- ms";
});

const wsDotClass = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  if (!ms) return "bg-muted-foreground/40";
  if (ms < 200) return "bg-emerald-500";
  if (ms < 2000) return "bg-yellow-500";
  return "bg-red-500";
});

/* ── Latency chart (canvas) ── */
const chartCanvas = ref<HTMLCanvasElement | null>(null);

function drawChart() {
  const canvas = chartCanvas.value;
  if (!canvas) return;

  const parent = canvas.parentElement;
  if (!parent) return;

  const dpr = window.devicePixelRatio || 1;
  const w = parent.clientWidth;
  const h = 220;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const PAD_TOP = 20;
  const PAD_BOTTOM = 36;
  const PAD_LEFT = 48;
  const PAD_RIGHT = 12;
  const chartW = w - PAD_LEFT - PAD_RIGHT;
  const chartH = h - PAD_TOP - PAD_BOTTOM;

  ctx.clearRect(0, 0, w, h);

  const data = latencyHistory.value;
  if (data.length < 2) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("等待数据…", w / 2, h / 2);
    return;
  }

  const maxMs = 800;
  const yOf = (v: number) => PAD_TOP + chartH - (Math.min(v, maxMs) / maxMs) * chartH;

  // Grid
  const gridValues = [0, 200, 400, 600, 800];
  ctx.strokeStyle = "rgba(128,128,128,0.12)";
  ctx.lineWidth = 1;
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(128,128,128,0.45)";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i < gridValues.length; i++) {
    const y = yOf(gridValues[i]);
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(w - PAD_RIGHT, y);
    ctx.stroke();
    ctx.fillText(`${gridValues[i]}`, PAD_LEFT - 8, y);
  }

  // X labels
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const step = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i += step) {
    const x = PAD_LEFT + (i / (data.length - 1)) * chartW;
    ctx.fillText(`${i}s`, x, h - PAD_BOTTOM + 14);
  }
  if (data.length > 1) {
    ctx.fillText(`${data.length - 1}s`, PAD_LEFT + chartW, h - PAD_BOTTOM + 14);
  }

  // Gradient area
  const grad = ctx.createLinearGradient(0, PAD_TOP, 0, PAD_TOP + chartH);
  grad.addColorStop(0, "rgba(239,68,68,0.15)");
  grad.addColorStop(0.25, "rgba(234,179,8,0.10)");
  grad.addColorStop(1, "rgba(16,185,129,0.20)");

  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP + chartH);
  for (let i = 0; i < data.length; i++) {
    const x = PAD_LEFT + (i / (data.length - 1)) * chartW;
    const y = yOf(data[i]);
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(PAD_LEFT + chartW, PAD_TOP + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = PAD_LEFT + (i / (data.length - 1)) * chartW;
    const y = yOf(data[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "rgba(16,185,129,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Endpoint dot
  const lastX = PAD_LEFT + chartW;
  const lastY = yOf(data[data.length - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16,185,129,0.9)";
  ctx.fill();
}

/* ── Lifecycle ── */
let drawRaf = 0;
let resizeObs: ResizeObserver | null = null;

watchEffect(() => {
  void latencyHistory.value.length;
  const canvas = chartCanvas.value;
  if (canvas) {
    cancelAnimationFrame(drawRaf);
    drawRaf = requestAnimationFrame(drawChart);
  }
});

onMounted(() => {
  loadStatus();
  statusTimer = setInterval(loadStatus, 30_000);
  pingApi();
  apiTimer = setInterval(pingApi, 10_000);

  const el = chartCanvas.value;
  if (el?.parentElement) {
    resizeObs = new ResizeObserver(() => {
      cancelAnimationFrame(drawRaf);
      drawRaf = requestAnimationFrame(drawChart);
    });
    resizeObs.observe(el.parentElement);
  }
});

onUnmounted(() => {
  cancelAnimationFrame(drawRaf);
  if (statusTimer) clearInterval(statusTimer);
  if (apiTimer) clearInterval(apiTimer);
  resizeObs?.disconnect();
});
</script>

<template>
  <div class="bg-background flex min-h-screen justify-center px-4 py-16">
    <motion.div :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }" class="w-full max-w-3xl space-y-8">
      <!-- Header -->
      <header class="space-y-2 text-center">
        <h1 class="text-foreground text-3xl font-bold">服务状态</h1>
        <p class="text-muted-foreground text-sm">Kuroome Blog 各项服务的实时运行状况</p>
      </header>

      <!-- Overall status banner -->
      <div :class="[overallStatus.bgClass, 'rounded-xl p-6 text-center']">
        <div class="mb-1 flex items-center justify-center gap-2">
          <span class="relative flex h-3 w-3">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              :class="overallStatus.dotClass"
            />
            <span class="relative inline-flex h-3 w-3 rounded-full" :class="overallStatus.dotClass" />
          </span>
          <span :class="overallStatus.textClass" class="text-lg font-semibold">
            {{ overallStatus.label }}
          </span>
        </div>
        <p class="text-muted-foreground text-sm">所有系统运行中 · 上次检测刚刚</p>
      </div>

      <!-- Service cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- API -->
        <div class="border-border bg-card rounded-xl border p-5">
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
            {{ apiHealthy ? "正常运行" : "无法连接" }}
          </p>
          <p class="text-foreground text-2xl font-bold">
            {{ apiHealthy ? `${apiLatency} ms` : "--" }}
          </p>
        </div>

        <!-- WebSocket -->
        <div class="border-border bg-card rounded-xl border p-5">
          <div class="mb-3 flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                :class="wsDotClass"
              />
              <span class="relative inline-flex h-2 w-2 rounded-full" :class="wsDotClass" />
            </span>
            <span class="text-foreground font-medium">WebSocket</span>
          </div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ ws.isConnected.value ? "已连接" : "未连接" }}
          </p>
          <p class="text-foreground text-2xl font-bold">{{ wsLatency }}</p>
        </div>

        <!-- Database -->
        <div class="border-border bg-card rounded-xl border p-5">
          <div class="mb-3 flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                :class="serverStatus?.db_ok ? 'bg-emerald-500' : 'bg-muted-foreground/40'"
              />
              <span
                class="relative inline-flex h-2 w-2 rounded-full"
                :class="serverStatus?.db_ok ? 'bg-emerald-500' : 'bg-muted-foreground/40'"
              />
            </span>
            <span class="text-foreground font-medium">数据库</span>
          </div>
          <p class="text-muted-foreground mb-1 text-sm">
            {{ serverStatus?.db_ok ? "连接正常" : "检测中…" }}
          </p>
          <p class="text-foreground text-2xl font-bold">
            {{ serverStatus?.db_ok ? "OK" : "--" }}
          </p>
        </div>
      </div>

      <!-- Latency chart -->
      <div class="border-border bg-card rounded-xl border p-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-foreground font-medium">延迟趋势</h2>
          <div class="flex items-center gap-1.5">
            <span class="relative flex h-2 w-2">
              <span class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span class="bg-success relative inline-flex h-2 w-2 rounded-full" />
            </span>
            <span class="text-muted-foreground text-sm">实时</span>
          </div>
        </div>
        <div>
          <canvas ref="chartCanvas" />
        </div>
        <div class="text-muted-foreground mt-3 flex justify-between text-xs">
          <span>60 s 前</span>
          <span>现在</span>
        </div>
      </div>

      <!-- Footer meta -->
      <div class="text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <span class="inline-flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span class="bg-success relative inline-flex h-2 w-2 rounded-full" />
          </span>
          {{ visitorCount.count }} 人在线
        </span>
        <span v-if="serverStatus"> CPU {{ serverStatus.cpu_percent }}% · 内存 {{ serverStatus.mem_usage }}% </span>
        <span v-if="serverStatus"> 运行 {{ formatUptime(serverStatus.uptime) }} </span>
      </div>
    </motion.div>
  </div>
</template>
