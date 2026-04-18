import { useCallback } from 'react';

import { useFishingIndex } from '../hooks/useFishingIndex';
import type { FishingIndexData } from '../types';
import { SkeletonCard } from './SkeletonCard';

interface FishingIndexCardProps {
  location?: [number, number];
  onFeedbackClick?: (data: FishingIndexData) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  爆护: 'text-red-500',
  好: 'text-orange-500',
  一般: 'text-green-500',
  差: 'text-blue-500',
  空军: 'text-gray-500',
};

const LEVEL_BG: Record<string, string> = {
  爆护: 'bg-red-50 dark:bg-red-950/30',
  好: 'bg-orange-50 dark:bg-orange-950/30',
  一般: 'bg-green-50 dark:bg-green-950/30',
  差: 'bg-blue-50 dark:bg-blue-950/30',
  空军: 'bg-gray-50 dark:bg-gray-800/30',
};

export function FishingIndexCard({
  location = [113.389549, 23.050067],
  onFeedbackClick,
}: FishingIndexCardProps) {
  const { indexData, loading, error, refetch } = useFishingIndex(location);

  const handleFeedback = useCallback(() => {
    if (indexData && onFeedbackClick) {
      onFeedbackClick(indexData);
    }
  }, [indexData, onFeedbackClick]);

  const levelColor = indexData
    ? (LEVEL_COLORS[indexData.level] ?? 'text-gray-500')
    : '';
  const levelBg = indexData
    ? (LEVEL_BG[indexData.level] ?? 'bg-gray-50')
    : 'bg-gray-50';

  return (
    <article
      className={`relative rounded-2xl border border-white/40 p-4 shadow-sm backdrop-blur-sm ${levelBg} dark:border-gray-700/60`}
    >
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 overflow-hidden rounded-full p-8 blur-2xl">
        <div className="h-24 w-24 rounded-full bg-linear-to-br from-blue-200/60 to-green-200/60" />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            钓鱼指数
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            基于实时天气、潮汐综合计算
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          className="rounded-lg bg-white/60 px-2 py-1 text-xs text-gray-600 hover:bg-white/80 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800/80"
          disabled={loading}
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {loading && !indexData ? (
        <div className="min-h-[200px]">
          <SkeletonCard />
        </div>
      ) : error && !indexData ? (
        <div className="min-h-[200px]">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : indexData ? (
        <div className="min-h-[200px]">
          <div className="mb-3 flex items-end gap-3">
            <span className={`text-5xl font-bold ${levelColor}`}>
              {indexData.fishing_index}
            </span>
            <span className={`mb-1 text-lg font-medium ${levelColor}`}>
              {indexData.level}
            </span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white/60 px-2 py-2 dark:bg-gray-800/60">
              默认权重
              <div className="mt-1 font-medium text-gray-900 dark:text-white">
                {indexData.expert_score}
              </div>
            </div>
            <div className="rounded-lg bg-white/60 px-2 py-2 dark:bg-gray-800/60">
              权重调整
              <div className="mt-1 font-medium text-gray-900 dark:text-white">
                {indexData.residual > 0 ? '+' : ''}
                {indexData.residual}
              </div>
            </div>
            <div className="rounded-lg bg-white/60 px-2 py-2 dark:bg-gray-800/60">
              综合指数
              <div className="mt-1 font-medium text-gray-900 dark:text-white">
                {indexData.fishing_index}
              </div>
            </div>
          </div>

          {Object.keys(indexData.feature_breakdown).length > 0 && (
            <details className="mt-2 cursor-pointer text-xs">
              <summary className="text-gray-500 dark:text-gray-400">
                特征详情
              </summary>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {Object.entries(indexData.feature_breakdown).map(
                  ([key, value]: [string, number]) => (
                    <div
                      key={key}
                      className="rounded bg-white/40 px-1 py-1 dark:bg-gray-800/40"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {key.replace('w', 'w').replace('_', ' ')}:
                      </span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {value}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </details>
          )}

          <button
            onClick={handleFeedback}
            className="mt-3 w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            提交钓鱼反馈
          </button>
        </div>
      ) : (
        <div className="min-h-[200px]">
          <p className="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
    </article>
  );
}
