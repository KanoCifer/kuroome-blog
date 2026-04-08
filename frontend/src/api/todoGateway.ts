import request from "@/api/request";
import type { BatchAction, CreateTodoPayload, Todo, TodoApiResponse } from "@/service/todoService/types";

export interface TodoGateway {
  fetchTodos(includeArchived?: boolean): Promise<{ data?: { todos?: Todo[] } }>;
  addTodo(payload: CreateTodoPayload): Promise<{ data?: { todo?: Todo } }>;
  updateTodo(id: string, patch: Partial<Todo>): Promise<{ data?: { todo?: Todo } }>;
  removeTodo(id: string): Promise<void>;
  batchAction(action: BatchAction): Promise<void>;
}

export const todoGateway: TodoGateway = {
  async fetchTodos(includeArchived = false) {
    const res = await request.get<TodoApiResponse>("v1/todos", {
      params: { include_archived: includeArchived },
    });
    return res.data;
  },

  async addTodo(payload: CreateTodoPayload) {
    const res = await request.post<TodoApiResponse>("v1/todos", payload);
    return res.data;
  },

  async updateTodo(id: string, patch: Partial<Todo>) {
    const res = await request.patch<TodoApiResponse>(`v1/todos/${id}`, patch);
    return res.data;
  },

  async removeTodo(id: string) {
    await request.delete(`v1/todos/${id}`);
  },

  async batchAction(action: BatchAction) {
    await request.post("v1/todos/batch", { action });
  },
};
