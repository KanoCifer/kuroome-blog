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
    <article className="border-border/60 bg-card/85 rounded-3xl border p-3.5 shadow-sm">
      <h3 className="text-foreground text-base font-semibold">Visit Trend</h3>
      <p className="text-muted-foreground mt-1 text-xs">
        Daily visits in selected period
      </p>

      <Suspense
        fallback={
          <div className="bg-muted mt-4 h-55 animate-pulse rounded-xl" />
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
