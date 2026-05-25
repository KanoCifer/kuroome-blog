<template>
  <BasicDetail title="开发任务" subtitle="网站开发需求和实现清单">
    <div class="col-span-full mx-auto w-full max-w-7xl px-4">
      <!-- Board -->
      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div
          v-for="col in columns"
          :key="col.status"
          class="flex min-h-[60vh] flex-col rounded-2xl p-4"
          :class="col.bgClass"
        >
          <!-- Column header -->
          <div class="mb-4 flex shrink-0 items-center gap-2">
            <span
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              :class="col.dotClass"
            ></span>
            <h3 class="text-foreground text-sm font-semibold">
              {{ col.title }}
            </h3>
            <span
              class="text-muted-foreground rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium tabular-nums dark:bg-white/10"
            >
              {{ col.tasks.length }}
            </span>
          </div>

          <!-- Task cards -->
          <div class="flex-1 space-y-3 overflow-y-auto">
            <TransitionGroup
              tag="div"
              class="space-y-3"
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
              move-class="transition-transform duration-300"
            >
              <DevTaskCard
                v-for="task in col.tasks"
                :key="task.id"
                :task="task"
                @cycle-status="todoStore.cycleStatus"
                @delete-task="todoStore.deleteTask"
                @update-task="(id, patch) => todoStore.updateTask(id, patch)"
              />
            </TransitionGroup>

            <!-- Empty state -->
            <div
              v-if="col.tasks.length === 0"
              class="flex flex-col items-center justify-center py-12 text-center"
            >
              <p class="text-muted-foreground text-sm">
                {{ col.emptyText }}
              </p>
            </div>
          </div>

          <!-- Quick add -->
          <div class="border-border/50 mt-3 shrink-0 border-t pt-3">
            <button
              v-if="addingToStatus !== col.status"
              @click="startAdd(col.status)"
              class="text-muted-foreground hover:text-foreground hover:bg-accent flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors"
            >
              <svg
                class="h-3.5 w-3.5"
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
              添加
            </button>
            <div v-else class="space-y-2">
              <input
                v-model="quickAddForm.title"
                ref="quickAddInput"
                type="text"
                :placeholder="`添加${col.title}任务...`"
                class="border-border bg-card focus:border-primary text-foreground w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
                @keyup.enter="submitQuickAdd"
                @keyup.escape="cancelQuickAdd"
              />
              <div class="flex items-center gap-1.5">
                <button
                  @click="cancelQuickAdd"
                  class="text-muted-foreground hover:bg-accent cursor-pointer rounded-md px-2 py-1 text-xs transition-colors"
                >
                  取消
                </button>
                <button
                  @click="submitQuickAdd"
                  :disabled="!quickAddForm.title.trim()"
                  class="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import BasicDetail from "@/components/basic/BasicDetail.vue";
import DevTaskCard from "@/components/DevTaskCard.vue";
import type { DevTaskStatus } from "@/service/todoService/types";
import { useTodoStore } from "@/stores/todos";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, ref } from "vue";

const todoStore = useTodoStore();
const { todoItems, inProgressItems, doneItems } = storeToRefs(todoStore);

const quickAddInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  todoStore.hydrateTasks();
});

// Column definitions
const columns = computed(() => [
  {
    status: "todo" as const,
    title: "待办",
    tasks: todoItems.value,
    bgClass: "bg-blue-50 dark:bg-blue-950",
    dotClass: "bg-blue-500",
    emptyText: "没有待开发任务",
  },
  {
    status: "in-progress" as const,
    title: "开发中",
    tasks: inProgressItems.value,
    bgClass: "bg-amber-50 dark:bg-amber-950",
    dotClass: "bg-amber-500",
    emptyText: "没有开发中任务",
  },
  {
    status: "done" as const,
    title: "已完成",
    tasks: doneItems.value,
    bgClass: "bg-emerald-50 dark:bg-emerald-950",
    dotClass: "bg-emerald-500",
    emptyText: "没有已完成任务",
  },
]);

// Quick add
const addingToStatus = ref<DevTaskStatus | null>(null);
const quickAddForm = ref({ title: "" });

const startAdd = async (status: DevTaskStatus) => {
  addingToStatus.value = status;
  quickAddForm.value.title = "";
  await nextTick();
  quickAddInput.value?.focus();
};

const submitQuickAdd = () => {
  const title = quickAddForm.value.title.trim();
  if (!title || !addingToStatus.value) return;
  todoStore.createTask({ title, status: addingToStatus.value });
  addingToStatus.value = null;
};

const cancelQuickAdd = () => {
  addingToStatus.value = null;
};
</script>
