<template>
  <AnimatePresence>
    <BentoCard
      :initial="{ scale: 0.5, opacity: 0 }"
      :animate="{ scale: 1, opacity: 1 }"
      :exit="{ scale: 0.5, opacity: 0, transition: { duration: 0.5 } }"
      :drag="!useDeviceStore().isMobile"
      :whileDrag="{ scale: 0.9 }"
      class="group/card relative flex h-full cursor-grab flex-col overflow-hidden p-0!"
    >
      <!-- Inner wrapper -->
      <div class="flex h-full flex-col p-6">
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">
            {{ title }}
          </h3>
          <div class="flex items-center gap-2">
            <span v-if="!isCollapsed && todos.length > 0" class="text-xs font-medium text-gray-500 dark:text-gray-400">
              {{ completedCount }} / {{ todos.length }}
            </span>
            <RouterLink
              to="/todos"
              class="cursor-pointer rounded-md p-1 text-gray-400 outline-0 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              title="查看详情"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </RouterLink>
            <button
              v-if="hideable"
              @click="emit('hide')"
              class="cursor-pointer rounded-md p-1 text-gray-400 outline-0 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              title="隐藏待办卡片"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Collapsible Content -->
        <div class="contents">
          <!-- List area -->
          <div class="no-scrollbar mx-3 flex-1 overflow-y-auto">
            <div v-for="todo in todos.slice(0, 3)" :key="todo.id" class="group flex items-start gap-3 py-2.5">
              <!-- Checkbox -->
              <div
                class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-200"
                :class="
                  todo.completed
                    ? 'border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100'
                    : 'border-gray-300 group-hover:border-gray-400 dark:border-gray-700 dark:group-hover:border-gray-500'
                "
              >
                <svg
                  v-if="todo.completed"
                  class="h-3 w-3 text-white dark:text-gray-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <!-- Text -->
              <span
                class="text-sm leading-tight transition-colors duration-200 select-none"
                :class="
                  todo.completed ? 'text-gray-400 line-through dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
                "
              >
                {{ todo.text }}
              </span>
            </div>

            <!-- Empty state -->
            <div
              v-if="todos.length === 0"
              class="flex h-full flex-col items-center justify-center py-6 text-gray-400 dark:text-gray-600"
            >
              <span class="text-sm font-medium tracking-wide">所有任务已完成</span>
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { useDeviceStore } from "@/stores/device";
import { useTodoStore } from "@/stores/todos";
import { AnimatePresence } from "motion-v";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { RouterLink } from "vue-router";
import BentoCard from "./BentoCard.vue";

interface Props {
  title?: string;
  hideable?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: "待办事项",
  hideable: false,
});

const emit = defineEmits<{
  hide: [];
}>();

const todoStore = useTodoStore();
const { nonArchivedTodos: todos, completedCount, isCollapsed } = storeToRefs(todoStore);

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
