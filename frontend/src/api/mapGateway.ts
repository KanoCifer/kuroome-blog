import request from '@/api/request';

export interface MapGateway {
  getSecurityKey(): Promise<{ securityJsCode: string }>;
}

export const mapGateway: MapGateway = {
  async getSecurityKey(): Promise<{ securityJsCode: string }> {
    const res = await request.get<{ data: { securityJsCode: string } }>(
      'v1/amap/security-key',
    );
    return res.data.data;
  },
};
