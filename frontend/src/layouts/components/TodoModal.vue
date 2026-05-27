<template>
  <!-- Floating trigger button -->
  <Teleport to="body">
    <div class="fixed right-4 bottom-24 z-50">
      <button
        @click="toggleDrawer"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        title="开发任务"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
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
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100"
        >
          任务
        </span>
      </button>
    </div>
  </Teleport>

  <!-- Right drawer -->
  <Teleport to="body">
    <transition
      enter-active-class="transition-all duration-500 ease-out transform-gpu"
      enter-from-class="opacity-0 translate-x-full"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-300 ease-in transform-gpu"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-full"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-9999 flex justify-end"
        @click.self="close"
      >
        <div
          class="bg-card dark:bg-card relative z-10 flex h-full w-full max-w-md flex-col rounded-l-2xl shadow-2xl"
        >
          <!-- Header -->
          <div
            class="border-border flex shrink-0 items-center justify-between border-b px-6 py-4"
          >
            <h3
              class="text-foreground flex items-center gap-2 font-serif text-lg font-bold"
            >
              开发任务
              <span class="text-muted-foreground text-sm font-normal">{{ tasks.length }}</span>
            </h3>
            <button
              @click="close"
              class="text-muted-foreground hover:bg-accent hover:text-secondary-foreground dark:hover:bg-accent dark:hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <!-- Collapsed add button -->
            <button
              v-if="!showAddForm"
              @click="showAddForm = true"
              class="border-border/60 bg-card/60 hover:border-primary/30 mb-5 flex w-full cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm text-gray-400 shadow-sm transition-all hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                class="h-4 w-4"
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
              添加任务...
            </button>

            <!-- Expanded add form -->
            <div
              v-else
              class="border-border/60 bg-card/60 mb-5 overflow-hidden rounded-2xl border p-4 shadow-sm"
            >
              <input
                v-model="newTaskForm.title"
                ref="addTitleInput"
                type="text"
                placeholder="任务标题..."
                class="placeholder:text-muted-foreground text-foreground w-full border-none bg-transparent px-1 py-1 text-base font-medium outline-none focus:ring-0"
                @keyup.enter="submitCreateTask"
              />
              <div class="mt-3 space-y-3">
                <textarea
                  v-model="newTaskForm.description"
                  placeholder="描述... (可选)"
                  rows="2"
                  class="border-border bg-card/80 focus:border-primary focus:bg-card focus:ring-primary/15 w-full resize-none rounded-xl border p-2.5 text-sm transition-all outline-none focus:ring-4"
                ></textarea>
                <div class="flex items-center gap-3">
                  <select
                    v-model="newTaskForm.priority"
                    class="border-border bg-card text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
                  >
                    <option value="low">低</option>
                    <option value="default">默认</option>
                    <option value="low">低</option>
                    <option value="high">高</option>
                  </select>
                  <input
                    v-model="newTaskForm.dueDate"
                    type="date"
                    class="border-border bg-card text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
                  />
                  <div class="ml-auto flex gap-2">
                    <button
                      @click="cancelAdd"
                      class="bg-muted text-foreground hover:bg-accent cursor-pointer rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
                    >
                      取消
                    </button>
                    <button
                      @click="submitCreateTask"
                      :disabled="!newTaskForm.title.trim()"
                      class="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-xl px-4 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      添加
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Three status sections -->
            <div
              v-for="section in sections"
              :key="section.status"
              class="mb-5"
            >
              <!-- Section header -->
              <div class="mb-2 flex items-center gap-2 px-1">
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  :class="section.dotClass"
                ></span>
                <h4 class="text-foreground text-sm font-semibold">
                  {{ section.title }}
                </h4>
                <span
                  class="text-muted-foreground rounded-full bg-black/5 px-2 py-0.5 text-xs tabular-nums dark:bg-white/10"
                >
                  {{ section.tasks.length }}
                </span>
              </div>

              <!-- Cards -->
              <TransitionGroup
                tag="div"
                class="space-y-2.5"
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
                move-class="transition-transform duration-300"
              >
                <DevTaskCard
                  v-for="task in section.tasks"
                  :key="task.id"
                  :task="task"
                  @cycle-status="todoStore.cycleStatus"
                  @delete-task="todoStore.deleteTask"
                  @update-task="(id: string, patch: Partial<DevTask>) => todoStore.updateTask(id, patch)"
                />
              </TransitionGroup>

              <!-- Empty -->
              <p
                v-if="section.tasks.length === 0"
                class="py-4 text-center text-xs text-gray-400"
              >
                {{ section.emptyText }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import DevTaskCard from "@/views/todos/components/DevTaskCard.vue";
import { useTodoDrawer } from "@/composables/useTodoDrawer";
import type { DevTask, DevTaskPriority } from "@/service/todoService/types";
import { useTodoStore } from "@/stores/todos";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";

const todoStore = useTodoStore();
const { tasks, todoItems, inProgressItems, doneItems } = storeToRefs(todoStore);

const { isOpen, close, toggle } = useTodoDrawer();
const toggleDrawer = toggle;

const addTitleInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  todoStore.hydrateTasks();
});

// Three sections (vertically stacked in drawer)
const sections = computed(() => [
  {
    status: "in-progress" as const,
    title: "开发中",
    tasks: inProgressItems.value,
    dotClass: "bg-amber-500",
    emptyText: "没有开发中任务",
  },
  {
    status: "todo" as const,
    title: "待办",
    tasks: todoItems.value,
    dotClass: "bg-blue-500",
    emptyText: "没有待开发任务",
  },
  {
    status: "done" as const,
    title: "已完成",
    tasks: doneItems.value.slice(0, 8),
    dotClass: "bg-emerald-500",
    emptyText: "没有已完成任务",
  },
]);

// Add form (collapsed by default)
const showAddForm = ref(false);

const newTaskForm = ref({
  title: "",
  description: "",
  dueDate: "",
  priority: "default" as DevTaskPriority,
});

const submitCreateTask = () => {
  if (!newTaskForm.value.title.trim()) return;
  todoStore.createTask({
    title: newTaskForm.value.title.trim(),
    description: newTaskForm.value.description.trim() || undefined,
    dueDate: newTaskForm.value.dueDate || undefined,
    priority: newTaskForm.value.priority,
  });
  newTaskForm.value = { title: "", description: "", dueDate: "", priority: "default" };
  showAddForm.value = false;
};

const cancelAdd = () => {
  newTaskForm.value = { title: "", description: "", dueDate: "", priority: "default" };
  showAddForm.value = false;
};
</script>
