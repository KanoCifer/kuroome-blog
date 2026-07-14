import devtaskRequest from './devtaskRequest.ts';
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

const extractData = <T>(res: { data: { data: T } }): T => res.data.data;

export const devTaskService = (): DevTaskService => ({
  async list(params): Promise<DevTaskListResponse> {
    const res = await devtaskRequest.get<{ data: DevTaskListResponse }>(
      'v3/dev-tasks',
      {
        params,
      },
    );
    return extractData(res);
  },

  async get(id: string): Promise<DevTask> {
    const res = await devtaskRequest.get<{ data: DevTask }>(
      `v3/dev-tasks/${id}`,
    );
    return extractData(res);
  },

  async create(payload: CreateDevTaskPayload): Promise<DevTask> {
    const res = await devtaskRequest.post<{ data: DevTask }>(
      'v3/dev-tasks',
      payload,
    );
    return extractData(res);
  },

  async update(id: string, payload: UpdateDevTaskPayload): Promise<void> {
    await devtaskRequest.patch(`v3/dev-tasks/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await devtaskRequest.delete(`v3/dev-tasks/${id}`);
  },

  async hardDelete(id: string): Promise<void> {
    await devtaskRequest.delete(`v3/dev-tasks/${id}/permanent`);
  },
});
