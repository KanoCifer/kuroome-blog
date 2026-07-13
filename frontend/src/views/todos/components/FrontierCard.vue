<template>
  <article
    class="bg-background border-border group cursor-pointer rounded-xl border p-4 shadow-[0_1px_1px_color-mix(in_oklch,var(--ink)_6%,transparent),0_6px_14px_color-mix(in_oklch,var(--ink)_10%,transparent),0_18px_32px_color-mix(in_oklch,var(--ink)_8%,transparent)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_2px_color-mix(in_oklch,var(--ink)_7%,transparent),0_10px_22px_color-mix(in_oklch,var(--ink)_12%,transparent),0_24px_40px_color-mix(in_oklch,var(--ink)_10%,transparent)]"
    role="button"
    tabindex="0"
    @click="$emit('open', task.id)"
    @keydown.enter="$emit('open', task.id)"
  >
    <!-- badges -->
    <div class="mb-2 flex flex-wrap items-center gap-1">
      <TypeBadge :type="task.type" />
      <PriorityBadge :priority="task.priority" />
      <span
        v-if="task.scope"
        class="text-muted-foreground border-border rounded-full border px-1.5 py-px text-[10px]"
      >
        {{ task.scope }}
      </span>
      <span
        v-if="task.slug"
        class="bg-primary/10 text-primary rounded-full px-1.5 py-px text-[10px] font-medium"
      >
        {{ task.slug }}
      </span>
    </div>

    <!-- title -->
    <p class="text-foreground text-sm font-medium">{{ task.title }}</p>

    <!-- description -->
    <p
      v-if="task.description"
      class="text-muted-foreground mt-1 line-clamp-2 text-xs"
    >
      {{ task.description }}
    </p>

    <!-- footer -->
    <div class="mt-3 flex items-center justify-between gap-2">
      <span
        v-if="task.due_date"
        class="flex items-center gap-1 text-[10px]"
        :class="overdue(task.due_date) ? 'text-destructive' : 'text-muted-foreground'"
      >
        <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 1 1 0 0 0 0-2H6z"
            clip-rule="evenodd"
          />
        </svg>
        {{ task.due_date }}
      </span>
      <span v-else class="flex-1" />

      <!-- actions (reveal on hover) -->
      <div
        class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <button
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
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { DevTask } from '@/api/devtask';
import TypeBadge from './TypeBadge.vue';
import PriorityBadge from './PriorityBadge.vue';

defineProps<{ task: DevTask }>();
defineEmits<{
  open: [id: string];
  cycle: [id: string];
  delete: [id: string];
}>();

function overdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}
</script>
