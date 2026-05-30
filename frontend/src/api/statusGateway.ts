import request from "@/api/request";
import type { ApiResponse } from "@/api/request";

export interface StatusDetailData {
  api_ok: boolean;
  db_ok: boolean;
  cpu_percent: number;
  mem_usage: number;
  startuptime: number;
}

export async function fetchStatusDetail(): Promise<StatusDetailData> {
  const res = await request.get<ApiResponse<StatusDetailData>>("v1/status-detail");
  return res.data.data;
}
