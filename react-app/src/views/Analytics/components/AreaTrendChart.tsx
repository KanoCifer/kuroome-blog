import { lazy, Suspense, useMemo } from 'react';

import type { OverviewDailyTrendItem } from '../types';

const ReactECharts = lazy(() => import('echarts-for-react'));

interface AreaTrendChartProps {
  trend: OverviewDailyTrendItem[];
}

export function AreaTrendChart({ trend }: AreaTrendChartProps) {
  const option = useMemo(() => {
    const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date));

    return {
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        left: '4%',
        right: '4%',
        top: '10%',
        bottom: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: sorted.map((item) => item.date.slice(5)),
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: {
          lineStyle: {
            color: '#eef2ff',
          },
        },
      },
      series: [
        {
          name: 'Visits',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#3b82f6',
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.35)' },
                { offset: 1, color: 'rgba(59,130,246,0.05)' },
              ],
            },
          },
          data: sorted.map((item) => item.count),
        },
      ],
    };
  }, [trend]);

  return (
    <article className="squircle border border-gray-200/60 bg-white/85 p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
        Visit Trend
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Daily visits in selected period
      </p>

      <Suspense
        fallback={
          <div className="mt-4 h-[220px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        }
      >
        <ReactECharts
          option={option}
          style={{ width: '100%', height: 220 }}
          notMerge
          lazyUpdate
        />
      </Suspense>
    </article>
  );
}
