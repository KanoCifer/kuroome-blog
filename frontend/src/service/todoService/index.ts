import request from "@/api/request";
import type { BatchAction, CreateTodoPayload, Todo, TodoApiResponse } from "@/service/todoService/types";

export const todoService = {
  async fetchTodos(includeArchived = false): Promise<Todo[]> {
    const res = await request.get<TodoApiResponse>("/v1/todos", {
      params: { include_archived: includeArchived },
    });
    return res.data.data?.todos ?? [];
  },

  async addTodo(payload: CreateTodoPayload): Promise<Todo | null> {
    const res = await request.post<TodoApiResponse>("/v1/todos", payload);
    return res.data.data?.todo ?? null;
  },

  async updateTodo(id: string, patch: Partial<Todo>): Promise<Todo | null> {
    const res = await request.patch<TodoApiResponse>(`/v1/todos/${id}`, patch);
    return res.data.data?.todo ?? null;
  },

  async removeTodo(id: string): Promise<void> {
    await request.delete(`/v1/todos/${id}`);
  },

  async batchAction(action: BatchAction): Promise<void> {
    await request.post("/v1/todos/batch", { action });
  },
};
