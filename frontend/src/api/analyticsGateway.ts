import request from "@/api/request";

export interface AnalyticsGateway {
  getOverview(days: number): Promise<Record<string, unknown>>;
  getUserLogins(params: { days: number; page: number; page_size: number }): Promise<Record<string, unknown>>;
  reportVisitorData(data: Record<string, unknown>): Promise<void>;
}

export const analyticsGateway: AnalyticsGateway = {
  async getOverview(days: number): Promise<Record<string, unknown>> {
    const res = await request.get<{ data: Record<string, unknown> }>("v1/status/overview", {
      params: { days },
    });
    return res.data.data;
  },

  async getUserLogins(params: { days: number; page: number; page_size: number }): Promise<Record<string, unknown>> {
    const res = await request.get<{ data: Record<string, unknown> }>("v1/status/user-logins", {
      params,
    });
    return res.data.data;
  },

  async reportVisitorData(data: Record<string, unknown>): Promise<void> {
    await request.post("/v1/admin/track", data, {
      timeout: 5000,
      withCredentials: true,
    });
  },
};
