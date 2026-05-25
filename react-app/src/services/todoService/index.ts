import request, { extractData } from '@/api/request.ts';
import type { DevTask } from './types';

import type { CreateDevTaskPayload } from './types';

export interface DevTaskService {
  fetchTasks(): Promise<DevTask[]>;
  createTask(payload: CreateDevTaskPayload): Promise<DevTask | null>;
  updateTask(id: string, patch: Partial<DevTask>): Promise<DevTask | null>;
  deleteTask(id: string): Promise<void>;
}

export const devTaskService = (): DevTaskService => ({
  async fetchTasks(): Promise<DevTask[]> {
    const res = await request.get('v1/devtasks');
    const data = extractData(res) as { tasks?: DevTask[] } | undefined;
    return data?.tasks ?? [];
  },

  async createTask(payload: CreateDevTaskPayload): Promise<DevTask | null> {
    const res = await request.post('v1/devtasks', payload);
    const data = extractData(res) as { task?: DevTask } | undefined;
    return data?.task ?? null;
  },

  async updateTask(
    id: string,
    patch: Partial<DevTask>,
  ): Promise<DevTask | null> {
    const res = await request.patch(`v1/devtasks/${id}`, patch);
    const data = extractData(res) as { task?: DevTask } | undefined;
    return data?.task ?? null;
  },

  async deleteTask(id: string): Promise<void> {
    await request.delete(`v1/devtasks/${id}`);
  },
});
