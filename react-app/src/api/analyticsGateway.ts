import type { AxiosResponse } from 'axios';

import request from '@/api/request';

interface DailyTrendApiItem {
  date: string;
  count?: number;
  visits?: number;
  visitors?: number;
}

interface TopPageApiItem {
  page_path: string;
  count?: number;
  visit_count?: number;
}

interface BrowserApiItem {
  browser?: string;
  browser_name?: string;
  browser_version?: string;
  count: number;
}

interface OsApiItem {
  os?: string;
  os_name?: string;
  count: number;
}

export interface OverviewApiData {
  total_visits: number;
  unique_visitors: number;
  unique_visitor_ids: number;
  top_pages: TopPageApiItem[];
  browser_stats: BrowserApiItem[];
  os_stats: OsApiItem[];
  daily_trend: DailyTrendApiItem[];
  period_days: number;
}

export interface UserLoginApiItem {
  user_id: number;
  username: string;
  name: string | null;
  login_count: number;
  last_login_at: string | null;
  current_login_at: string | null;
  last_login_ip: string | null;
  current_login_ip: string | null;
  active: boolean;
}

export interface UserLoginApiData {
  list: UserLoginApiItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ServerStatusApiData {
  cpu_percent: number;
  cpu_cores: number;
  mem_total: number;
  mem_used: number;
  mem_usage: number;
  disk_total: number;
  disk_used: number;
  disk_usage: number;
}

export interface AnalyticsGateway {
  getOverview(days: number): Promise<AxiosResponse<OverviewApiData>>;
  getUserLogins(params: {
    days: number;
    page: number;
    page_size: number;
  }): Promise<AxiosResponse<UserLoginApiData>>;
  getServerStatus(): Promise<AxiosResponse<ServerStatusApiData>>;
}

export const analyticsGateway = (): AnalyticsGateway => {
  return {
    async getOverview(days) {
      return request.get('v1/status/overview', {
        params: { days },
      }) as Promise<AxiosResponse<OverviewApiData>>;
    },

    async getUserLogins(params) {
      return request.get('v1/status/user-logins', {
        params,
      }) as Promise<AxiosResponse<UserLoginApiData>>;
    },

    async getServerStatus() {
      return request.get('v1/status/server/status') as Promise<
        AxiosResponse<ServerStatusApiData>
      >;
    },
  };
};
