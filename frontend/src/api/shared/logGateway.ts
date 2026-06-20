import request from '@/api/shared/request';
import type { ApiResponse } from '@/api/shared/request';

export interface LogItem {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  extra: Record<string, unknown>;
}

export interface LogListData {
  items: LogItem[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface FetchRecentLogsOptions {
  /** 默认 10 */
  perPage?: number;
  /** 默认 INFO；传 WARNING/ERROR 之类 */
  level?: string;
}

/**
 * 取最近 N 条日志（按时间倒序），用于 StatusView「最近事件」卡片。
 * 后端复用 /api/v2/system/log，仅调整 per_page / level。
 */
export async function fetchRecentLogs(
  options: FetchRecentLogsOptions = {},
): Promise<LogItem[]> {
  const { perPage = 10, level = 'INFO' } = options;
  const res = await request.get<ApiResponse<LogListData>>('v2/system/log', {
    params: { page: 1, per_page: perPage, level },
  });
  return res.data.data.items;
}
