export type DevTaskPriority = 'low' | 'high' | 'default';
export type DevTaskStatus = 'todo' | 'in-progress' | 'done';

export interface DevTask {
  id: string;
  title: string;
  status: DevTaskStatus;
  createdAt: string;
  updatedAt: string;
  description?: string;
  dueDate?: string;
  priority: DevTaskPriority;
}

export interface DevTaskResponse {
  tasks: {
    todo: DevTask[];
    'in-progress': DevTask[];
    done: DevTask[];
  };
}

export interface CreateDevTaskPayload {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: DevTaskPriority;
  status?: DevTaskStatus;
}
