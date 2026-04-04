import request from "@/api/request";

export const analyticsService = {
  async getOverview(days: number) {
    return request.get("/status/overview", {
      params: { days },
    });
  },

  async getUserLogins(params: { days: number; page: number; page_size: number }) {
    return request.get("/status/user-logins", {
      params,
    });
  },

  async reportVisitorData(data: Record<string, unknown>) {
    return request.post("/admin/track", data, {
      timeout: 5000,
      withCredentials: true,
    });
  },
};
