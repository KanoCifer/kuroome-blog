/**
 * unix 秒数 / 时间字符串 → 中文相对时间。
 *
 * 输入接受 `number | string | null | undefined`:
 * - 数字:按 unix 秒解释
 * - 字符串:先尝试 `Number()` 解析为 unix 秒,失败再尝试 `Date.parse`(ISO 8601)
 * - 空值:返回 `—`
 *
 * 输出阶梯:
 *   `< 60s`     → 刚刚
 *   `< 1h`      → X 分钟前
 *   `< 24h`     → X 小时前
 *   `< 48h`     → 昨天
 *   `< 30d`     → X 天前
 *   `< 1y`      → X 个月前
 *   `>= 1y`     → X 年前
 *
 * 替代 `components/weread/utils/format.ts` 里的同名函数(已补"昨天"分支)
 * 与 `BookShelfStatsBar` 里手抄的 `recencyLabel`。
 */
function toUnixSeconds(t: number | string | null | undefined): number | null {
  if (t == null || t === '') return null;
  const n = typeof t === 'number' ? t : Number(t);
  if (!Number.isNaN(n) && n > 0) return n;
  const ms = Date.parse(String(t));
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

export function formatRelative(
  time: number | string | null | undefined,
): string {
  const unixSeconds = toUnixSeconds(time);
  if (unixSeconds == null) return '—';
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 2) return '昨天';
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} 个月前`;
  return `${Math.floor(diff / 31536000)} 年前`;
}
