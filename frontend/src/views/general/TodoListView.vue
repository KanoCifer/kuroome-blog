<template>
  <div class="min-h-screen">
    <!-- Title Section -->
    <div
      class="relative -z-5 mx-0 mt-60 flex flex-col items-center justify-center bg-transparent"
      :style="titleStyle"
    >
      <div>
        <h1
          class="max-w-6xl text-center font-serif text-7xl text-gray-50 max-sm:text-3xl"
        >
          待办事项
        </h1>
        <div
          class="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400"
        >
          <span
            class="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            管理个人待办事项和任务清单
          </span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="relative mt-36">
      <div
        :style="sectionStyle"
        class="absolute left-1/2 -z-5 h-full -translate-x-1/2 rounded-t-[40px] bg-blue-50 dark:bg-slate-900"
      ></div>

      <div class="mx-auto max-w-3xl px-4 pt-24 pb-20">
        <!-- Add Todo Form -->
        <div
          class="mb-8 overflow-hidden rounded-3xl border border-gray-200/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl transition-all dark:border-gray-800 dark:bg-gray-900/60"
        >
          <input
            v-model="newTodoForm.text"
            type="text"
            placeholder="添加新待办..."
            class="w-full rounded-xl border-none bg-transparent px-2 py-2 text-lg font-medium outline-none placeholder:text-gray-400 focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
            @keyup.enter="submitAddTodo"
          />

          <div class="mt-4 space-y-4 px-2">
            <textarea
              v-model="newTodoForm.description"
              placeholder="添加描述... (可选)"
              rows="2"
              class="w-full resize-none rounded-xl border border-gray-100 bg-white/80 p-3 text-sm transition-all outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-300 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
            ></textarea>

            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <label
                  class="text-sm font-medium text-gray-500 dark:text-gray-400"
                  >优先级</label
                >
                <select
                  v-model="newTodoForm.priority"
                  class="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>

              <div class="flex items-center gap-2">
                <label
                  class="text-sm font-medium text-gray-500 dark:text-gray-400"
                  >截止日期</label
                >
                <input
                  v-model="newTodoForm.dueDate"
                  type="date"
                  class="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>

              <div class="ml-auto">
                <button
                  @click="submitAddTodo"
                  :disabled="!newTodoForm.text.trim()"
                  class="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-5 py-2 font-medium text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>添加</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters & Stats -->
        <div
          class="mb-6 flex flex-wrap items-center justify-between gap-4 px-2"
        >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in filterTabs"
              :key="f"
              class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300"
              :class="[
                filter === f
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800',
              ]"
              @click="filter = f"
            >
              {{ filterLabels[f] }} ({{ getFilterCount(f) }})
            </button>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400"
              >排序:</span
            >
            <select
              v-model="sortMode"
              class="cursor-pointer rounded-lg border border-gray-200 bg-white/50 px-3 py-1.5 text-sm font-medium backdrop-blur-sm outline-none dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200"
            >
              <option value="createdAt">创建时间</option>
              <option value="priority">优先级</option>
              <option value="dueDate">截止日期</option>
            </select>
          </div>
        </div>

        <!-- Todo List -->
        <TransitionGroup
          tag="ul"
          class="relative space-y-4"
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-300 ease-in absolute w-full"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
          move-class="transition-transform duration-500"
        >
          <li
            v-for="todo in displayTodos"
            :key="todo.id"
            class="group relative flex flex-col gap-4 rounded-2xl border border-gray-200/60 bg-white/50 p-5 shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60"
            :class="[todo.archived ? 'opacity-70' : '']"
          >
            <div v-if="editingId === todo.id" class="w-full space-y-4">
              <!-- Edit Mode -->
              <input
                v-model="editingForm.text"
                class="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-lg font-medium outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <textarea
                v-model="editingForm.description"
                rows="2"
                class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              ></textarea>
              <div class="flex flex-wrap items-center gap-4">
                <select
                  v-model="editingForm.priority"
                  class="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
                <input
                  type="date"
                  v-model="editingForm.dueDate"
                  class="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <div class="ml-auto flex gap-2">
                  <button
                    @click="cancelEdit"
                    class="cursor-pointer rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    取消
                  </button>
                  <button
                    @click="saveEdit"
                    class="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="flex w-full items-start gap-4">
              <!-- View Mode -->
              <button
                class="mt-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 transition-all duration-300"
                :class="[
                  todo.completed
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 hover:border-blue-400 dark:border-gray-600',
                ]"
                @click="todoStore.toggleTodo(todo.id)"
              >
                <svg
                  v-if="todo.completed"
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-3">
                  <h3
                    class="text-lg font-medium break-words transition-all duration-300"
                    :class="[
                      todo.completed
                        ? 'text-gray-400 line-through'
                        : 'text-gray-900 dark:text-gray-100',
                    ]"
                  >
                    {{ todo.text }}
                  </h3>

                  <!-- Badges -->
                  <span
                    class="rounded-full border px-2 py-0.5 text-xs font-medium"
                    :class="{
                      'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400':
                        todo.priority === 'low',
                      'border-yellow-200 bg-yellow-50 text-yellow-600 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-400':
                        todo.priority === 'medium',
                      'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400':
                        todo.priority === 'high',
                    }"
                  >
                    {{ priorityLabels[todo.priority] }}
                  </span>

                  <span
                    v-if="todo.dueDate"
                    class="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                    :class="
                      isOverdue(todo.dueDate) && !todo.completed
                        ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'
                        : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    "
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    {{ todo.dueDate }}
                  </span>
                </div>

                <p
                  v-if="todo.description"
                  class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400"
                  :class="[todo.completed ? 'opacity-60' : '']"
                >
                  {{ todo.description }}
                </p>

                <div class="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  创建于 {{ formatDate(todo.createdAt) }}
                </div>
              </div>

              <!-- Actions -->
              <div
                class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-sm:opacity-100"
              >
                <button
                  v-if="!todo.archived"
                  @click="todoStore.archiveTodo(todo.id)"
                  class="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                  title="归档"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                </button>
                <button
                  v-if="todo.archived"
                  @click="todoStore.unarchiveTodo(todo.id)"
                  class="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                  title="取消归档"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                </button>
                <button
                  @click="startEdit(todo)"
                  class="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                  title="编辑"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  @click="todoStore.removeTodo(todo.id)"
                  class="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="删除"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </li>
        </TransitionGroup>

        <!-- Empty State -->
        <div v-if="displayTodos.length === 0" class="mt-20 text-center">
          <div
            class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100 dark:bg-gray-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h3 class="text-xl font-medium text-gray-900 dark:text-gray-100">
            {{ filter === "archived" ? "暂无归档" : "暂无事项" }}
          </h3>
          <p class="mt-2 text-gray-500">
            {{
              filter === "archived"
                ? "归档的任务会显示在这里"
                : "记录下你接下来的计划吧！"
            }}
          </p>
        </div>

        <!-- Clear / Archive Completed -->
        <div
          v-if="todoStore.completedCount > 0"
          class="mt-8 flex justify-center gap-3"
        >
          <button
            @click="todoStore.archiveCompleted()"
            class="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-amber-50 hover:text-amber-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            归档已完成 ({{ todoStore.completedCount }})
          </button>
          <button
            @click="todoStore.clearCompleted()"
            class="flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            清除已完成 ({{ todoStore.completedCount }})
          </button>
        </div>

        <!-- Back Home -->
        <div class="mt-16 text-center">
          <RouterLink
            to="/"
            class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回首页
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScroll } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useTodoStore } from "@/stores/todos";
import type { Todo, TodoPriority } from "@/stores/todos";

const { y } = useScroll(window);

const titleStyle = computed(() => ({
  transform: `translateY(${y.value * 0.4}px)`,
}));

const sectionStyle = computed(() => {
  const scale = Math.min(1, 0.95 + y.value * 0.0005);
  return {
    width: `${100 * scale}%`,
  };
});

const todoStore = useTodoStore();
const { todos, activeTodos, completedTodos, archivedTodos } =
  storeToRefs(todoStore);

// Form State
const newTodoForm = ref({
  text: "",
  description: "",
  dueDate: "",
  priority: "medium" as TodoPriority,
});

const submitAddTodo = () => {
  if (!newTodoForm.value.text.trim()) return;
  todoStore.addTodo({
    text: newTodoForm.value.text.trim(),
    description: newTodoForm.value.description.trim() || undefined,
    dueDate: newTodoForm.value.dueDate || undefined,
    priority: newTodoForm.value.priority,
  });
  newTodoForm.value = {
    text: "",
    description: "",
    dueDate: "",
    priority: "medium",
  };
};

// Filter & Sort State
type FilterType = "all" | "active" | "completed" | "archived";
const filterTabs: FilterType[] = ["all", "active", "completed", "archived"];
const filter = ref<FilterType>("all");
const sortMode = ref<"createdAt" | "priority" | "dueDate">("createdAt");

const filterLabels: Record<FilterType, string> = {
  all: "全部",
  active: "进行中",
  completed: "已完成",
  archived: "归档",
};

const priorityLabels: Record<TodoPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

const getFilterCount = (f: FilterType) => {
  if (f === "all") return todos.value.length;
  if (f === "active") return activeTodos.value.length;
  if (f === "completed") return completedTodos.value.length;
  if (f === "archived") return archivedTodos.value.length;
  return 0;
};

const displayTodos = computed(() => {
  let list = todos.value;
  if (filter.value === "active") list = activeTodos.value;
  else if (filter.value === "completed") list = completedTodos.value;
  else if (filter.value === "archived") list = archivedTodos.value;

  const priorityWeight: Record<TodoPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...list].sort((a, b) => {
    if (sortMode.value === "priority") {
      const wA = priorityWeight[a.priority || "medium"];
      const wB = priorityWeight[b.priority || "medium"];
      if (wA !== wB) return wB - wA; // descending: high -> low
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortMode.value === "dueDate") {
      if (!a.dueDate && !b.dueDate)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    // createdAt
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

// Edit State
const editingId = ref<string | null>(null);
const editingForm = ref({
  text: "",
  description: "",
  dueDate: "",
  priority: "medium" as TodoPriority,
});

const startEdit = (todo: Todo) => {
  editingId.value = todo.id;
  editingForm.value = {
    text: todo.text,
    description: todo.description || "",
    dueDate: todo.dueDate || "",
    priority: todo.priority || "medium",
  };
};

const saveEdit = () => {
  if (editingId.value && editingForm.value.text.trim()) {
    todoStore.updateTodo(editingId.value, {
      text: editingForm.value.text.trim(),
      description: editingForm.value.description.trim() || undefined,
      dueDate: editingForm.value.dueDate || undefined,
      priority: editingForm.value.priority,
    });
  }
  editingId.value = null;
};

const cancelEdit = () => {
  editingId.value = null;
};

// Utils
const isOverdue = (dateStr?: string) => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return due < today;
};

const formatDate = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoString;
  }
};
</script>

<style scoped>
.squircle {
  mask-image: paint(squircle);
}
</style>
