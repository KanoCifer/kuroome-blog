import request from '@/api/request';
import type {
  CreateDevTaskPayload,
  DevTask,
  DevTaskResponse,
} from '@/service/todoService/types';

export interface DevTaskGateway {
  fetchTasks(): Promise<DevTaskResponse['tasks']>;
  createTask(payload: CreateDevTaskPayload): Promise<DevTask | null>;
  updateTask(id: string, patch: Partial<DevTask>): Promise<DevTask | null>;
  deleteTask(id: string): Promise<void>;
  patchTasksOrder({
    status,
    ordered_ids,
  }: {
    status: string;
    ordered_ids: string[];
  }): Promise<void>;
}

export const devTaskGateway: DevTaskGateway = {
  async fetchTasks(): Promise<DevTaskResponse['tasks']> {
    const res = await request.get<{
      data?: { tasks?: DevTaskResponse['tasks'] };
    }>('v2/devtasks');
    return res.data.data?.tasks ?? { todo: [], 'in-progress': [], done: [] };
  },

  async createTask(payload: CreateDevTaskPayload): Promise<DevTask | null> {
    const res = await request.post<{ data?: { task?: DevTask } }>(
      'v2/devtasks',
      payload,
    );
    return res.data.data?.task ?? null;
  },

  async updateTask(
    id: string,
    patch: Partial<DevTask>,
  ): Promise<DevTask | null> {
    const res = await request.patch<{ data?: { task?: DevTask } }>(
      `v2/devtasks/${id}`,
      patch,
    );
    return res.data.data?.task ?? null;
  },

  async deleteTask(id: string): Promise<void> {
    await request.delete(`v2/devtasks/${id}`);
  },

  async patchTasksOrder({
    status,
    ordered_ids,
  }: {
    status: string;
    ordered_ids: string[];
  }): Promise<void> {
    await request.put(`v2/devtasks/reorder`, { status, ordered_ids });
  },
};
