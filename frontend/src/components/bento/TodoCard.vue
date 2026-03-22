<template>
  <BentoCard
    :initial="{ scale: 0.5, opacity: 0 }"
    :animate="{ scale: 1, opacity: 1 }"
    drag
    :whileDrag="{ scale: 0.9 }"
    class="group/card relative flex h-full cursor-grab flex-col overflow-hidden p-0!"
  >
    <!-- Inner wrapper for custom background & padding -->
    <div
      class="flex h-full flex-col bg-linear-to-br from-emerald-50/50 to-teal-50/50 p-6 dark:from-emerald-950/20 dark:to-teal-950/20"
    >
      <!-- Header -->
      <div class="mb-5 flex items-center justify-between">
        <h3
          class="flex items-center gap-2 text-lg font-bold text-emerald-900 dark:text-emerald-100"
        >
          <svg
            class="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {{ title }}
          <span
            v-if="isCollapsed"
            class="ml-1 text-xs font-normal text-emerald-500/70 dark:text-emerald-400/70"
          >
            ({{ completedCount }}/{{ todos.length }})
          </span>
        </h3>
        <div class="flex items-center gap-2">
          <RouterLink
            to="/todos"
            class="cursor-pointer rounded-xl p-1.5 text-emerald-600 outline-0 transition-colors hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
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
          </RouterLink>
          <span
            v-if="!isCollapsed"
            class="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/60 dark:text-emerald-300"
          >
            {{ completedCount }} / {{ todos.length }}
          </span>
          <button
            @click="isCollapsed = !isCollapsed"
            class="cursor-pointer rounded-xl p-1.5 text-emerald-600 outline-0 transition-colors hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
            :title="isCollapsed ? '展开' : '折叠'"
          >
            <motion.svg
              :animate="{ rotate: isCollapsed ? 180 : 0 }"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
          </button>
        </div>
      </div>

      <!-- Collapsible Content -->
      <AnimatePresence>
        <motion.div v-show="!isCollapsed" class="contents">
          <!-- List area -->
          <div class="custom-scrollbar min-h-37.5 flex-1 overflow-y-auto pr-1">
            <AnimatePresence>
              <motion.div
                v-for="todo in todos"
                :key="todo.id"
                :initial="{ opacity: 0, y: -10, scale: 0.95 }"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :exit="{
                  opacity: 0,
                  scale: 0.9,
                  transition: { duration: 0.2 },
                }"
                layout
                class="group mb-2.5 flex items-center rounded-2xl border border-emerald-100/50 bg-white/80 p-3.5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md dark:border-emerald-900/30 dark:bg-gray-800/80 dark:hover:border-emerald-800"
              >
                <div class="flex flex-1 items-center gap-3 overflow-hidden">
                  <!-- Checkbox -->
                  <div
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300"
                    :class="
                      todo.completed
                        ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-600 dark:bg-emerald-600'
                        : 'border-emerald-300 dark:border-emerald-700'
                    "
                  >
                    <svg
                      v-if="todo.completed"
                      class="h-3 w-3 text-white"
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
                    class="truncate text-sm transition-all duration-300 select-none"
                    :class="
                      todo.completed
                        ? 'text-emerald-400/70 line-through dark:text-emerald-600/70'
                        : 'font-medium text-gray-700 dark:text-gray-200'
                    "
                  >
                    {{ todo.text }}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>

            <!-- Empty state -->
            <motion.div
              v-if="todos.length === 0"
              :initial="{ opacity: 0 }"
              :animate="{ opacity: 1 }"
              class="flex flex-col items-center justify-center py-8 text-emerald-400 dark:text-emerald-700/70"
            >
              <svg
                class="mb-2 h-12 w-12 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <span class="text-sm font-medium">太棒了！所有任务都已完成</span>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import { useTodoStore } from "@/stores/todos";
import { storeToRefs } from "pinia";
import { AnimatePresence, motion } from "motion-v";
import { RouterLink } from "vue-router";
import BentoCard from "./BentoCard.vue";
import { onMounted } from "vue";

interface Props {
  title?: string;
}

withDefaults(defineProps<Props>(), {
  title: "待办事项",
});

const todoStore = useTodoStore();
const { todos, completedCount, isCollapsed } = storeToRefs(todoStore);

onMounted(() => {
  todoStore.hydrateTodos();
});
</script>

<style scoped>
/* 自定义滚动条样式 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #a7f3d0; /* emerald-200 */
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #064e3b; /* emerald-900 */
}
</style>
