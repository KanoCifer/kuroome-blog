import { useEffect, useMemo } from 'react';

import dayjs from 'dayjs';

import { HARBOR_OPTIONS, useFishingMapStore } from '@/stores/fishingMapStore';
import type { TideTableItem } from '../types';
import { SkeletonCard } from './SkeletonCard';
import { TideChart } from './TideChart';

export function TideCard() {
  const {
    panelTideData: tideData,
    panelTideSpotName: tideSpotName,
    tideLoading: loading,
    selectedHarbor,
    selectedDate,
    setSelectedHarbor,
    setSelectedDate,
    fetchPanelTide,
  } = useFishingMapStore();

  const isDarkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    fetchPanelTide();
  }, [selectedHarbor, selectedDate, fetchPanelTide]);

  // 今日 ~ +7天
  const dateOptions = Array(8)
    .fill(null)
    .map((_, i) => {
      const d = dayjs().add(i, 'day');
      return {
        value: d.format('YYYYMMDD'),
        label: d.format('MM-DD'),
        weekday: d.format('dd'),
      };
    });

  const highTide = useMemo<TideTableItem | null>(() => {
    if (!tideData?.tideTable?.length) return null;
    const highs = tideData.tideTable.filter((item) => item.type === 'H');
    if (!highs.length) return null;
    return highs.reduce((prev, curr) =>
      Number(curr.height) > Number(prev.height) ? curr : prev,
    );
  }, [tideData]);

  const lowTide = useMemo<TideTableItem | null>(() => {
    if (!tideData?.tideTable?.length) return null;
    const lows = tideData.tideTable.filter((item) => item.type === 'L');
    if (!lows.length) return null;
    return lows.reduce((prev, curr) =>
      Number(curr.height) < Number(prev.height) ? curr : prev,
    );
  }, [tideData]);

  const tideChartOption = useMemo(() => {
    if (!tideData) return {};

    const textColor = isDarkMode ? '#e5e7eb' : '#333';
    const subTextColor = isDarkMode ? '#9ca3af' : '#666';

    const now = dayjs();
    let currentTimeIndex = -1;
    tideData.tideHourly.forEach((point, index) => {
      const pointTime = dayjs(point.fxTime);
      if (pointTime.isBefore(now) || pointTime.isSame(now)) {
        currentTimeIndex = index;
      }
    });

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDarkMode
          ? 'rgba(30, 41, 59, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDarkMode ? '#475569' : '#e5e7eb',
        borderWidth: 1,
        borderRadius: 8,
        padding: [12, 16],
        textStyle: {
          color: textColor,
          fontSize: 13,
        },
        formatter: (params: unknown[]) => {
          const param = params[0] as { axisValue: string; data: number };
          const timeStr = param.axisValue as string;
          // console.log('tooltip params', params);
          // console.log('timeStr', timeStr, 'value', param.data);
          return `<div style="padding: 2px 0;">
          <div style="font-weight: 600; margin-bottom: 4px;">${timeStr}</div>
          <div>潮高: <span style="color: #06b6d4; font-weight: bold;">${param.data.toFixed(2)} m</span></div>
        </div>`;
        },
      },
      grid: { left: '4%', right: '4%', bottom: '12%', top: '10%' },
      xAxis: {
        type: 'category',
        data: tideData.tideHourly.map((point) =>
          dayjs(point.fxTime).format('HH:mm'),
        ),
        axisLabel: {
          color: subTextColor,
          fontSize: 11,
          formatter: (value: string) => value.slice(11, 16),
          interval: Math.max(1, Math.floor(tideData.tideHourly.length / 5)),
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode ? '#334155' : '#e5e7eb',
          },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: subTextColor,
          fontSize: 11,
          formatter: (value: number) => `${value}m`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: isDarkMode ? '#1e293b' : '#f1f5f9',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          data: tideData.tideHourly.map((point) => Number(point.height)),
          type: 'line',
          smooth: 0.4,
          symbol: 'none',
          lineStyle: { color: '#06b6d4', width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(6, 182, 212, 0.25)' },
                { offset: 0.7, color: 'rgba(6, 182, 212, 0.05)' },
                { offset: 1, color: 'rgba(6, 182, 212, 0)' },
              ],
            },
          },
          markLine:
            currentTimeIndex >= 0
              ? {
                  symbol: ['none', 'none'],
                  lineStyle: {
                    color: '#f59e0b',
                    type: 'dashed',
                    width: 1.5,
                  },
                  label: {
                    show: true,
                    formatter: '现在',
                    color: '#f59e0b',
                    fontWeight: '600',
                    fontSize: 12,
                  },
                  data: [{ xAxis: currentTimeIndex }],
                }
              : undefined,
        },
      ],
      textStyle: { color: textColor },
    };
  }, [isDarkMode, tideData]);

  return (
    <article className="relative rounded-2xl border border-white/40 bg-linear-to-br from-white/80 to-white/40 p-4 shadow-sm backdrop-blur-sm dark:border-gray-700/60 dark:from-gray-900/80 dark:to-gray-800/60">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute bottom-16 left-16 h-32 w-32 overflow-hidden rounded-full bg-linear-to-tr from-teal-300/20 to-emerald-400/10 blur-3xl transition-transform duration-700 group-hover:scale-110"></div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            潮汐预报
          </h3>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {tideSpotName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <select
            value={selectedHarbor}
            onChange={(e) => setSelectedHarbor(e.target.value)}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white/80 px-1.5 py-1 text-xs text-gray-700 focus:ring-1 focus:ring-cyan-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            {HARBOR_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white/80 px-1.5 py-1 text-xs text-gray-700 focus:ring-1 focus:ring-cyan-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.weekday}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[200px]">
          <SkeletonCard hasChart hasBottomRow />
        </div>
      ) : tideData ? (
        <div className="min-h-[200px]">
          <TideChart option={tideChartOption} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-800/60">
              <p className="text-gray-500 dark:text-gray-400">
                最高潮:{dayjs(highTide?.fxTime).format('HH:mm')}
                <span className="text-cyan-500">↗</span>
              </p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {highTide ? Number(highTide.height).toFixed(2) : '--'}m
              </p>
            </div>
            <div className="rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-800/60">
              <p className="text-gray-500 dark:text-gray-400">
                最低潮:{dayjs(lowTide?.fxTime).format('HH:mm')}
                <span className="text-cyan-500">↘</span>
              </p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {lowTide ? Number(lowTide.height).toFixed(2) : '--'}m
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-[200px]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            暂无潮汐数据
          </p>
        </div>
      )}
    </article>
  );
}
