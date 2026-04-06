import { analyticsGateway } from '@/api/analyticsGateway';
import { extractData } from '@/api/request';
import type { ApiResponse } from '@/api/request';
import type {
  OverviewData,
  ServerStatusData,
  UserLoginLogData,
  UserLoginLogItem,
} from './types';

import type {
  OverviewApiData,
  ServerStatusApiData,
  UserLoginApiData,
} from '@/api/analyticsGateway';

export interface AnalyticsService {
  getOverview(days: number): Promise<OverviewData>;
  getUserLogins(params: {
    days: number;
    page: number;
    pageSize: number;
  }): Promise<UserLoginLogData>;
  getServerStatus(): Promise<ServerStatusData>;
}

const normalizeDailyTrendCount = (item: {
  count?: number;
  visits?: number;
}): number => {
  if (typeof item.visits === 'number') {
    return item.visits;
  }
  return item.count ?? 0;
};

const toLoginLogItem = (raw: {
  user_id: number;
  username: string;
  name: string | null;
  login_count: number;
  last_login_at: string | null;
  current_login_at: string | null;
  last_login_ip: string | null;
  current_login_ip: string | null;
  active: boolean;
}): UserLoginLogItem => {
  return {
    userId: raw.user_id,
    username: raw.username,
    name: raw.name,
    loginCount: raw.login_count,
    lastLoginAt: raw.last_login_at,
    currentLoginAt: raw.current_login_at,
    lastLoginIp: raw.last_login_ip,
    currentLoginIp: raw.current_login_ip,
    active: raw.active,
  };
};

export const analyticsService = (): AnalyticsService => {
  const gateway = analyticsGateway();

  return {
    async getOverview(days) {
      const response = await gateway.getOverview(days);
      const raw = extractData(
        response as unknown as { data: ApiResponse<unknown> },
      ) as OverviewApiData;

      return {
        totalVisits: raw.total_visits,
        uniqueVisitors: raw.unique_visitors,
        uniqueVisitorIds: raw.unique_visitor_ids,
        topPages: raw.top_pages.map((item) => ({
          pagePath: item.page_path,
          count: item.visit_count ?? item.count ?? 0,
        })),
        browserStats: raw.browser_stats.map((item) => ({
          browserName: item.browser_name ?? item.browser ?? 'Unknown',
          browserVersion: item.browser_version ?? '',
          count: item.count,
        })),
        osStats: raw.os_stats.map((item) => ({
          osName: item.os_name ?? item.os ?? 'Unknown',
          count: item.count,
        })),
        dailyTrend: raw.daily_trend.map((item) => ({
          date: item.date,
          count: normalizeDailyTrendCount(item),
          visitors: item.visitors,
        })),
        periodDays: raw.period_days,
      };
    },

    async getUserLogins({ days, page, pageSize }) {
      const response = await gateway.getUserLogins({
        days,
        page,
        page_size: pageSize,
      });
      const raw = extractData(
        response as unknown as { data: ApiResponse<unknown> },
      ) as UserLoginApiData;

      return {
        list: raw.list.map(toLoginLogItem),
        total: raw.total,
        page: raw.page,
        pageSize: raw.page_size,
        totalPages: raw.total_pages,
      };
    },

    async getServerStatus() {
      const response = await gateway.getServerStatus();
      const raw = extractData(
        response as unknown as { data: ApiResponse<unknown> },
      ) as ServerStatusApiData;

      return {
        cpuPercent: raw.cpu_percent,
        cpuCores: raw.cpu_cores,
        memoryTotalMb: raw.mem_total,
        memoryUsedMb: raw.mem_used,
        memoryUsagePercent: raw.mem_usage,
        diskTotalGb: raw.disk_total,
        diskUsedGb: raw.disk_used,
        diskUsagePercent: raw.disk_usage,
      };
    },
  };
};
