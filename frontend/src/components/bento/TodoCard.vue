<template>
  <BentoCard
    :initial="{ scale: 0.5, opacity: 0 }"
    :animate="{ scale: 1, opacity: 1 }"
    class="group/card relative flex h-full flex-col overflow-hidden p-0!"
  >
    <!-- Inner wrapper -->
    <div class="flex h-full flex-col p-6">
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between">
        <h3
          class="text-foreground dark:text-foreground text-sm font-semibold tracking-wide"
        >
          {{ title }}
        </h3>
        <div class="flex items-center gap-2">
          <span
            v-if="!isCollapsed && todos.length > 0"
            class="text-muted-foreground dark:text-muted-foreground text-xs font-medium"
          >
            {{ completedCount }} / {{ todos.length }}
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

      <!-- Collapsible Content -->
      <div class="contents">
        <!-- List area -->
        <div class="no-scrollbar mx-3 flex-1 overflow-y-auto">
          <div
            v-for="todo in todos.slice(0, 3)"
            :key="todo.id"
            class="group flex items-start gap-3 py-2.5"
          >
            <!-- Checkbox -->
            <div
              class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-200"
              :class="
                todo.completed
                  ? 'border-primary bg-primary dark:border-primary dark:bg-primary'
                  : 'border-border group-hover:border-foreground/30 dark:border-border dark:group-hover:border-foreground/30'
              "
            >
              <svg
                v-if="todo.completed"
                class="text-primary-foreground dark:text-primary-foreground h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <!-- Text -->
            <span
              class="text-sm leading-tight transition-colors duration-200 select-none"
              :class="
                todo.completed
                  ? 'text-muted-foreground dark:text-muted-foreground line-through'
                  : 'text-foreground dark:text-foreground'
              "
            >
              {{ todo.text }}
            </span>
          </div>

          <!-- Empty state -->
          <div
            v-if="todos.length === 0"
            class="text-muted-foreground dark:text-muted-foreground flex h-full flex-col items-center justify-center py-6"
          >
            <span class="text-sm font-medium tracking-wide"
              >所有任务已完成</span
            >
          </div>
        </div>
      </div>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import { useTodoStore } from "@/stores/todos";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useTodoDrawer } from "@/composables/useTodoDrawer";
import BentoCard from "./BentoCard.vue";

interface Props {
  title?: string;
}

withDefaults(defineProps<Props>(), {
  title: "待办事项",
});

const todoStore = useTodoStore();
const {
  nonArchivedTodos: todos,
  completedCount,
  isCollapsed,
} = storeToRefs(todoStore);

const todoDrawer = useTodoDrawer();

onMounted(() => {
  todoStore.hydrateTodos();
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
