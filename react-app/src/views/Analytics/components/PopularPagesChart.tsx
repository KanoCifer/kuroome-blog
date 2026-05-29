import { lazy, useMemo } from 'react';

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
        bottom: '10%',
        top: '0%',
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
    <article className="border-border/60 bg-card/85 h-100 rounded-3xl border p-3.5 shadow-sm">
      <h3 className="text-foreground text-base font-semibold">Popular Pages</h3>
      <p className="text-muted-foreground mt-1 text-xs">Top viewed paths</p>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        notMerge
        lazyUpdate
      />
    </article>
  );
}
