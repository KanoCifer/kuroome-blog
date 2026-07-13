<template>
  <div
    class="bg-background border-border group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-[box-shadow] duration-200 hover:shadow-[0_1px_1px_color-mix(in_oklch,var(--ink)_6%,transparent),0_6px_14px_color-mix(in_oklch,var(--ink)_10%,transparent)]"
    role="button"
    tabindex="0"
    @click="$emit('open', task.id)"
    @keydown.enter="$emit('open', task.id)"
  >
    <span
      class="text-foreground min-w-0 flex-1 truncate text-sm font-medium"
      :class="{ 'text-muted-foreground line-through opacity-70': done }"
    >
      {{ task.title }}
    </span>

    <span class="flex shrink-0 items-center gap-1.5">
      <TypeBadge :type="task.type" />
      <PriorityBadge :priority="task.priority" />
      <KindBadge v-if="task.kind === 'subtask'" :kind="task.kind" />
    </span>

    <span
      v-if="task.due_date"
      class="text-muted-foreground shrink-0 text-[10px] tabular-nums"
    >
      {{ task.due_date }}
    </span>

    <span
      class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
    >
      <button
        v-if="!done"
        class="text-muted-foreground hover:bg-muted hover:text-primary cursor-pointer rounded-md p-1 transition-colors"
        title="推进状态"
        aria-label="推进状态"
        @click.stop="$emit('cycle', task.id)"
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
        class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md p-1 transition-colors"
        title="删除"
        aria-label="删除"
        @click.stop="$emit('delete', task.id)"
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
    </span>
  </div>
</template>

<script setup lang="ts">
import type { DevTask } from '@/api/devtask';
import TypeBadge from './TypeBadge.vue';
import PriorityBadge from './PriorityBadge.vue';
import KindBadge from './KindBadge.vue';

withDefaults(
  defineProps<{
    task: DevTask;
    done?: boolean;
  }>(),
  { done: false },
);

defineEmits<{
  open: [id: string];
  cycle: [id: string];
  delete: [id: string];
}>();
</script>
