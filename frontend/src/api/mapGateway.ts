import request from "@/api/request";

export interface MapGateway {
  getSecurityKey(): Promise<{ key: string }>;
}

export const mapGateway: MapGateway = {
  async getSecurityKey(): Promise<{ key: string }> {
    const res = await request.get<{ data: { key: string } }>("v1/amap/security-key");
    return res.data.data;
  },
};
