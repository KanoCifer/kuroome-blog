import { devTaskGateway } from '@/api/devtask';
import type {
  CreateDevTaskPayload,
  DevTask,
  DevTaskStatus,
  DevTaskType,
  UpdateDevTaskPayload,
} from '@/api/devtask';
import { useNotificationStore } from '@/stores/notification';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

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
  待评估: '待排期',
  待排期: '进行中',
  进行中: '已完成',
  已搁置: '待排期',
  已完成: '待评估',
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

  async function createTask(
    payload: CreateDevTaskPayload,
  ): Promise<DevTask | null> {
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
    slug: string,
    patch: UpdateDevTaskPayload,
  ): Promise<boolean> {
    try {
      await devTaskGateway.update(slug, patch);
      tasks.value = tasks.value.map((t) =>
        t.slug === slug ? { ...t, ...patch } : t,
      );
      return true;
    } catch (err) {
      console.error('update v3 devtask error:', err);
      notifier.error('更新任务失败');
      return false;
    }
  }

  async function cycleStatus(slug: string): Promise<void> {
    const t = tasks.value.find((x) => x.slug === slug);
    if (!t) return;
    const nextStatus = STATUS_CYCLE[t.status];
    await updateTask(slug, { status: nextStatus });
  }

  /** 软删除（默认删除语义）。UI 上"永久删除"调用 hardDeleteTask。 */
  async function deleteTask(slug: string): Promise<void> {
    try {
      await devTaskGateway.remove(slug);
      tasks.value = tasks.value.filter((t) => t.slug !== slug);
    } catch (err) {
      console.error('delete v3 devtask error:', err);
      notifier.error('删除任务失败');
    }
  }

  async function hardDeleteTask(slug: string): Promise<void> {
    try {
      await devTaskGateway.hardDelete(slug);
      tasks.value = tasks.value.filter((t) => t.slug !== slug);
    } catch (err) {
      console.error('hard delete v3 devtask error:', err);
      notifier.error('永久删除失败');
    }
  }

  /** 拖拽跨列后批量同步：先改 status，再按每列可见顺序写 sort_order。 */
  async function syncColumn(
    status: DevTaskStatus,
    orderedSlugs: string[],
  ): Promise<void> {
    // 先做本地乐观更新，保证拖拽后立刻重排
    const slugSet = new Set(orderedSlugs);
    const reordered: DevTask[] = [];
    const others: DevTask[] = [];
    for (const t of tasks.value) {
      if (slugSet.has(t.slug)) reordered.push(t);
      else others.push(t);
    }
    orderedSlugs.forEach((slug, idx) => {
      const t = reordered.find((x) => x.slug === slug);
      if (t) {
        t.status = status;
        t.sort_order = idx;
      }
    });
    tasks.value = [...others, ...reordered].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    // 远端同步：逐个 update（v3 无批量排序接口）
    for (const [idx, slug] of orderedSlugs.entries()) {
      const t = reordered.find((x) => x.slug === slug);
      if (!t) continue;
      // 仅在真正变化时打后端，避免无谓请求
      const original = tasks.value.find((x) => x.slug === slug);
      if (original && original.status === status && original.sort_order === idx)
        continue;
      try {
        await devTaskGateway.update(slug, { status, sort_order: idx });
      } catch (err) {
        console.error('sync column error:', err);
        notifier.error('排序同步失败');
        return;
      }
    }
  }

  // ── derived views for the workspace ──

  /**
   * frontier = 非已完成 且 无阻塞依赖 的任务。
   * 按优先级权重 + 截止日排序：P0 优先，有截止日的优先。
   */
  const frontier = computed<DevTask[]>(() => {
    const weight = (p: DevTask['priority']) =>
      ({ 'P0 紧急': 0, 'P1 高': 1, 'P2 中': 2, 'P3 低': 3 })[p] ?? 9;
    return tasks.value
      .filter((t) => t.status !== '已完成' && !t.is_deleted)
      .filter((t) => !t.blocked_by || t.blocked_by.length === 0)
      .sort((a, b) => {
        const w = weight(a.priority) - weight(b.priority);
        if (w !== 0) return w;
        if (a.due_date && b.due_date)
          return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
  });

  /** 本周已完成（自然周，周一为起始）。 */
  const completedThisWeek = computed<DevTask[]>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1); // Monday
    start.setHours(0, 0, 0, 0);
    return tasks.value
      .filter((t) => t.status === '已完成' && !t.is_deleted)
      .filter((t) => t.updated_at && new Date(t.updated_at) >= start)
      .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
  });

  const inProgress = computed<DevTask[]>(() => tasksByStatus('进行中'));

  const totalActive = computed(
    () =>
      tasks.value.filter((t) => !t.is_deleted && t.status !== '已完成').length,
  );

  const completedCount = computed(
    () =>
      tasks.value.filter((t) => !t.is_deleted && t.status === '已完成').length,
  );

  const urgentActive = computed(
    () =>
      tasks.value.filter(
        (t) =>
          !t.is_deleted && t.priority === 'P0 紧急' && t.status !== '已完成',
      ).length,
  );

  const typeDistribution = computed<Record<DevTaskType, number>>(() => {
    const dist: Record<string, number> = {
      功能需求: 0,
      问题: 0,
      优化: 0,
      技术债: 0,
    };
    for (const t of tasks.value) {
      if (!t.is_deleted && t.type in dist) dist[t.type]++;
    }
    return dist as Record<DevTaskType, number>;
  });

  /** 当前日期字符串 YYYY-MM-DD，用于回顾 tab 标题。 */
  const todayDisplay = computed(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  /** 本周起止日期范围，用于回顾 tab 标题。 */
  const weekRangeDisplay = computed(() => {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - now.getDay() + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${fmt(mon)} ~ ${fmt(sun)}`;
  });

  return {
    tasks,
    loading,
    tasksByStatus,
    V3_STATUSES,
    // derived
    frontier,
    completedThisWeek,
    inProgress,
    totalActive,
    completedCount,
    urgentActive,
    typeDistribution,
    todayDisplay,
    weekRangeDisplay,
    // actions
    fetchTasks,
    createTask,
    updateTask,
    cycleStatus,
    deleteTask,
    hardDeleteTask,
    syncColumn,
  };
});
