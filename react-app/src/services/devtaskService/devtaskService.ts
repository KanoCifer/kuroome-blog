import request, { extractData } from '@/api/request.ts';

import type {
  CreateDevTaskPayload,
  DevTask,
  DevTaskListResponse,
  ListDevTasksParams,
  UpdateDevTaskPayload,
} from './types';

export interface DevTaskService {
  list(params?: ListDevTasksParams): Promise<DevTaskListResponse>;
  get(id: string): Promise<DevTask>;
  create(payload: CreateDevTaskPayload): Promise<DevTask>;
  update(id: string, payload: UpdateDevTaskPayload): Promise<void>;
  remove(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
}

export const devTaskService = (): DevTaskService => ({
  async list(params): Promise<DevTaskListResponse> {
    const res = await request.get('v3/dev-tasks', { params });
    return extractData(res) as DevTaskListResponse;
  },

  async get(id: string): Promise<DevTask> {
    const res = await request.get(`v3/dev-tasks/${id}`);
    return extractData(res) as DevTask;
  },

  async create(payload: CreateDevTaskPayload): Promise<DevTask> {
    const res = await request.post('v3/dev-tasks', payload);
    return extractData(res) as DevTask;
  },

  async update(id: string, payload: UpdateDevTaskPayload): Promise<void> {
    await request.patch(`v3/dev-tasks/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await request.delete(`v3/dev-tasks/${id}`);
  },

  async hardDelete(id: string): Promise<void> {
    await request.delete(`v3/dev-tasks/${id}/permanent`);
  },
});
