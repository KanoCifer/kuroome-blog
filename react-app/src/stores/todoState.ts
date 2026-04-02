import { todoService, type TodoService } from '@/services/todoService';
import { create } from 'zustand';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  arichived: boolean;
  archivedAt: string;
}
interface TodoState {
  todos: Todo[];
  getTodos: () => void;
  addTodo: (todo: Todo) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updatedTodo: Todo) => void;
  archiveCompleted: () => void;
  clearCompleted: () => void;
}

const service: TodoService = todoService(); // 获取 todoService 实例

export const useTodoState = create<TodoState>((set) => ({
  // 数据结构
  todos: [],

  getTodos: async () => {
    const todos = await service.fetchTodos();
    set({ todos });
  },

  // 方法
  addTodo: async (todo) => {
    const newTodo = await service.addTodo(todo);
    if (newTodo) {
      set((state) => ({
        todos: [...state.todos, newTodo],
      }));
    }
  },

  deleteTodo: async (id) => {
    await service.removeTodo(id);
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    }));
  },

  updateTodo: async (id, updatedTodo) => {
    const updated = await service.updateTodo(id, updatedTodo);
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? (updated ? { ...t, ...updated } : t) : t,
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
    set((state) => ({
      todos: state.todos.filter((t) => !t.completed),
    }));
  },
}));
