import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import request from "@/request";
import { useNotificationStore } from "@/stores/notification";
import { useStorage } from "@vueuse/core";
import { useAuthStore } from "@/stores/auth";

export type TodoPriority = "low" | "medium" | "high";

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  description?: string;
  dueDate?: string;
  priority: TodoPriority;
  category?: string;
  archived?: boolean;
  archivedAt?: string;
}

export const useTodoStore = defineStore("todos", () => {
  const todos = ref<Todo[]>([]);
  const isCollapsed = useStorage("todos-collapsed", false);
  const isHydrated = ref(false);
  const hydrationScope = ref<"guest" | "auth" | null>(null);
  const auth = useAuthStore();
  let hydrationPromise: Promise<void> | null = null;

  const nonArchivedTodos = computed(() =>
    todos.value.filter((t) => !t.archived),
  );
  const completedCount = computed(
    () => nonArchivedTodos.value.filter((t) => t.completed).length,
  );
  const activeTodos = computed(() =>
    nonArchivedTodos.value.filter((t) => !t.completed),
  );
  const completedTodos = computed(() =>
    nonArchivedTodos.value.filter((t) => t.completed),
  );
  const archivedTodos = computed(() => todos.value.filter((t) => t.archived));

  const notifier = useNotificationStore();

  async function fetchTodos() {
    try {
      const res = await request.get("/todos");
      todos.value = res.data.data?.todos ?? [];
      return true;
    } catch (err) {
      console.error("fetchTodos error", err);
      notifier.error("加载待办事项失败");
      return false;
    }
  }

  async function importLocalTodosIfAny() {
    try {
      const raw = localStorage.getItem("todos");
      if (!raw) return;
      const localTodos: Todo[] = JSON.parse(raw) || [];
      if (!localTodos.length) {
        localStorage.removeItem("todos");
        return;
      }
      const serverRes = await request.get("/todos");
      const serverTodos = serverRes.data.data?.todos ?? [];
      if (serverTodos.length === 0) {
        await request.post("/todos/import", localTodos);
        localStorage.removeItem("todos");
        await fetchTodos();
        notifier.success("本地待办已同步到服务器");
      }
    } catch (err) {
      console.warn("Failed to import local todos (non-fatal):", err);
    }
  }

  async function hydrateTodos() {
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      if (!auth.isAuthenticated) {
        hydrationScope.value = "guest";
        isHydrated.value = true;
        todos.value = [];
        return;
      }

      if (hydrationScope.value === "auth" && isHydrated.value) return;

      const loaded = await fetchTodos();
      if (loaded) {
        await importLocalTodosIfAny();
      }
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

  async function addTodo(payload: {
    text: string;
    description?: string;
    dueDate?: string;
    priority?: TodoPriority;
    category?: string;
  }) {
    try {
      const res = await request.post("/todos", payload);
      const todo = res.data.data.todo;
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
      const res = await request.patch(`/todos/${id}`, {
        completed: !t.completed,
      });
      const updated = res.data.data.todo;
      const idx = todos.value.findIndex((x) => x.id === id);
      if (idx !== -1) todos.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("更新待办失败");
    }
  }

  async function removeTodo(id: string) {
    try {
      await request.delete(`/todos/${id}`);
      todos.value = todos.value.filter((t) => t.id !== id);
    } catch (err) {
      console.error(err);
      notifier.error("删除待办失败");
    }
  }

  async function updateTodo(id: string, patch: Partial<Todo>) {
    try {
      const res = await request.put(`/todos/${id}`, patch);
      const updated = res.data.data.todo;
      const idx = todos.value.findIndex((x) => x.id === id);
      if (idx !== -1) todos.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("更新待办失败");
    }
  }

  async function clearCompleted() {
    try {
      await request.post("/todos/clear-completed");
      todos.value = todos.value.filter((t) => !t.completed);
    } catch (err) {
      console.error(err);
      notifier.error("清除已完成待办失败");
    }
  }

  async function archiveTodo(id: string) {
    try {
      const res = await request.post(`/todos/${id}/archive`);
      const updated = res.data.data.todo;
      const idx = todos.value.findIndex((x) => x.id === id);
      if (idx !== -1) todos.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("归档待办失败");
    }
  }

  async function unarchiveTodo(id: string) {
    try {
      const res = await request.post(`/todos/${id}/unarchive`);
      const updated = res.data.data.todo;
      const idx = todos.value.findIndex((x) => x.id === id);
      if (idx !== -1) todos.value[idx] = updated;
    } catch (err) {
      console.error(err);
      notifier.error("取消归档失败");
    }
  }

  async function archiveCompleted() {
    try {
      await request.post("/todos/archive-completed");
      const now = new Date().toISOString();
      todos.value = todos.value.map((t) =>
        t.completed && !t.archived
          ? { ...t, archived: true, archivedAt: now }
          : t,
      );
    } catch (err) {
      console.error(err);
      notifier.error("归档已完成待办失败");
    }
  }

  async function fetchArchivedTodos() {
    try {
      const res = await request.get("/todos/archived");
      return res.data.data?.todos ?? [];
    } catch (err) {
      console.error(err);
      notifier.error("加载归档待办失败");
      return [];
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
    fetchArchivedTodos,
    hydrateTodos,
  };
});
