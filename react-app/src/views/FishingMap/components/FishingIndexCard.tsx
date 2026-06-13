import { useCallback } from 'react';

import { Loader } from 'lucide-react';
import { useFishingIndex } from '../hooks/useFishingIndex';
import type { FishingIndexData } from '../types';
import { SkeletonCard } from './SkeletonCard';

interface FishingIndexCardProps {
  location?: [number, number];
  onFeedbackClick?: (data: FishingIndexData) => void;
  onDetailClick?: (data: FishingIndexData) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  爆护: 'text-success',
  好: 'text-primary',
  一般: 'text-warning',
  差: 'text-destructive',
  空军: 'text-muted-foreground',
};

export function FishingIndexCard({
  location = [113.389549, 23.050067],
  onFeedbackClick,
  onDetailClick,
}: FishingIndexCardProps) {
  const { indexData, loading, error, refetch } = useFishingIndex(location);

  const handleFeedback = useCallback(() => {
    if (indexData && onFeedbackClick) {
      onFeedbackClick(indexData);
    }
  }, [indexData, onFeedbackClick]);

  const handleDetail = useCallback(() => {
    if (indexData && onDetailClick) {
      onDetailClick(indexData);
    }
  }, [indexData, onDetailClick]);

  const levelColor = indexData
    ? (LEVEL_COLORS[indexData.level] ?? 'text-muted-foreground')
    : '';

  return (
    <article className="border-border/40 bg-card relative rounded-2xl border p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-foreground text-sm font-semibold">钓鱼指数</h3>
          <p className="text-muted-foreground text-xs">
            基于实时天气、潮汐综合计算
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          className="bg-card/60 text-muted-foreground hover:bg-card/80 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm disabled:cursor-not-allowed"
          disabled={loading}
        >
          <Loader
            className={`h-3 w-3 ${loading ? 'animate-spin' : 'hidden'}`}
          />
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {loading && !indexData ? (
        <div className="min-h-[200px]">
          <SkeletonCard />
        </div>
      ) : error && !indexData ? (
        <div className="min-h-[200px]">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : indexData ? (
        <div className="min-h-[200px]">
          <div className="mb-3 flex items-end gap-3">
            <span className={`text-5xl font-bold tabular-nums ${levelColor}`}>
              {indexData.fishing_index}
            </span>
            <span className={`mb-1 text-lg font-medium ${levelColor}`}>
              {indexData.level}
            </span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-card/60 rounded-lg px-2 py-2">
              默认权重
              <div className="text-foreground mt-1 font-medium tabular-nums">
                {indexData.expert_score}
              </div>
            </div>
            <div className="bg-card/60 rounded-lg px-2 py-2">
              权重调整
              <div className="text-foreground mt-1 font-medium tabular-nums">
                {indexData.residual > 0 ? '+' : ''}
                {indexData.residual}
              </div>
            </div>
            <div className="bg-card/60 rounded-lg px-2 py-2">
              综合指数
              <div className="text-foreground mt-1 font-medium tabular-nums">
                {indexData.fishing_index}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFeedback}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 flex-1 rounded-full px-3 text-sm font-medium transition-colors"
            >
              反馈今日指数
            </button>
            {onDetailClick && Object.keys(indexData.feature_breakdown).length > 0 && (
              <button
                onClick={handleDetail}
                className="min-h-11 rounded-full bg-primary/10 px-5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                详情
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-[200px]">
          <p className="text-muted-foreground text-sm">暂无数据</p>
        </div>
      )}
    </article>
  );
}
