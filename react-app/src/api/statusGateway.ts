import type { AxiosResponse } from 'axios';

import request from '@/api/request';

export interface StatusDetailApiData {
  api_ok: boolean;
  db_ok: boolean;
  cpu_percent: number;
  mem_usage: number;
  startuptime: number;
}

export interface StatusGateway {
  getStatusDetail(): Promise<AxiosResponse<StatusDetailApiData>>;
}

export const statusGateway = (): StatusGateway => {
  return {
    async getStatusDetail() {
      return request.get('v1/status-detail') as Promise<
        AxiosResponse<StatusDetailApiData>
      >;
    },
  };
};
