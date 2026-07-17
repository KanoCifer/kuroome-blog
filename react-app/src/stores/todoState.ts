import {
  devTaskService,
  type DevTaskService,
} from '@/services/devtaskService';
import { create } from 'zustand';
import type {
  CreateDevTaskPayload,
  DevTask,
  DevTaskStatus,
} from '@/services/devtaskService/types';

// v3 全量状态标签
export const STATUS_LABELS: Record<DevTaskStatus, string> = {
  '待评估': '待评估',
  '待排期': '待排期',
  '进行中': '进行中',
  '已搁置': '已搁置',
  '已完成': '已完成',
};

// 状态推进：跳开"已搁置"——搁置与恢复是用户主动选择，不在循环里
const STATUS_CYCLE: Record<DevTaskStatus, DevTaskStatus> = {
  '待评估': '待排期',
  '待排期': '进行中',
  '进行中': '已完成',
  '已搁置': '待排期',
  '已完成': '待评估',
};

interface DevTaskState {
  tasks: DevTask[];
  hydrateTasks: () => void;
  createTask: (payload: CreateDevTaskPayload) => Promise<void>;
  cycleStatus: (slug: string) => Promise<void>;
  updateTask: (slug: string, patch: Partial<DevTask>) => Promise<void>;
  deleteTask: (slug: string) => Promise<void>;
}

const service: DevTaskService = devTaskService();

export const useTodoState = create<DevTaskState>((set, get) => ({
  tasks: [],

  hydrateTasks: () => {
    service.list({ per_page: 200 }).then((res) =>
      set({ tasks: res.tasks.filter((t) => !t.is_deleted) }),
    );
  },

  createTask: async (payload) => {
    const newTask = await service.create(payload);
    if (newTask) {
      set((state) => ({ tasks: [newTask, ...state.tasks] }));
    }
  },

  cycleStatus: async (slug) => {
    const task = get().tasks.find((t) => t.slug === slug);
    if (!task) return;
    const nextStatus = STATUS_CYCLE[task.status];
    await service.update(slug, { status: nextStatus });
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.slug === slug ? { ...t, status: nextStatus } : t,
      ),
    }));
  },

  updateTask: async (slug, patch) => {
    await service.update(slug, patch);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.slug === slug ? { ...t, ...patch } : t,
      ),
    }));
  },

  deleteTask: async (slug) => {
    await service.remove(slug);
    set((state) => ({ tasks: state.tasks.filter((t) => t.slug !== slug) }));
  },
}));
