import { analyticsGateway } from "@/api/analyticsGateway";

export interface AnalyticsService {
  getOverview(days: number): Promise<Record<string, unknown>>;
  getUserLogins(params: { days: number; page: number; page_size: number }): Promise<Record<string, unknown>>;
  reportVisitorData(data: Record<string, unknown>): Promise<void>;
}

export const analyticsService: AnalyticsService = {
  async getOverview(days) {
    return analyticsGateway.getOverview(days);
  },

  async getUserLogins(params) {
    return analyticsGateway.getUserLogins(params);
  },

  async reportVisitorData(data) {
    await analyticsGateway.reportVisitorData(data);
  },
};
