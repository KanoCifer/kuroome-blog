import request, { extractData } from '@/api/request.ts';
import type { Todo } from '@/stores/todoState.ts';

import type { BatchAction, CreateTodoPayload } from './types';

export interface TodoService {
  fetchTodos(includeArchived?: boolean): Promise<Todo[]>;
  addTodo(payload: CreateTodoPayload): Promise<Todo | null>;
  updateTodo(id: string, patch: Partial<Todo>): Promise<Todo | null>;
  removeTodo(id: string): Promise<void>;
  batchAction(action: BatchAction): Promise<void>;
}

export const todoService = (): TodoService => ({
  async fetchTodos(includeArchived = false): Promise<Todo[]> {
    const res = await request.get('v1/todos', {
      params: { include_archived: includeArchived },
    });
    const data = extractData(res) as { todos?: Todo[] } | undefined;
    return data?.todos ?? [];
  },

  async addTodo(payload: CreateTodoPayload): Promise<Todo | null> {
    const res = await request.post('v1/todos', payload);
    const data = extractData(res) as { todo?: Todo } | undefined;
    return data?.todo ?? null;
  },

  async updateTodo(id: string, patch: Partial<Todo>): Promise<Todo | null> {
    const res = await request.patch(`v1/todos/${id}`, patch);
    const data = extractData(res) as { todo?: Todo } | undefined;
    return data?.todo ?? null;
  },

  async removeTodo(id: string): Promise<void> {
    await request.delete(`v1/todos/${id}`);
  },

  async batchAction(action: BatchAction): Promise<void> {
    await request.post(`v1/todos/batch`, { action });
  },
});
