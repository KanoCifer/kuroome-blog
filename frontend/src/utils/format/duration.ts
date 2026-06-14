/**
 * 秒数 → 统一的中文时长。
 *
 * - `null` / `undefined` / `<= 0` → `"0 分钟"`
 * - `< 1 小时`                → `"X 分钟"`
 * - `>= 1 小时, m > 0`        → `"X 小时 Y 分钟"`
 * - `>= 1 小时, m === 0`      → `"X 小时"`
 *
 * 替代项目里 4 份手抄副本(useStatsView / BookShelfStatsBar / BentoReadingList /
 * useFishingRoute)与 weread 组件里的 formatReadingTime。
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0 分钟';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
  }
  return `${m} 分钟`;
}
