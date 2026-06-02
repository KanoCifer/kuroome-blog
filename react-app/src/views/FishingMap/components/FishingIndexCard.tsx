import { useCallback } from 'react';

import { Loader } from 'lucide-react';
import { useFishingIndex } from '../hooks/useFishingIndex';
import type { FishingIndexData } from '../types';
import { SkeletonCard } from './SkeletonCard';

interface FishingIndexCardProps {
  location?: [number, number];
  onFeedbackClick?: (data: FishingIndexData) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  爆护: 'text-success',
  好: 'text-primary',
  一般: 'text-warning',
  差: 'text-destructive',
  空军: 'text-muted-foreground',
};

const LEVEL_BG: Record<string, string> = {
  爆护: 'bg-success/10',
  好: 'bg-primary/10',
  一般: 'bg-warning/10',
  差: 'bg-destructive/10',
  空军: 'bg-muted/30',
};

const getGaugeColor = (percentage: number): string => {
  if (percentage >= 85) return '#22c55e';
  if (percentage >= 70) return '#06b6d4';
  if (percentage >= 50) return '#f97316';
  if (percentage <= 30) return '#ef4444';
  return '#3b82f6'; // blue-500
};

/** Converts raw feature key to readable Chinese label */
const formatFeatureName = (name: string): string => {
  const mapping: Record<string, string> = {
    w1_temp: '气温',
    w2_humidity: '湿度',
    w3_pressure: '气压',
    w4_wind: '风速',
    w5_rain: '降水',
    w6_tide_rising: '涨潮',
    w7_hours_to_tide: '距潮',
    w8_tide_range: '潮差',
    w9_indices: '指数',
  };
  return mapping[name] || name;
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
    ? (LEVEL_COLORS[indexData.level] ?? 'text-muted-foreground')
    : '';
  const levelBg = indexData
    ? (LEVEL_BG[indexData.level] ?? 'bg-muted/30')
    : 'bg-muted/30';

  return (
    <article
      className={`border-border/40 relative rounded-2xl border p-4 shadow-sm backdrop-blur-sm ${levelBg}`}
    >
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute top-0 right-0 overflow-hidden rounded-full p-8 blur-3xl">
        <div className="h-24 w-24 rounded-full bg-linear-to-br from-blue-200/60 to-green-200/60" />
      </div>

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
            <span className={`text-5xl font-bold ${levelColor}`}>
              {indexData.fishing_index}
            </span>
            <span className={`mb-1 text-lg font-medium ${levelColor}`}>
              {indexData.level}
            </span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-card/60 rounded-lg px-2 py-2">
              默认权重
              <div className="text-foreground mt-1 font-medium">
                {indexData.expert_score}
              </div>
            </div>
            <div className="bg-card/60 rounded-lg px-2 py-2">
              权重调整
              <div className="text-foreground mt-1 font-medium">
                {indexData.residual > 0 ? '+' : ''}
                {indexData.residual}
              </div>
            </div>
            <div className="bg-card/60 rounded-lg px-2 py-2">
              综合指数
              <div className="text-foreground mt-1 font-medium">
                {indexData.fishing_index}
              </div>
            </div>
          </div>

          {Object.keys(indexData.feature_breakdown).length > 0 && (
            <details className="mt-2">
              <summary className="text-muted-foreground hover:text-card-foreground mb-2 cursor-pointer text-xs font-medium transition-colors">
                特征详情
              </summary>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(indexData.feature_breakdown).map(
                  ([key, value]: [string, number], idx) => {
                    // Normalize value to 0-100 for gauge display
                    const maxVal = Math.max(
                      ...Object.values(indexData.feature_breakdown),
                    );
                    const percentage = maxVal > 0 ? (value / maxVal) * 100 : 50;

                    // Determine gauge color based on value
                    const gaugeColor = getGaugeColor(percentage);

                    // Format label: w_temp -> 温度, w_pressure -> 气压
                    const label = formatFeatureName(key);

                    return (
                      <div
                        key={key}
                        className="group border-border/30 bg-card/50 hover:border-primary/50 hover:bg-card/70 relative overflow-hidden rounded-xl border p-3 shadow-md backdrop-blur-sm transition-all"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        {/* Background shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {/* Label */}
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-muted-foreground text-xs font-medium">
                            {label}
                          </span>
                        </div>

                        {/* Gauge bar */}
                        <div className="bg-secondary/60 relative h-1.5 w-full overflow-hidden rounded-full">
                          {/* Water fill effect */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${gaugeColor}cc, ${gaugeColor})`,
                              boxShadow: `0 0 8px ${gaugeColor}66`,
                            }}
                          />
                          {/* Bubble accent */}
                          <div
                            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full opacity-80"
                            style={{
                              left: `${Math.max(4, percentage - 6)}%`,
                              backgroundColor: gaugeColor,
                              boxShadow: `0 0 6px ${gaugeColor}`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </details>
          )}

          <button
            onClick={handleFeedback}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium"
          >
            提交钓鱼反馈
          </button>
        </div>
      ) : (
        <div className="min-h-[200px]">
          <p className="text-muted-foreground text-sm">暂无数据</p>
        </div>
      )}
    </article>
  );
}
