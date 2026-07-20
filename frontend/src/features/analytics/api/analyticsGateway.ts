import request from '@/shared/api/request';
import type { ApiResponse } from '@/shared/api/request';

export interface AnalyticsOverviewData {
  status?: string;
  code?: number;
  data: Record<string, unknown>;
  message?: string;
}

export interface PostViewData {
  title: string;
  views: number;
}

export interface AnalyticsGateway {
  getOverview(days: number): Promise<AnalyticsOverviewData>;
  getUserLogins(params: {
    days: number;
    page: number;
    page_size: number;
  }): Promise<AnalyticsOverviewData>;
  getPostViews(): Promise<ApiResponse<PostViewData[]>>;
  reportVisitorData(data: Record<string, unknown>): Promise<void>;
}

export const analyticsGateway: AnalyticsGateway = {
  async getOverview(days: number): Promise<AnalyticsOverviewData> {
    const res = await request.get<ApiResponse<Record<string, unknown>>>(
      'v3/status/overview',
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
      'v3/status/user-logins',
      {
        params,
      },
    );
    return res.data;
  },

  async getPostViews(): Promise<ApiResponse<PostViewData[]>> {
    const res = await request.get<ApiResponse<PostViewData[]>>('v3/post/views');
    return res.data;
  },

  async reportVisitorData(data: Record<string, unknown>): Promise<void> {
    await request.post('/v3/track', data, {
      timeout: 5000,
      withCredentials: true,
    });
  },
};
