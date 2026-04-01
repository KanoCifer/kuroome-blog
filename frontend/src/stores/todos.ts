import { todoService } from "@/service/todoService";
import type { Todo } from "@/service/todoService/types";
import { type CreateTodoPayload } from "@/service/todoService/types";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

export const useTodoStore = defineStore("todos", () => {
  const todos = ref<Todo[]>([]);
  const isCollapsed = useStorage("todos-collapsed", false);
  const isHydrated = ref(false);
  const hydrationScope = ref<"guest" | "auth" | null>(null);
  const auth = useAuthStore();
  let hydrationPromise: Promise<void> | null = null;

  const nonArchivedTodos = computed(() => todos.value.filter((t) => !t.archived));
  const completedCount = computed(() => nonArchivedTodos.value.filter((t) => t.completed).length);
  const activeTodos = computed(() => nonArchivedTodos.value.filter((t) => !t.completed));
  const completedTodos = computed(() => nonArchivedTodos.value.filter((t) => t.completed));
  const archivedTodos = computed(() => todos.value.filter((t) => t.archived));

  const notifier = useNotificationStore();

  // 加载待办事项
  async function fetchTodos(): Promise<boolean> {
    try {
      todos.value = await todoService.fetchTodos();
      return true;
    } catch (err) {
      console.error("fetchTodos error", err);
      notifier.error("加载待办事项失败");
      return false;
    }
  }

  // 初始化数据，登录状态变化时也会调用
  async function hydrateTodos(): Promise<void> {
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      if (!auth.isAuthenticated) {
        hydrationScope.value = "guest";
        isHydrated.value = true;
        todos.value = [];
        return;
      }

      if (hydrationScope.value === "auth" && isHydrated.value) return;

      await fetchTodos();
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
        todos.value = [];
        return;
      }

      if (hydrationScope.value !== "auth") {
        void hydrateTodos();
      }
    },
    { immediate: true },
  );

  async function addTodo(payload: CreateTodoPayload) {
    try {
      const todo = await todoService.addTodo(payload);
      if (todo) todos.value.unshift(todo);
    } catch (err) {
      console.error(err);
      notifier.error("添加待办失败");
    }
  }

  async function toggleTodo(id: string) {
    const t = todos.value.find((x) => x.id === id);
    if (!t) return;
    try {
      const updated = await todoService.updateTodo(id, { completed: !t.completed });
      const idx = todos.value.findIndex((x) => x.id === id);
      if (idx !== -1 && updated) todos.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("更新待办失败");
    }
  }

  async function removeTodo(id: string) {
    try {
      await todoService.removeTodo(id);
      todos.value = todos.value.filter((t) => t.id !== id);
    } catch (err) {
      console.error(err);
      notifier.error("删除待办失败");
    }
  }

  async function updateTodo(id: string, patch: Partial<Todo>) {
    try {
      const updated = await todoService.updateTodo(id, patch);
      const idx = todos.value.findIndex((x) => x.id === id);
      if (idx !== -1 && updated) todos.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("更新待办失败");
    }
  }

  async function clearCompleted() {
    try {
      await todoService.batchAction("clearCompleted");
      todos.value = todos.value.filter((t) => !t.completed);
    } catch (err) {
      console.error(err);
      notifier.error("清除已完成待办失败");
    }
  }

  async function archiveTodo(id: string) {
    try {
      const updated = await todoService.updateTodo(id, { archived: true });
      const idx = todos.value.findIndex((x) => x.id === id);
      if (idx !== -1 && updated) todos.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("归档待办失败");
    }
  }

  async function unarchiveTodo(id: string) {
    try {
      const updated = await todoService.updateTodo(id, { archived: false });
      const idx = todos.value.findIndex((x) => x.id === id);
      if (idx !== -1 && updated) todos.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("取消归档失败");
    }
  }

  async function archiveCompleted() {
    try {
      await todoService.batchAction("archiveCompleted");
      const now = new Date().toISOString();
      todos.value = todos.value.map((t) =>
        t.completed && !t.archived ? { ...t, archived: true, archivedAt: now } : t,
      );
    } catch (err) {
      console.error(err);
      notifier.error("归档已完成待办失败");
    }
  }

  return {
    todos,
    nonArchivedTodos,
    isCollapsed,
    completedCount,
    activeTodos,
    completedTodos,
    archivedTodos,
    addTodo,
    toggleTodo,
    removeTodo,
    updateTodo,
    clearCompleted,
    archiveTodo,
    unarchiveTodo,
    archiveCompleted,
    hydrateTodos,
  };
});
