import request from "@/api/request";
import type { CreateDevTaskPayload, DevTask } from "@/service/todoService/types";

export interface DevTaskGateway {
  fetchTasks(): Promise<DevTask[]>;
  createTask(payload: CreateDevTaskPayload): Promise<DevTask | null>;
  updateTask(
    id: string,
    patch: Partial<DevTask>,
  ): Promise<DevTask | null>;
  deleteTask(id: string): Promise<void>;
}

export const devTaskGateway: DevTaskGateway = {
  async fetchTasks(): Promise<DevTask[]> {
    const res = await request.get<{ data?: { tasks?: DevTask[] } }>(
      "v1/devtasks",
    );
    return res.data.data?.tasks ?? [];
  },

  async createTask(payload: CreateDevTaskPayload): Promise<DevTask | null> {
    const res = await request.post<{ data?: { task?: DevTask } }>(
      "v1/devtasks",
      payload,
    );
    return res.data.data?.task ?? null;
  },

  async updateTask(
    id: string,
    patch: Partial<DevTask>,
  ): Promise<DevTask | null> {
    const res = await request.patch<{ data?: { task?: DevTask } }>(
      `v1/devtasks/${id}`,
      patch,
    );
    return res.data.data?.task ?? null;
  },

  async deleteTask(id: string): Promise<void> {
    await request.delete(`v1/devtasks/${id}`);
  },
};
