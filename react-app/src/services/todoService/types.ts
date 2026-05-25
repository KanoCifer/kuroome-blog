export type DevTaskPriority = 'low' | 'medium' | 'high';
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

export interface CreateDevTaskPayload {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: DevTaskPriority;
  status?: DevTaskStatus;
}
