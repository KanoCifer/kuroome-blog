import request from "@/api/request";

export const mapService = {
  async getSecurityKey() {
    return request.get("/amap/security-key");
  },
};
