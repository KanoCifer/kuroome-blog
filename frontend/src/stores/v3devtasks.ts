import { devTaskGateway } from '@/api/devtask';
import type {
  CreateDevTaskPayload,
  DevTask,
  DevTaskStatus,
  UpdateDevTaskPayload,
} from '@/api/devtask';
import { useNotificationStore } from '@/stores/notification';
import { defineStore } from 'pinia';
import { ref } from 'vue';

// v3 全量状态，顺序即看板从左到右的阅读流。
export const V3_STATUSES: DevTaskStatus[] = [
  '待评估',
  '待排期',
  '进行中',
  '已搁置',
  '已完成',
];

// 默认状态推进（跳开"已搁置"——搁置与恢复是用户主动选择，不在循环里）。
const STATUS_CYCLE: Record<DevTaskStatus, DevTaskStatus> = {
  '待评估': '待排期',
  '待排期': '进行中',
  '进行中': '已完成',
  '已搁置': '待排期',
  '已完成': '待评估',
};

export const useV3DevTaskStore = defineStore('v3-devtasks', () => {
  const tasks = ref<DevTask[]>([]);
  const loading = ref(false);
  const notifier = useNotificationStore();

  /** 按状态分组后的任务，保持 sort_order / created_at 稳定序。 */
  function tasksByStatus(status: DevTaskStatus): DevTask[] {
    return tasks.value
      .filter((t) => t.status === status && !t.is_deleted)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  async function fetchTasks(): Promise<void> {
    loading.value = true;
    try {
      // 看板展示全量；v3 分页默认 per_page=10，提高到 200 覆盖个人工作台量级。
      const res = await devTaskGateway.list({ per_page: 200 });
      // 过滤已软删除的；后端 filter 默认 is_deleted=false，此处做防御性兜底
      tasks.value = res.tasks.filter((t) => !t.is_deleted);
    } catch (err) {
      console.error('fetch v3 devtasks error:', err);
      notifier.error('加载开发任务失败');
    } finally {
      loading.value = false;
    }
  }

  async function createTask(payload: CreateDevTaskPayload): Promise<DevTask | null> {
    try {
      const task = await devTaskGateway.create(payload);
      tasks.value = [task, ...tasks.value];
      return task;
    } catch (err) {
      console.error('create v3 devtask error:', err);
      notifier.error('创建任务失败');
      return null;
    }
  }

  async function updateTask(
    id: string,
    patch: UpdateDevTaskPayload,
  ): Promise<boolean> {
    try {
      await devTaskGateway.update(id, patch);
      tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      );
      return true;
    } catch (err) {
      console.error('update v3 devtask error:', err);
      notifier.error('更新任务失败');
      return false;
    }
  }

  async function cycleStatus(id: string): Promise<void> {
    const t = tasks.value.find((x) => x.id === id);
    if (!t) return;
    const nextStatus = STATUS_CYCLE[t.status];
    await updateTask(id, { status: nextStatus });
  }

  /** 软删除（默认删除语义）。UI 上"永久删除"调用 hardDeleteTask。 */
  async function deleteTask(id: string): Promise<void> {
    try {
      await devTaskGateway.remove(id);
      tasks.value = tasks.value.filter((t) => t.id !== id);
    } catch (err) {
      console.error('delete v3 devtask error:', err);
      notifier.error('删除任务失败');
    }
  }

  async function hardDeleteTask(id: string): Promise<void> {
    try {
      await devTaskGateway.hardDelete(id);
      tasks.value = tasks.value.filter((t) => t.id !== id);
    } catch (err) {
      console.error('hard delete v3 devtask error:', err);
      notifier.error('永久删除失败');
    }
  }

  /** 拖拽跨列后批量同步：先改 status，再按每列可见顺序写 sort_order。 */
  async function syncColumn(
    status: DevTaskStatus,
    orderedIds: string[],
  ): Promise<void> {
    // 先做本地乐观更新，保证拖拽后立刻重排
    const idSet = new Set(orderedIds);
    const reordered: DevTask[] = [];
    const others: DevTask[] = [];
    for (const t of tasks.value) {
      if (idSet.has(t.id)) reordered.push(t);
      else others.push(t);
    }
    orderedIds.forEach((id, idx) => {
      const t = reordered.find((x) => x.id === id);
      if (t) {
        t.status = status;
        t.sort_order = idx;
      }
    });
    tasks.value = [...others, ...reordered].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    // 远端同步：逐个 update（v3 无批量排序接口）
    for (const [idx, id] of orderedIds.entries()) {
      const t = reordered.find((x) => x.id === id);
      if (!t) continue;
      // 仅在真正变化时打后端，避免无谓请求
      const original = tasks.value.find((x) => x.id === id);
      if (original && original.status === status && original.sort_order === idx)
        continue;
      try {
        await devTaskGateway.update(id, { status, sort_order: idx });
      } catch (err) {
        console.error('sync column error:', err);
        notifier.error('排序同步失败');
        return;
      }
    }
  }

  return {
    tasks,
    loading,
    tasksByStatus,
    V3_STATUSES,
    fetchTasks,
    createTask,
    updateTask,
    cycleStatus,
    deleteTask,
    hardDeleteTask,
    syncColumn,
  };
});
