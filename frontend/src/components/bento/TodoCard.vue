<template>
  <BentoCard
    :initial="{ scale: 0.5, opacity: 0 }"
    :animate="{ scale: 1, opacity: 1 }"
    class="group/card relative flex h-full flex-col overflow-hidden p-0!"
  >
    <div class="flex h-full flex-col p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3
          class="text-foreground dark:text-foreground text-sm font-semibold tracking-wide"
        >
          {{ title }}
        </h3>
        <div class="flex items-center gap-2">
          <span
            v-if="!isCollapsed && tasks.length > 0"
            class="text-muted-foreground dark:text-muted-foreground text-xs font-medium"
          >
            {{ doneCount }} / {{ tasks.length }}
          </span>
          <button
            @click="todoDrawer.open()"
            class="text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-accent dark:hover:text-foreground cursor-pointer rounded-md p-1 outline-0 transition-colors"
            title="查看详情"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="contents">
        <div class="no-scrollbar mx-3 flex-1 overflow-y-auto">
          <div
            v-for="task in tasks.slice(0, 3)"
            :key="task.id"
            class="group flex items-start gap-3 py-2.5"
          >
            <!-- Status cycle button -->
            <button
              class="mt-0.5 shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium transition-colors duration-200 border"
              :class="statusBadgeClass(task.status)"
              @click.stop="todoStore.cycleStatus(task.id)"
            >
              {{ STATUS_LABELS[task.status] }}
            </button>

            <!-- Title -->
            <span
              class="text-sm leading-tight transition-colors duration-200 select-none"
              :class="
                task.status === 'done'
                  ? 'text-muted-foreground dark:text-muted-foreground line-through'
                  : 'text-foreground dark:text-foreground'
              "
            >
              {{ task.title }}
            </span>
          </div>

          <div
            v-if="tasks.length === 0"
            class="text-muted-foreground dark:text-muted-foreground flex h-full flex-col items-center justify-center py-6"
          >
            <span class="text-sm font-medium tracking-wide"
              >暂无开发任务</span
            >
          </div>
        </div>
      </div>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import { useTodoStore, STATUS_LABELS } from "@/stores/todos";
import type { DevTaskStatus } from "@/service/todoService/types";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useTodoDrawer } from "@/composables/useTodoDrawer";
import BentoCard from "./BentoCard.vue";

interface Props {
  title?: string;
}

withDefaults(defineProps<Props>(), {
  title: "开发任务",
});

const todoStore = useTodoStore();
const {
  tasks,
  doneCount,
  isCollapsed,
} = storeToRefs(todoStore);

const todoDrawer = useTodoDrawer();

function statusBadgeClass(status: DevTaskStatus): string {
  const map: Record<DevTaskStatus, string> = {
    todo: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "in-progress": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return map[status];
}

onMounted(() => {
  todoStore.hydrateTasks();
});
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
