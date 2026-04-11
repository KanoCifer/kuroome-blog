export type TodoPriority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  description?: string;
  dueDate?: string;
  priority: TodoPriority;
  category?: string;
  archived?: boolean;
  archivedAt?: string;
}

export interface TodoApiPayload {
  todo?: Todo;
  todos?: Todo[];
}

export interface TodoApiResponse {
  data?: TodoApiPayload;
}

export interface CreateTodoPayload {
  text: string;
  description?: string;
  dueDate?: string;
  priority?: TodoPriority;
  category?: string;
}

export type BatchAction = 'archiveCompleted' | 'clearCompleted';
