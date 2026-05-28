import { devTaskService, type DevTaskService } from '@/services/todoService';
import { create } from 'zustand';
import type {
  CreateDevTaskPayload,
  DevTask,
  DevTaskStatus,
} from '@/services/todoService/types';

export const STATUS_LABELS: Record<DevTaskStatus, string> = {
  todo: '待开发',
  'in-progress': '开发中',
  done: '已完成',
};

const STATUS_CYCLE: Record<DevTaskStatus, DevTaskStatus> = {
  todo: 'in-progress',
  'in-progress': 'done',
  done: 'todo',
};

interface DevTaskState {
  tasks: DevTask[];
  hydrateTasks: () => void;
  createTask: (payload: CreateDevTaskPayload) => Promise<void>;
  cycleStatus: (id: string) => Promise<void>;
  updateTask: (id: string, patch: Partial<DevTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const service: DevTaskService = devTaskService();

export const useTodoState = create<DevTaskState>((set, get) => ({
  tasks: [],

  hydrateTasks: () => {
    service.fetchTasks().then((grouped) =>
      set({
        tasks: [...grouped.todo, ...grouped['in-progress'], ...grouped.done],
      }),
    );
  },

  createTask: async (payload) => {
    const newTask = await service.createTask(payload);
    if (newTask) {
      set((state) => ({ tasks: [newTask, ...state.tasks] }));
    }
  },

  cycleStatus: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = STATUS_CYCLE[task.status];
    const updated = await service.updateTask(id, { status: nextStatus });
    if (updated) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      }));
    }
  },

  updateTask: async (id, patch) => {
    const updated = await service.updateTask(id, patch);
    if (updated) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      }));
    }
  },

  deleteTask: async (id) => {
    await service.deleteTask(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },
}));
