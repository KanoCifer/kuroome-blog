/**
 * 微信读书组件内部的纯函数工具。
 *
 * - deterministicCoverGradient: 无封面兜底的稳定渐变色(依赖 bookId 域)
 * - formatProgressPercent:      0-100 进度 → "45%"
 *
 * 通用时长/相对时间格式化已上移到 `utils/format/duration.ts` 与
 * `utils/format/relative.ts`,本文件不再重复。
 */

export function formatProgressPercent(
  percent: number | null | undefined,
): string {
  if (percent == null) return '0%';
  return `${Math.round(percent)}%`;
}

/**
 * 给没有真实封面的书生成稳定的渐变背景色
 * - 基于 bookId 字符串 hash 取色相,保证同一本书每次显示同一个色
 * - 调色板刻意偏"纸感 / 旧书"——避免 AI slop 的紫色渐变
 */
const PAPER_PALETTE: ReadonlyArray<readonly [string, string]> = [
  ['#C97B5A', '#7A3D26'], // 焦糖 → 暗红棕
  ['#7D8FA1', '#3F5263'], // 雾蓝 → 墨青
  ['#A89A7B', '#5C4F36'], // 沙驼 → 橄榄棕
  ['#B47A8A', '#6B3F4D'], // 干玫瑰 → 酒红
  ['#5A7A6B', '#2D4035'], // 烟绿 → 墨绿
  ['#8B7355', '#4A3A26'], // 旧书 → 深咖
  ['#9A8AA0', '#5C4F66'], // 烟紫 → 灰紫
  ['#A86A4F', '#5A2D1A'], // 砖红 → 焦糖
];

export function deterministicCoverGradient(bookId: string): string {
  const hash = [...bookId].reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0,
    7,
  );
  const [a, b] = PAPER_PALETTE[hash % PAPER_PALETTE.length]!;
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}
