<template>
  <li
    class="bg-muted/40 border-border/50 hover:border-border group rounded-lg border p-3 transition-colors"
    :class="{ 'opacity-60': done }"
  >
    <!-- 类型 + 优先级 badges -->
    <div class="mb-1.5 flex flex-wrap items-center gap-1">
      <span
        class="rounded-full border px-1.5 py-px text-[10px] font-medium"
        :class="typeCls"
      >
        {{ task.type }}
      </span>
      <span
        class="rounded-full border px-1.5 py-px text-[10px] font-medium"
        :class="priorityCls"
      >
        {{ task.priority }}
      </span>
    </div>

    <!-- 标题 -->
    <p
      class="text-sm leading-snug font-medium"
      :class="done ? 'text-muted-foreground line-through' : 'text-foreground'"
    >
      {{ task.title }}
    </p>

    <!-- 描述 -->
    <p
      v-if="task.description"
      class="text-muted-foreground mt-1 line-clamp-2 text-xs"
    >
      {{ task.description }}
    </p>

    <!-- 底部：截止日 + 操作 -->
    <div class="mt-2 flex items-center justify-between gap-2">
      <span
        v-if="task.due_date"
        class="flex items-center gap-1 text-[10px]"
        :class="overdue(task.due_date) ? 'text-destructive' : 'text-muted-foreground'"
      >
        <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 1 1 0 000-2H6z"
            clip-rule="evenodd"
          />
        </svg>
        {{ task.due_date }}
      </span>
      <span v-else class="flex-1" />

      <!-- 操作按钮 (hover 显示) -->
      <div
        class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        <button
          v-if="!done"
          @click="$emit('cycle-status', task.id)"
          class="text-muted-foreground hover:bg-muted hover:text-primary cursor-pointer rounded-md p-1 transition-colors"
          title="推进状态"
          aria-label="推进状态"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
        <button
          @click="$emit('delete-task', task.id)"
          class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md p-1 transition-colors"
          title="删除"
          aria-label="删除"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
</template>

<script setup lang="ts">
import type { DevTask, DevTaskPriority, DevTaskType } from '@/api/devtask';

const props = withDefaults(
  defineProps<{
    task: DevTask;
    done?: boolean;
  }>(),
  { done: false },
);

defineEmits<{
  'cycle-status': [id: string];
  'delete-task': [id: string];
}>();

const TYPE_CLASS: Record<DevTaskType, string> = {
  '问题': 'border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-400',
  '功能需求': 'border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-400',
  '优化': 'border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400',
  '技术债': 'border-purple-200 bg-purple-50/60 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/30 dark:text-purple-400',
};

const PRIORITY_CLASS: Record<DevTaskPriority, string> = {
  'P0 紧急': 'border-destructive/40 bg-destructive/10 text-destructive',
  'P1 高': 'border-orange-200 bg-orange-50/60 text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/30 dark:text-orange-400',
  'P2 中': 'border-border text-muted-foreground',
  'P3 低': 'border-border text-muted-foreground/70',
};

const typeCls = TYPE_CLASS[props.task.type] ?? 'border-border text-muted-foreground';
const priorityCls = PRIORITY_CLASS[props.task.priority] ?? 'border-border text-muted-foreground';

function overdue(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today ? 'text-destructive' : 'text-muted-foreground';
}
</script>
