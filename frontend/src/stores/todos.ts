import { defineStore } from "pinia";
import { ref, computed } from "vue";
import request from "@/request";
import { useNotificationStore } from "@/stores/notification";
import { useStorage } from "@vueuse/core";

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
}

export const useTodoStore = defineStore("todos", () => {
  const todos = ref<Todo[]>([]);
  const isCollapsed = useStorage("todos-collapsed", false);
  const isHydrated = ref(false);

  const completedCount = computed(
    () => todos.value.filter((t) => t.completed).length,
  );
  const activeTodos = computed(() => todos.value.filter((t) => !t.completed));
  const completedTodos = computed(() => todos.value.filter((t) => t.completed));

  const notifier = useNotificationStore();

  async function fetchTodos() {
    try {
      const res = await request.get("/todos");
      todos.value = res.data.data?.todos ?? [];
      isHydrated.value = true;
    } catch (err) {
      console.error("fetchTodos error", err);
      notifier.error("加载待办事项失败");
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
    if (isHydrated.value) return;
    await fetchTodos();
    await importLocalTodosIfAny();
  }

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

  return {
    todos,
    isCollapsed,
    completedCount,
    activeTodos,
    completedTodos,
    addTodo,
    toggleTodo,
    removeTodo,
    updateTodo,
    clearCompleted,
    hydrateTodos,
  };
});
