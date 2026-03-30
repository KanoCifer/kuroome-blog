import request from "@/api/request";
import type { CreateTodoPayload, Todo, TodoApiResponse } from "@/service/todoService/types";

export const todoService = {
  async fetchTodos(): Promise<Todo[]> {
    const res = await request.get<TodoApiResponse>("/todos");
    return res.data.data?.todos ?? [];
  },

  async addTodo(payload: CreateTodoPayload): Promise<Todo | null> {
    const res = await request.post<TodoApiResponse>("/todos", payload);
    return res.data.data?.todo ?? null;
  },

  async toggleTodo(id: string, completed: boolean): Promise<Todo | null> {
    const res = await request.patch<TodoApiResponse>(`/todos/${id}`, {
      completed,
    });
    return res.data.data?.todo ?? null;
  },

  async removeTodo(id: string): Promise<void> {
    await request.delete(`/todos/${id}`);
  },

  async updateTodo(id: string, patch: Partial<Todo>): Promise<Todo | null> {
    const res = await request.put<TodoApiResponse>(`/todos/${id}`, patch);
    return res.data.data?.todo ?? null;
  },

  async clearCompleted(): Promise<void> {
    await request.post("/todos/clear-completed");
  },

  async archiveTodo(id: string): Promise<Todo | null> {
    const res = await request.post<TodoApiResponse>(`/todos/${id}/archive`);
    return res.data.data?.todo ?? null;
  },

  async unarchiveTodo(id: string): Promise<Todo | null> {
    const res = await request.post<TodoApiResponse>(`/todos/${id}/unarchive`);
    return res.data.data?.todo ?? null;
  },

  async archiveCompleted(): Promise<void> {
    await request.post("/todos/archive-completed");
  },

  async fetchArchivedTodos(): Promise<Todo[]> {
    const res = await request.get<TodoApiResponse>("/todos/archived");
    return res.data.data?.todos ?? [];
  },
};
