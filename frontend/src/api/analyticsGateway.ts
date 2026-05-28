import request from '@/api/request';
import type { ApiResponse } from '@/api/request';

export interface AnalyticsOverviewData {
  code?: number;
  data: Record<string, unknown>;
  message?: string;
}

export interface AnalyticsGateway {
  getOverview(days: number): Promise<AnalyticsOverviewData>;
  getUserLogins(params: {
    days: number;
    page: number;
    page_size: number;
  }): Promise<AnalyticsOverviewData>;
  reportVisitorData(data: Record<string, unknown>): Promise<void>;
}

export const analyticsGateway: AnalyticsGateway = {
  async getOverview(days: number): Promise<AnalyticsOverviewData> {
    const res = await request.get<ApiResponse<Record<string, unknown>>>(
      'v1/status/overview',
      {
        params: { days },
      },
    );
    return res.data;
  },

  async getUserLogins(params: {
    days: number;
    page: number;
    page_size: number;
  }): Promise<AnalyticsOverviewData> {
    const res = await request.get<ApiResponse<Record<string, unknown>>>(
      'v1/status/user-logins',
      {
        params,
      },
    );
    return res.data;
  },

  async reportVisitorData(data: Record<string, unknown>): Promise<void> {
    await request.post('/v1/admin/track', data, {
      timeout: 5000,
      withCredentials: true,
    });
  },
};
