import type { ApiResponse } from '@/api/request';
import { extractData } from '@/api/request';
import {
  statusGateway,
  type StatusDetailApiData,
} from '@/api/statusGateway';

export interface ServiceInfo {
  runtime: string;
  pythonVersion: string;
  coroutines: number;
  gcCount: number[];
  startTime: number;
  heapMemoryBytes: number;
  totalMemoryBytes: number;
  dbOk: boolean;
  apiOk: boolean;
}

export interface SystemInfo {
  systemTime: string;
  systemTimezone: string;
  osName: string;
  osVersion: string;
  kernelVersion: string;
  cpuModel: string;
  cpuCountPhysical: number;
  cpuCountLogical: number;
  loadAverage: {
    '1m': number;
    '5m': number;
    '15m': number;
  };
  cpuPercent: number;
  memoryUsagePercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
}

export interface StatusDetailData {
  version: {
    repoUrl: string;
    currentVersion: string;
  };
  service: ServiceInfo;
  system: SystemInfo;
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
      ) as StatusDetailApiData;

      return {
        version: {
          repoUrl: raw.version.repo_url,
          currentVersion: raw.version.current_version,
        },
        service: {
          runtime: raw.service.runtime,
          pythonVersion: raw.service.python_version,
          coroutines: raw.service.coroutines,
          gcCount: raw.service.gc_count,
          startTime: raw.service.start_time,
          heapMemoryBytes: raw.service.heap_memory_bytes,
          totalMemoryBytes: raw.service.total_memory_bytes,
          dbOk: raw.service.db_ok,
          apiOk: raw.service.api_ok,
        },
        system: {
          systemTime: raw.system.system_time,
          systemTimezone: raw.system.system_timezone,
          osName: raw.system.os_name,
          osVersion: raw.system.os_version,
          kernelVersion: raw.system.kernel_version,
          cpuModel: raw.system.cpu_model,
          cpuCountPhysical: raw.system.cpu_count_physical,
          cpuCountLogical: raw.system.cpu_count_logical,
          loadAverage: raw.system.load_average,
          cpuPercent: raw.system.cpu_percent,
          memoryUsagePercent: raw.system.memory_usage_percent,
          memoryUsedBytes: raw.system.memory_used_bytes,
          memoryTotalBytes: raw.system.memory_total_bytes,
        },
      };
    },
  };
};
