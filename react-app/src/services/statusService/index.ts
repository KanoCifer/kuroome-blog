import type { ApiResponse } from '@/api/request';
import { extractData } from '@/api/request';
import { statusGateway } from '@/api/statusGateway';

export interface StatusDetailData {
  apiOk: boolean;
  dbOk: boolean;
  cpuPercent: number;
  memUsage: number;
  startuptime: number;
}

export interface StatusService {
  getStatusDetail(): Promise<StatusDetailData>;
}

export const statusService = (): StatusService => {
  const gateway = statusGateway();

  return {
    async getStatusDetail() {
      const response = await gateway.getStatusDetail();
      const raw = extractData(
        response as unknown as { data: ApiResponse<unknown> },
      ) as {
        api_ok: boolean;
        db_ok: boolean;
        cpu_percent: number;
        mem_usage: number;
        startuptime: number;
      };

      return {
        apiOk: raw.api_ok,
        dbOk: raw.db_ok,
        cpuPercent: raw.cpu_percent,
        memUsage: raw.mem_usage,
        startuptime: raw.startuptime,
      };
    },
  };
};
