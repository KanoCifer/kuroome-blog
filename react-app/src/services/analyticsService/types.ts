export interface OverviewTopPage {
  pagePath: string;
  count: number;
}

export interface OverviewBrowserStat {
  browserName: string;
  browserVersion: string;
  count: number;
}

export interface OverviewOsStat {
  osName: string;
  count: number;
}

export interface OverviewDailyTrendItem {
  date: string;
  count: number;
  visitors?: number;
}

export interface OverviewData {
  totalVisits: number;
  uniqueVisitors: number;
  uniqueVisitorIds: number;
  topPages: OverviewTopPage[];
  browserStats: OverviewBrowserStat[];
  osStats: OverviewOsStat[];
  dailyTrend: OverviewDailyTrendItem[];
  periodDays: number;
}

export interface UserLoginLogItem {
  userId: number;
  username: string;
  name: string | null;
  loginCount: number;
  lastLoginAt: string | null;
  currentLoginAt: string | null;
  lastLoginIp: string | null;
  currentLoginIp: string | null;
  active: boolean;
}

export interface UserLoginLogData {
  list: UserLoginLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ServerStatusData {
  cpuPercent: number;
  cpuCores: number;
  memoryTotalMb: number;
  memoryUsedMb: number;
  memoryUsagePercent: number;
  diskTotalGb: number;
  diskUsedGb: number;
  diskUsagePercent: number;
}
