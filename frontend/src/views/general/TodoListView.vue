<template>
  <BasicDetail title="待办事项" subtitle="管理个人待办事项和任务清单">
    <div class="col-span-full mx-auto max-w-3xl px-4">
      <!-- Add Todo Form -->
      <div
        class="border-border/60 bg-card/60 mb-8 overflow-hidden rounded-3xl border p-6 shadow-sm backdrop-blur-xl transition-all"
      >
        <input
          v-model="newTodoForm.text"
          type="text"
          placeholder="添加新待办..."
          class="placeholder:text-muted-foreground text-foreground w-full rounded-xl border-none bg-transparent px-2 py-2 text-lg font-medium outline-none focus:ring-0"
          @keyup.enter="submitAddTodo"
        />

        <div class="mt-4 space-y-4 px-2">
          <textarea
            v-model="newTodoForm.description"
            placeholder="添加描述... (可选)"
            rows="2"
            class="border-border bg-card/80 focus:border-primary focus:bg-card focus:ring-primary/15 w-full resize-none rounded-xl border p-3 text-sm transition-all outline-none focus:ring-4"
          ></textarea>

          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-muted-foreground text-sm font-medium"
                >优先级</label
              >
              <select
                v-model="newTodoForm.priority"
                class="border-border bg-card text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label class="text-muted-foreground text-sm font-medium"
                >截止日期</label
              >
              <input
                v-model="newTodoForm.dueDate"
                type="date"
                class="border-border bg-card text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
              />
            </div>

            <div class="ml-auto">
              <button
                @click="submitAddTodo"
                :disabled="!newTodoForm.text.trim()"
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4 px-2">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="f in filterTabs"
            :key="f"
            class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300"
            :class="[
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent',
            ]"
            @click="filter = f"
          >
            {{ filterLabels[f] }} ({{ getFilterCount(f) }})
          </button>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-muted-foreground text-sm font-medium">排序:</span>
          <select
            v-model="sortMode"
            class="border-border bg-card/50 text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium backdrop-blur-sm outline-none"
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
          class="group bg-card/50 border-border/60 hover:border-border relative flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md"
          :class="[todo.archived ? 'opacity-70' : '']"
        >
          <div v-if="editingId === todo.id" class="w-full space-y-4">
            <!-- Edit Mode -->
            <input
              v-model="editingForm.text"
              class="border-border bg-card focus:border-primary text-foreground w-full rounded-xl border px-4 py-2 text-lg font-medium outline-none"
            />
            <textarea
              v-model="editingForm.description"
              rows="2"
              class="focus:border-primary border-border bg-card text-foreground w-full resize-none rounded-xl border px-4 py-2 text-sm outline-none"
            ></textarea>
            <div class="flex flex-wrap items-center gap-4">
              <select
                v-model="editingForm.priority"
                class="border-border bg-card text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
              <input
                type="date"
                v-model="editingForm.dueDate"
                class="border-border bg-card text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
              />
              <div class="ml-auto flex gap-2">
                <button
                  @click="cancelEdit"
                  class="bg-muted text-foreground hover:bg-accent cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  @click="saveEdit"
                  class="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors"
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
                  ? 'border-primary bg-primary'
                  : 'hover:border-primary border-gray-300 dark:border-gray-600',
              ]"
              @click="todoStore.toggleTodo(todo.id)"
            >
              <svg
                v-if="todo.completed"
                xmlns="http://www.w3.org/2000/svg"
                class="text-primary-foreground h-4 w-4"
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
                  class="text-lg font-medium wrap-break-word transition-all duration-300"
                  :class="[
                    todo.completed
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground',
                  ]"
                >
                  {{ todo.text }}
                </h3>

                <!-- Badges -->
                <span
                  class="rounded-full border px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'border-primary/20 bg-primary/10 text-primary':
                      todo.priority === 'low',
                    'border-warning/20 bg-warning/10 text-warning':
                      todo.priority === 'medium',
                    'border-destructive/20 bg-destructive/10 text-destructive':
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
                      ? 'border-destructive/20 bg-destructive/10 text-destructive'
                      : 'border-border bg-muted text-muted-foreground'
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
                class="text-muted-foreground mt-2 line-clamp-2 text-sm"
                :class="[todo.completed ? 'opacity-60' : '']"
              >
                {{ todo.description }}
              </p>

              <div class="text-muted-foreground mt-3 text-xs">
                创建于 {{ formatDate(todo.createdAt) }}
              </div>
            </div>

            <!-- Actions -->
            <div
              class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            >
              <button
                v-if="!todo.archived"
                @click="todoStore.archiveTodo(todo.id)"
                class="text-muted-foreground hover:bg-warning/10 hover:text-warning cursor-pointer rounded-lg p-2 transition-colors"
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
                class="text-muted-foreground hover:bg-success/10 hover:text-success cursor-pointer rounded-lg p-2 transition-colors"
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
                class="text-muted-foreground hover:bg-accent hover:text-primary cursor-pointer rounded-lg p-2 transition-colors"
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
                class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-lg p-2 transition-colors"
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
          class="bg-muted mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="text-muted-foreground h-10 w-10"
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
        <h3 class="text-foreground text-xl font-medium">
          {{ filter === "archived" ? "暂无归档" : "暂无事项" }}
        </h3>
        <p class="text-muted-foreground mt-2">
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
          class="bg-muted text-muted-foreground hover:bg-warning/10 hover:text-warning flex cursor-pointer items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-all"
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
          class="bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex cursor-pointer items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-all"
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
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import BasicDetail from "@/components/basic/BasicDetail.vue";
import type { Todo, TodoPriority } from "@/service/todoService/types";
import { useTodoStore } from "@/stores/todos";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";

const todoStore = useTodoStore();
const { nonArchivedTodos, activeTodos, completedTodos, archivedTodos } =
  storeToRefs(todoStore);

onMounted(() => {
  todoStore.hydrateTodos();
});

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
  if (f === "all") return nonArchivedTodos.value.length;
  if (f === "active") return activeTodos.value.length;
  if (f === "completed") return completedTodos.value.length;
  if (f === "archived") return archivedTodos.value.length;
  return 0;
};

const displayTodos = computed(() => {
  let list = nonArchivedTodos.value;
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
