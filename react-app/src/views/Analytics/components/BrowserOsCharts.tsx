import { lazy, Suspense, useMemo } from 'react';

import type { OverviewBrowserStat, OverviewOsStat } from '../types';

const ReactECharts = lazy(() => import('echarts-for-react'));

interface BrowserOsChartsProps {
  browserStats: OverviewBrowserStat[];
  osStats: OverviewOsStat[];
}

function buildPieOption(
  title: string,
  seriesData: Array<{ name: string; value: number }>,
) {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['67%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        data: seriesData,
      },
    ],
  };
}

export function BrowserOsCharts({
  browserStats,
  osStats,
}: BrowserOsChartsProps) {
  const browserOption = useMemo(() => {
    const top = [...browserStats]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return buildPieOption(
      'Browser',
      top.map((item) => ({
        name: `${item.browserName} ${item.browserVersion}`.trim(),
        value: item.count,
      })),
    );
  }, [browserStats]);

  const osOption = useMemo(() => {
    return buildPieOption(
      'OS',
      osStats.map((item) => ({
        name: item.osName,
        value: item.count,
      })),
    );
  }, [osStats]);

  return (
    <div className="grid grid-cols-1 gap-3">
      <article className="border-border/60 bg-background/85 rounded-3xl border p-3.5 shadow-sm">
        <h3 className="text-foreground text-base font-semibold">
          Browser Distribution
        </h3>

        <Suspense
          fallback={
            <div className="bg-muted mt-4 h-[260px] animate-pulse rounded-xl" />
          }
        >
          <ReactECharts
            option={browserOption}
            style={{ width: '100%', height: 220 }}
            notMerge
            lazyUpdate
          />
        </Suspense>
      </article>

      <article className="border-border/60 bg-background/85 rounded-3xl border p-3.5 shadow-sm">
        <h3 className="text-foreground text-base font-semibold">
          OS Distribution
        </h3>

        <Suspense
          fallback={
            <div className="bg-muted mt-4 h-[260px] animate-pulse rounded-xl" />
          }
        >
          <ReactECharts
            option={osOption}
            style={{ width: '100%', height: 220 }}
            notMerge
            lazyUpdate
          />
        </Suspense>
      </article>
    </div>
  );
}
