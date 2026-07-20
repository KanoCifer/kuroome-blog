import apiClient from '@/shared/api/apiClient';
import type { ApiResponse } from '@/shared/api/apiClient';

import type { StatusDetailData } from '@/features/pages/types';

export async function fetchStatusDetail(): Promise<StatusDetailData> {
  const res =
    await apiClient.get<ApiResponse<StatusDetailData>>('v3/status/detail');
  return res.data.data;
}
