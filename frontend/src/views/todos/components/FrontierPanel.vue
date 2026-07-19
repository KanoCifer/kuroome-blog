<template>
  <div class="space-y-8">
    <!-- frontier cards -->
    <section>
      <div class="mb-3 flex items-baseline justify-between">
        <h2
          class="text-foreground font-serif text-lg font-medium tracking-tight"
        >
          现在能做什么
        </h2>
        <span class="text-muted-foreground text-xs">
          无阻塞 · 按优先级与截止日排序
        </span>
      </div>

      <div
        v-if="frontierTasks.length"
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <FrontierCard
          v-for="task in frontierTasks"
          :key="task.slug"
          :task="task"
          @open="$emit('open', $event)"
          @cycle="$emit('cycle', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
      <div
        v-else
        class="text-muted-foreground/70 flex flex-col items-center justify-center py-10 text-center"
      >
        <svg
          class="text-muted-foreground/30 mb-2 h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p class="text-sm font-medium">所有任务都已推进或还在阻塞中</p>
        <p class="text-xs">等待前置任务完成，或新建一个独立任务</p>
      </div>
    </section>

    <!-- in progress -->
    <section>
      <div class="mb-3 flex items-baseline justify-between">
        <h2
          class="text-foreground font-serif text-lg font-medium tracking-tight"
        >
          进行中
        </h2>
        <span class="text-muted-foreground text-xs">正在推进的任务</span>
      </div>
      <div v-if="inProgressTasks.length" class="space-y-2">
        <TaskRow
          v-for="task in inProgressTasks"
          :key="task.slug"
          :task="task"
          @open="$emit('open', $event)"
          @cycle="$emit('cycle', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
      <div
        v-else
        class="text-muted-foreground/70 flex items-center justify-center py-6 text-sm"
      >
        暂无进行中的任务
      </div>
    </section>

    <!-- done this week -->
    <section>
      <div class="mb-3 flex items-baseline justify-between">
        <h2
          class="text-foreground font-serif text-lg font-medium tracking-tight"
        >
          本周已完成
        </h2>
        <span class="text-muted-foreground text-xs">最近关闭的任务</span>
      </div>
      <div v-if="doneThisWeek.length" class="space-y-2">
        <TaskRow
          v-for="task in doneThisWeek"
          :key="task.slug"
          :task="task"
          :done="true"
          @open="$emit('open', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
      <div
        v-else
        class="text-muted-foreground/70 flex items-center justify-center py-6 text-sm"
      >
        本周还没有完成的任务
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FrontierCard from './FrontierCard.vue';
import TaskRow from './TaskRow.vue';
import { useV3DevTaskStore } from '@/stores/v3devtasks';
import {
  frontier,
  inProgress,
  completedThisWeek,
} from '@/composables/todo';

const store = useV3DevTaskStore();

const frontierTasks = computed(() => frontier(store.tasks));
const inProgressTasks = computed(() => inProgress(store.tasks));
const doneThisWeek = computed(() => completedThisWeek(store.tasks));

defineEmits<{
  open: [slug: string];
  cycle: [slug: string];
  delete: [slug: string];
}>();
</script>
