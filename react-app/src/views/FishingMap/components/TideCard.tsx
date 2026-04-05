import { TideChart } from './TideChart';

import type { TideData, TideTableItem } from '../types';

interface TideCardProps {
  tideLoading: boolean;
  tideData: TideData | null;
  tideSpotName: string;
  tideChartOption: Record<string, unknown>;
  highTide: TideTableItem | null;
  lowTide: TideTableItem | null;
}

export function TideCard({
  tideLoading,
  tideData,
  tideSpotName,
  tideChartOption,
  highTide,
  lowTide,
}: TideCardProps) {
  return (
    <article className="rounded-2xl border border-white/40 bg-linear-to-br from-white/80 to-white/40 p-4 shadow-sm backdrop-blur-sm dark:border-gray-700/60 dark:from-gray-900/80 dark:to-gray-800/60">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            潮汐预报
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tideSpotName}
          </p>
        </div>
        <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200">
          今日
        </span>
      </div>

      {tideLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          获取潮汐数据中...
        </p>
      ) : tideData ? (
        <>
          <TideChart option={tideChartOption} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-800/60">
              <p className="text-gray-500 dark:text-gray-400">最高潮</p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {highTide ? Number(highTide.height).toFixed(2) : '--'}m
              </p>
            </div>
            <div className="rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-800/60">
              <p className="text-gray-500 dark:text-gray-400">最低潮</p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {lowTide ? Number(lowTide.height).toFixed(2) : '--'}m
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">暂无潮汐数据</p>
      )}
    </article>
  );
}
