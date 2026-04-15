import { lazy, Suspense, useMemo } from 'react';

import type { OverviewTopPage } from '../types';

const ReactECharts = lazy(() => import('echarts-for-react'));

interface PopularPagesChartProps {
  pages: OverviewTopPage[];
}

export function PopularPagesChart({ pages }: PopularPagesChartProps) {
  const option = useMemo(() => {
    const sorted = [...pages]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .reverse();

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
      },
      yAxis: {
        type: 'category',
        data: sorted.map((item) => item.pagePath || '/'),
        axisLabel: {
          width: 110,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((item) => item.count),
          barWidth: '55%',
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: 'rgba(249,115,22,0.75)' },
                { offset: 1, color: 'rgba(251,191,36,0.75)' },
              ],
            },
          },
        },
      ],
    };
  }, [pages]);

  return (
    <article className="rounded-3xl border border-gray-200/60 bg-white/85 p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
        Popular Pages
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Top viewed paths
      </p>

      <Suspense
        fallback={
          <div className="mt-4 h-55 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
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
