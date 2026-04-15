import { lazy, Suspense } from 'react';

const ReactECharts = lazy(() => import('echarts-for-react'));

interface TideChartProps {
  option: Record<string, unknown>;
}

export function TideChart({ option }: TideChartProps) {
  return (
    <Suspense
      fallback={
        <div className="h-55 animate-pulse bg-gray-100 dark:bg-gray-800" />
      }
    >
      <ReactECharts
        option={option}
        style={{ width: '100%', height: 220 }}
        notMerge
        lazyUpdate
      />
    </Suspense>
  );
}
