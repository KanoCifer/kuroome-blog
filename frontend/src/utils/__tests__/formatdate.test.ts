import { describe, it, expect } from 'vitest';
import { formatDate } from '../formatdate';

describe('formatDate', () => {
  it('空值返回 未知时间', () => {
    expect(formatDate(null)).toBe('未知时间');
    expect(formatDate(undefined)).toBe('未知时间');
  });

  it('格式化 ISO 8601 UTC 字符串为本地时间', () => {
    const result = formatDate('2026-07-03T08:00:00Z');
    // 格式为 YYYY-MM-DD HH:mm:ss
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(result).not.toBe('未知时间');
  });

  it('本地时间字符串也能解析', () => {
    const result = formatDate('2026-07-03 16:00:00');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
