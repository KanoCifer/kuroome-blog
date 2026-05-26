import request, { extractData } from '@/api/request.ts';
import type { DevTask, DevTaskResponse } from './types';

import type { CreateDevTaskPayload } from './types';

export interface DevTaskService {
  fetchTasks(): Promise<DevTaskResponse['tasks']>;
  createTask(payload: CreateDevTaskPayload): Promise<DevTask | null>;
  updateTask(id: string, patch: Partial<DevTask>): Promise<DevTask | null>;
  deleteTask(id: string): Promise<void>;
}

export const devTaskService = (): DevTaskService => ({
  async fetchTasks(): Promise<DevTaskResponse['tasks']> {
    const res = await request.get('v2/devtasks');
    const data = extractData(res) as
      | { tasks?: DevTaskResponse['tasks'] }
      | undefined;
    return data?.tasks ?? { todo: [], 'in-progress': [], done: [] };
  },

  async createTask(payload: CreateDevTaskPayload): Promise<DevTask | null> {
    const res = await request.post('v2/devtasks', payload);
    const data = extractData(res) as { task?: DevTask } | undefined;
    return data?.task ?? null;
  },

  async updateTask(
    id: string,
    patch: Partial<DevTask>,
  ): Promise<DevTask | null> {
    const res = await request.patch(`v2/devtasks/${id}`, patch);
    const data = extractData(res) as { task?: DevTask } | undefined;
    return data?.task ?? null;
  },

  async deleteTask(id: string): Promise<void> {
    await request.delete(`v2/devtasks/${id}`);
  },
});
