<template>
  <section
    role="listitem"
    class="bg-surface/40 smooth-shadow-ring flex max-h-[calc(100dvh-10rem)] min-h-96 flex-col overflow-hidden overscroll-contain rounded-[28px] border p-3 shadow-md transition-colors contain-[layout_paint_scroll_style]"
    :class="
      dragOver ? 'border-accent/60 bg-accent/5 ring-accent/30 ring-1' : ''
    "
    @dragover.prevent="$emit('dragover')"
    @dragleave="$emit('dragleave')"
    @drop.prevent="$emit('drop')"
  >
    <!-- 列头 -->
    <header class="mb-2 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span
          class="h-2 w-2 rounded-full"
          :class="column.dotClass"
          aria-hidden="true"
        />
        <h3 class="text-ink font-serif text-sm font-medium tracking-tight">
          {{ column.label }}
        </h3>
        <span
          class="text-muted bg-page rounded-full px-1.5 py-px text-[10px] tabular-nums"
        >
          {{ tasks.length }}
        </span>
      </div>
    </header>

    <!-- 卡片扁平直出：没有泳道分组，也没有 JS 窗口化。
         离屏卡片的跳过交给卡片自身的 `content-visibility: auto` +
         `contain-intrinsic-size` —— 浏览器侧的跳过比手写测量 + translateY 更便宜，
         而且不会因为估算高度失准在滚动中抖动。 -->
    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      <KanbanCard
        v-for="task in tasks"
        :key="task.slug"
        :task="task"
        :is-dragging="draggedSlug === task.slug"
        @open="$emit('open', task.slug)"
        @cycle="$emit('cycle', task.slug)"
        @delete="$emit('delete', task.slug)"
        @dragstart="$emit('dragstart', task.slug)"
        @dragend="$emit('dragend')"
      />

      <Transition name="fade-fast">
        <div
          v-if="!tasks.length"
          class="text-muted/60 flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-center text-xs"
        >
          <template v-if="dragOver">
            <span class="font-serif text-sm">松开以放置</span>
          </template>
          <template v-else>
            <svg
              class="text-muted/30 h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span class="font-serif text-sm">此列暂无任务</span>
            <span class="text-muted/50">从待办拖一个过来</span>
          </template>
        </div>
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DevTask } from '@/features/todos/api';
import type { KanbanColumn } from '@/features/todos/composables/devTaskPolicy';
import KanbanCard from './KanbanCard.vue';

defineProps<{
  column: KanbanColumn;
  /** 本列任务（store 侧已按 sort_order 升序）；卡片数即 `tasks.length`。 */
  tasks: DevTask[];
  /** 拖拽状态 —— 由父组件 KanbanPanel 持有并下发。 */
  draggedSlug: string | null;
  dragOver: boolean;
}>();

defineEmits<{
  open: [slug: string];
  cycle: [slug: string];
  delete: [slug: string];
  dragstart: [slug: string];
  dragend: [];
  dragover: [];
  dragleave: [];
  drop: [];
}>();
</script>

<style scoped>
/* ── Empty-state fade (FADE_FAST: 0.18s ease-in, 0.12s ease-out) ── */
.fade-fast-enter-active {
  opacity: 0;
  animation: ffi-opacity-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.fade-fast-leave-active {
  animation: ffi-opacity-out 0.12s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes ffi-opacity-in {
  to {
    opacity: 1;
  }
}
@keyframes ffi-opacity-out {
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-fast-enter-active,
  .fade-fast-leave-active {
    animation-duration: 0.01ms;
  }
}
</style>
