import { devTaskGateway } from "@/api/todoGateway";
import type { DevTask, DevTaskStatus } from "@/service/todoService/types";
import { type CreateDevTaskPayload } from "@/service/todoService/types";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

export const STATUS_LABELS: Record<DevTaskStatus, string> = {
  todo: "待开发",
  "in-progress": "开发中",
  done: "已完成",
};

const STATUS_CYCLE: Record<DevTaskStatus, DevTaskStatus> = {
  todo: "in-progress",
  "in-progress": "done",
  done: "todo",
};

export const useTodoStore = defineStore("todos", () => {
  const tasks = ref<DevTask[]>([]);
  const isCollapsed = useStorage("todos-collapsed", false);
  const isHydrated = ref(false);
  const hydrationScope = ref<"guest" | "auth" | null>(null);
  const auth = useAuthStore();
  let hydrationPromise: Promise<void> | null = null;

  const activeTasks = computed(() =>
    tasks.value.filter((t) => t.status !== "done"),
  );
  const doneCount = computed(
    () => tasks.value.filter((t) => t.status === "done").length,
  );
  const todoItems = computed(() =>
    tasks.value.filter((t) => t.status === "todo"),
  );
  const inProgressItems = computed(() =>
    tasks.value.filter((t) => t.status === "in-progress"),
  );
  const doneItems = computed(() =>
    tasks.value.filter((t) => t.status === "done"),
  );

  const notifier = useNotificationStore();

  async function fetchTasks(): Promise<boolean> {
    try {
      tasks.value = await devTaskGateway.fetchTasks();
      return true;
    } catch (err) {
      console.error("fetchTasks error", err);
      notifier.error("加载开发任务失败");
      return false;
    }
  }

  async function hydrateTasks(): Promise<void> {
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      if (!auth.isAuthenticated) {
        hydrationScope.value = "guest";
        isHydrated.value = true;
        tasks.value = [];
        return;
      }

      if (hydrationScope.value === "auth" && isHydrated.value) return;

      await fetchTasks();
      hydrationScope.value = "auth";
      isHydrated.value = true;
    })().finally(() => {
      hydrationPromise = null;
    });

    return hydrationPromise;
  }

  watch(
    () => auth.isAuthenticated,
    (authenticated) => {
      if (!authenticated) {
        hydrationScope.value = "guest";
        isHydrated.value = true;
        tasks.value = [];
        return;
      }

      if (hydrationScope.value !== "auth") {
        void hydrateTasks();
      }
    },
    { immediate: true },
  );

  async function createTask(payload: CreateDevTaskPayload) {
    try {
      const task = await devTaskGateway.createTask(payload);
      if (task) tasks.value.unshift(task);
    } catch (err) {
      console.error(err);
      notifier.error("添加任务失败");
    }
  }

  async function cycleStatus(id: string) {
    const t = tasks.value.find((x) => x.id === id);
    if (!t) return;
    const nextStatus = STATUS_CYCLE[t.status];
    try {
      const updated = await devTaskGateway.updateTask(id, {
        status: nextStatus,
      });
      const idx = tasks.value.findIndex((x) => x.id === id);
      if (idx !== -1 && updated) tasks.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("更新任务状态失败");
    }
  }

  async function deleteTask(id: string) {
    try {
      await devTaskGateway.deleteTask(id);
      tasks.value = tasks.value.filter((t) => t.id !== id);
    } catch (err) {
      console.error(err);
      notifier.error("删除任务失败");
    }
  }

  async function updateTask(id: string, patch: Partial<DevTask>) {
    try {
      const updated = await devTaskGateway.updateTask(id, patch);
      const idx = tasks.value.findIndex((x) => x.id === id);
      if (idx !== -1 && updated) tasks.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("更新任务失败");
    }
  }

  return {
    tasks,
    isCollapsed,
    doneCount,
    activeTasks,
    todoItems,
    inProgressItems,
    doneItems,
    createTask,
    cycleStatus,
    deleteTask,
    updateTask,
    hydrateTasks,
  };
});
