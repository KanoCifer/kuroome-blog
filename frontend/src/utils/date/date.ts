// 通用日期格式化工具 —— 无 Vue / Pinia 依赖。

/** 今天日期 YYYY-MM-DD。 */
export function formatToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface WeekRangeOptions {
  /** 0 = Sunday, 1 = Monday (project default). */
  weekStartsOn?: 0 | 1;
}

/** 本周起止日期范围 "YYYY-MM-DD ~ YYYY-MM-DD"。 */
export function formatCurrentWeekRange(
  opts: WeekRangeOptions = {},
): string {
  const { weekStartsOn = 1 } = opts;
  const now = new Date();
  const start = new Date(now);
  const offset = (now.getDay() - weekStartsOn + 7) % 7;
  start.setDate(now.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}