import { todoService, type TodoService } from '@/services/todoService';
import { create } from 'zustand';
import type { CreateTodoPayload } from '@/services/todoService/types';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  archived?: boolean;
  archivedAt?: string;
}

interface TodoState {
  todos: Todo[];
  hydrateTodos: () => void;
  addTodo: (payload: CreateTodoPayload) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  updateTodo: (id: string, patch: Partial<Todo>) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  archiveTodo: (id: string) => Promise<void>;
  unarchiveTodo: (id: string) => Promise<void>;
  archiveCompleted: () => Promise<void>;
  clearCompleted: () => Promise<void>;
}

const service: TodoService = todoService();

export const useTodoState = create<TodoState>((set, get) => ({
  todos: [],

  hydrateTodos: () => {
    service.fetchTodos(true).then((todos) => set({ todos }));
  },

  addTodo: async (payload) => {
    const newTodo = await service.addTodo(payload);
    if (newTodo) {
      set((state) => ({ todos: [...state.todos, newTodo] }));
    }
  },

  toggleTodo: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (todo) {
      await service.updateTodo(id, { completed: !todo.completed });
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t,
        ),
      }));
    }
  },

  updateTodo: async (id, patch) => {
    const updated = await service.updateTodo(id, patch);
    if (updated) {
      set((state) => ({
        todos: state.todos.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      }));
    }
  },

  removeTodo: async (id) => {
    await service.removeTodo(id);
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }));
  },

  archiveTodo: async (id) => {
    await service.updateTodo(id, { archived: true, archivedAt: new Date().toISOString() });
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, archived: true, archivedAt: new Date().toISOString() } : t,
      ),
    }));
  },

  unarchiveTodo: async (id) => {
    await service.updateTodo(id, { archived: false });
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, archived: false } : t,
      ),
    }));
  },

  archiveCompleted: async () => {
    await service.batchAction('archiveCompleted');
    set((state) => ({
      todos: state.todos.map((t) =>
        t.completed
          ? { ...t, archived: true, archivedAt: new Date().toISOString() }
          : t,
      ),
    }));
  },

  clearCompleted: async () => {
    await service.batchAction('clearCompleted');
    set((state) => ({ todos: state.todos.filter((t) => !t.completed) }));
  },
}));
