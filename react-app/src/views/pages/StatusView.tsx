import { useVisitorCountStore } from '@/stores/visitorCountStore';
import type { StatusDetailData } from '@/services/statusService';
import { statusService } from '@/services/statusService';
import ReactEChartsCore from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  type TooltipComponentOption,
  type GridComponentOption,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
  TooltipComponentOption | GridComponentOption
>;

const service = statusService();
const MAX_HISTORY = 60;

function formatUptime(s: number): string {
  if (s < 60) return `00 天 00 时 00 分 ${s} 秒`;
  if (s < 3600) return `00 天 00 时 ${Math.floor(s / 60)} 分 ${s % 60} 秒`;
  if (s < 86400)
    return `00 天 ${Math.floor(s / 3600)} 时 ${Math.floor((s % 3600) / 60)} 分`;
  return `${Math.floor(s / 86400)} 天 ${Math.floor((s % 86400) / 3600)} 时`;
}

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

function StatusDot({ className }: { className: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${className}`}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${className}`}
      />
    </span>
  );
}

function LargeStatusDot({ className }: { className: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${className}`}
      />
      <span
        className={`relative inline-flex h-3 w-3 rounded-full ${className}`}
      />
    </span>
  );
}

export default function StatusView() {
  const visitorCount = useVisitorCountStore((s) => s.count);
  const connectionDelay = useVisitorCountStore((s) => s.connectionDelay);
  const wsConnected = useVisitorCountStore((s) => s.isConnected);
  const storeSendPing = useVisitorCountStore((s) => s.sendPing);

  /* ── Server metrics ── */
  const [serverStatus, setServerStatus] = useState<StatusDetailData | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());

  const loadStatus = useCallback(async () => {
    try {
      const data = await service.getStatusDetail();
      setServerStatus(data);
    } catch {
      /* silent */
    }
  }, []);

  /* ── Latency history (reuses global visitor WS) ── */
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const prevDelayRef = useRef(0);

  useEffect(() => {
    if (connectionDelay > 0 && connectionDelay !== prevDelayRef.current) {
      prevDelayRef.current = connectionDelay;
      const ms = Math.round(connectionDelay * 10) / 10;
      setLatencyHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), ms]);
    }
  }, [connectionDelay]);

  /* ── 1s ping timer on global WS ── */
  useEffect(() => {
    const timer = setInterval(() => {
      storeSendPing?.();
    }, 1000);
    return () => clearInterval(timer);
  }, [storeSendPing]);

  /* ── API health check ── */
  const [apiLatency, setApiLatency] = useState(0);
  const [apiHealthy, setApiHealthy] = useState(true);

  const pingApi = useCallback(async () => {
    const base = import.meta.env.VITE_API_BASE || '/api';
    const start = performance.now();
    try {
      const res = await fetch(`${base}/v1/status`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error();
      setApiLatency(Math.round(performance.now() - start));
      setApiHealthy(true);
    } catch {
      setApiHealthy(false);
    }
  }, []);

  /* ── Timers ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
    pingApi();

    const statusTimer = setInterval(loadStatus, 30_000);
    const nowTimer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    const apiTimer = setInterval(pingApi, 10_000);

    return () => {
      clearInterval(statusTimer);
      clearInterval(nowTimer);
      clearInterval(apiTimer);
    };
  }, [loadStatus, pingApi]);

  /* ── Overall status ── */
  const overallStatus = useMemo(() => {
    if (!apiHealthy)
      return {
        label: '服务中断',
        dotClass: 'bg-red-500',
        bgClass: 'bg-destructive/10',
        textClass: 'text-destructive',
      };
    const delay = connectionDelay ?? 0;
    if (!wsConnected || delay > 2000)
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
  }, [apiHealthy, wsConnected, connectionDelay]);

  const wsLatency = useMemo(() => {
    const ms = connectionDelay ?? 0;
    return ms ? `${Math.round(ms)} ms` : '-- ms';
  }, [connectionDelay]);

  const wsDotClass = useMemo(() => {
    const ms = connectionDelay ?? 0;
    if (!ms) return 'bg-muted-foreground/40';
    if (ms < 200) return 'bg-emerald-500';
    if (ms < 2000) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [connectionDelay]);

  /* ── ECharts option ── */
  const chartOption = useMemo((): ECOption => {
    const data = latencyHistory;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<div style="font-size:13px;color:#6b7280">${p.axisValue ?? p.name}</div><div style="font-size:16px;font-weight:600;margin-top:4px">${p.value} ms</div>`;
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
          symbolSize: (_value: number, params: { dataIndex: number }) =>
            params.dataIndex === data.length - 1 ? 8 : 0,
          showSymbol: data.length > 0,
          lineStyle: { width: 2, color: 'rgba(16,185,129,0.7)' },
          itemStyle: {
            color: 'rgba(16,185,129,0.9)',
            borderColor: '#fff',
            borderWidth: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239,68,68,0.15)' },
              { offset: 0.25, color: 'rgba(234,179,8,0.10)' },
              { offset: 1, color: 'rgba(16,185,129,0.20)' },
            ]),
          },
        },
      ],
    };
  }, [latencyHistory]);

  return (
    <div className="bg-background flex min-h-dvh justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 w-full max-w-3xl space-y-8"
      >
        {/* Header */}
        <header className="space-y-2 text-center">
          <h1 className="text-foreground text-3xl font-bold">服务状态</h1>
          <p className="text-muted-foreground text-sm">
            Kuroome Blog 各项服务的实时运行状况
          </p>
        </header>

        {/* Overall status banner */}
        <div className={`${overallStatus.bgClass} rounded-xl p-6 text-center`}>
          <div className="mb-1 flex items-center justify-center gap-2">
            <LargeStatusDot className={overallStatus.dotClass} />
            <span
              className={`${overallStatus.textClass} text-lg font-semibold`}
            >
              {overallStatus.label}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            所有系统运行中 · 上次检测刚刚
          </p>
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* API */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <StatusDot
                className={apiHealthy ? 'bg-emerald-500' : 'bg-red-500'}
              />
              <span className="text-foreground font-medium">API 服务</span>
            </div>
            <p className="text-muted-foreground mb-1 text-sm">
              {apiHealthy ? '正常运行' : '无法连接'}
            </p>
            <p className="text-foreground text-2xl font-bold">
              {apiHealthy ? `${apiLatency} ms` : '--'}
            </p>
          </div>

          {/* WebSocket */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <StatusDot className={wsDotClass} />
              <span className="text-foreground font-medium">WebSocket</span>
            </div>
            <p className="text-muted-foreground mb-1 text-sm">
              {wsConnected ? '已连接' : '未连接'}
            </p>
            <p className="text-foreground text-2xl font-bold">{wsLatency}</p>
          </div>

          {/* Database */}
          <div className="border-border bg-card rounded-xl border p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <StatusDot
                className={
                  serverStatus?.service.dbOk
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground/40'
                }
              />
              <span className="text-foreground font-medium">数据库</span>
            </div>
            <p className="text-muted-foreground mb-1 text-sm">
              {serverStatus?.service.dbOk ? '连接正常' : '检测中…'}
            </p>
            <p className="text-foreground text-2xl font-bold">
              {serverStatus?.service.dbOk ? 'OK' : '--'}
            </p>
          </div>
        </div>

        {/* Latency chart */}
        <div className="border-border bg-card rounded-xl border p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground font-medium">延迟趋势</h2>
            <div className="flex items-center gap-1.5">
              <StatusDot className="bg-success" />
              <span className="text-muted-foreground text-sm">实时</span>
            </div>
          </div>
          {latencyHistory.length > 1 ? (
            <div className="h-[220px]">
              <ReactEChartsCore
                echarts={echarts}
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge
              />
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-muted-foreground text-sm">等待数据…</p>
            </div>
          )}
        </div>

        {/* Version Info */}
        <div className="border-border bg-card rounded-xl border p-6 shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <svg
              className="text-muted-foreground h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-foreground text-lg font-semibold">版本信息</h2>
          </div>

          {serverStatus && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">项目仓库</span>
                <a
                  href={serverStatus.version.repoUrl}
                  target="_blank"
                  className="text-primary text-sm hover:underline"
                  rel="noreferrer"
                >
                  GitHub 仓库
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  后端运行版本
                </span>
                <span className="text-foreground font-mono text-sm">
                  v{serverStatus.version.currentVersion}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Service Info + System Info */}
        <div className="border-border bg-card rounded-xl border p-6 shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="text-muted-foreground h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                />
              </svg>
              <h2 className="text-foreground text-lg font-semibold">
                服务信息
              </h2>
            </div>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="刷新"
              onClick={loadStatus}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {serverStatus ? (
            <div className="space-y-6">
              {/* Service info */}
              <div>
                <div className="mb-3 flex items-center gap-1.5">
                  <svg
                    className="text-muted-foreground h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="text-foreground text-sm font-medium">
                    服务信息
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      运行时版本 / 协程数量 / GC 次数
                    </span>
                    <span className="text-foreground text-sm">
                      {serverStatus.service.runtime} |{' '}
                      {serverStatus.service.coroutines} |{' '}
                      {serverStatus.service.gcCount[0]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      启动时间 / 运行时间
                    </span>
                    <span className="text-foreground text-sm">
                      {formatStartTime(serverStatus.service.startTime)} (GMT+8)
                      |{' '}
                      {formatUptime(
                        Math.floor(
                          (now - serverStatus.service.startTime * 1000) / 1000,
                        ),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      堆内存 / 总占用
                    </span>
                    <span className="text-foreground text-sm">
                      {bytesToMB(serverStatus.service.heapMemoryBytes)} /{' '}
                      {bytesToMB(serverStatus.service.totalMemoryBytes)}
                    </span>
                  </div>
                  <div className="bg-secondary h-1 w-full rounded-full">
                    <div
                      className="bg-primary h-1 rounded-full transition-all duration-500"
                      style={{
                        width: `${(serverStatus.service.heapMemoryBytes / serverStatus.service.totalMemoryBytes) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* System info */}
              <div>
                <div className="mb-3 flex items-center gap-1.5">
                  <svg
                    className="text-muted-foreground h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                  <span className="text-foreground text-sm font-medium">
                    系统信息
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      系统时间
                    </span>
                    <span className="text-foreground text-sm">
                      {serverStatus.system.systemTime} (
                      {serverStatus.system.systemTimezone})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      操作系统 / 内核版本 / 处理器型号
                    </span>
                    <span className="text-foreground text-right text-sm">
                      {serverStatus.system.osName} |{' '}
                      {serverStatus.system.kernelVersion} |{' '}
                      {serverStatus.system.cpuModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      核心 (逻辑/物理) / 平均负载 (1/5/15)
                    </span>
                    <span className="text-foreground text-sm">
                      {serverStatus.system.cpuCountLogical}/
                      {serverStatus.system.cpuCountPhysical} |{' '}
                      {serverStatus.system.loadAverage['1m']}{' '}
                      {serverStatus.system.loadAverage['5m']}{' '}
                      {serverStatus.system.loadAverage['15m']}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      内存使用率 / 已用内存 / 总内存
                    </span>
                    <span className="text-foreground text-sm">
                      {serverStatus.system.memoryUsagePercent}% |{' '}
                      {bytesToMB(serverStatus.system.memoryUsedBytes)} /{' '}
                      {bytesToGB(serverStatus.system.memoryTotalBytes)}
                    </span>
                  </div>
                  <div className="bg-secondary h-1 w-full rounded-full">
                    <div
                      className="bg-primary h-1 rounded-full transition-all duration-500"
                      style={{
                        width: `${serverStatus.system.memoryUsagePercent}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Loading skeleton */
            <div className="space-y-4">
              <div className="bg-secondary h-4 w-3/4 animate-pulse rounded" />
              <div className="bg-secondary h-4 w-1/2 animate-pulse rounded" />
              <div className="bg-secondary h-4 w-2/3 animate-pulse rounded" />
            </div>
          )}
        </div>

        {/* Footer meta */}
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <StatusDot className="bg-success" />
            {visitorCount} 人在线
          </span>
          {serverStatus && (
            <span>
              CPU {serverStatus.system.cpuPercent}% · 内存{' '}
              {serverStatus.system.memoryUsagePercent}%
            </span>
          )}
          {serverStatus && (
            <span>
              运行{' '}
              {formatUptime(
                Math.floor(
                  (now - serverStatus.service.startTime * 1000) / 1000,
                ),
              )}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
