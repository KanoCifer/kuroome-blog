<template>
  <div class="space-y-4">
    <!-- filter bar -->
    <div
      class="bg-muted flex flex-wrap items-center gap-2 rounded-xl px-4 py-3"
      role="group"
      aria-label="筛选条件"
    >
      <span
        class="text-muted-foreground text-[10px] font-medium tracking-widest uppercase"
        >类型</span
      >
      <button
        v-for="t in TASK_TYPES"
        :key="t"
        class="rounded-full border px-2.5 py-0.5 text-xs transition-colors"
        :class="
          filterType.has(t)
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground'
        "
        :aria-pressed="filterType.has(t)"
        @click="toggleFilter('type', t)"
      >
        {{ t }}
      </button>

      <span class="bg-border mx-1 h-4 w-px" />

      <span
        class="text-muted-foreground text-[10px] font-medium tracking-widest uppercase"
        >优先级</span
      >
      <button
        v-for="p in PRIORITIES"
        :key="p"
        class="rounded-full border px-2.5 py-0.5 text-xs transition-colors"
        :class="
          filterPriority.has(p)
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground'
        "
        :aria-pressed="filterPriority.has(p)"
        @click="toggleFilter('priority', p)"
      >
        {{ p }}
      </button>

      <span class="text-muted-foreground ml-auto text-xs tabular-nums">
        {{ filteredPlanning.length }} 项
      </span>
    </div>

    <!-- table -->
    <div class="border-border overflow-hidden rounded-xl border">
      <div
        class="text-muted-foreground bg-muted border-border grid grid-cols-[2fr_1fr_1fr_1fr_100px_32px] gap-4 border-b px-4 py-2.5 text-[10px] font-medium tracking-widest uppercase max-sm:grid-cols-[1fr_80px_32px]"
      >
        <span>标题</span>
        <span class="max-sm:hidden">类型</span>
        <span class="max-sm:hidden">优先级</span>
        <span class="max-sm:hidden">范围</span>
        <span class="max-sm:hidden">状态</span>
        <span></span>
      </div>

      <div
        v-for="task in filteredPlanning"
        :key="task.slug"
        class="hover:bg-muted/40 border-border grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_100px_32px] items-center gap-4 border-t px-4 py-2.5 transition-colors max-sm:grid-cols-[1fr_80px_32px]"
        role="button"
        tabindex="0"
        @click="$emit('open', task.slug)"
        @keydown.enter="$emit('open', task.slug)"
      >
        <span class="text-foreground truncate text-sm font-medium">{{
          task.title
        }}</span>
        <span class="max-sm:hidden">
          <TypeBadge :type="task.type" />
        </span>
        <span class="max-sm:hidden">
          <PriorityBadge :priority="task.priority" />
        </span>
        <span class="text-muted-foreground truncate text-sm max-sm:hidden">
          {{ task.scope || '—' }}
        </span>
        <span class="max-sm:hidden">
          <StatusChip :status="task.status" />
        </span>
        <span class="flex justify-end">
          <button
            type="button"
            class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring cursor-pointer rounded-md p-2 transition-[color,transform] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none active:scale-[0.96] active:not-focus-visible:ring-0"
            title="删除"
            aria-label="删除"
            @click.stop="$emit('delete', task.slug)"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
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

      <div
        v-if="!filteredPlanning.length"
        class="text-muted-foreground/70 px-4 py-8 text-center text-sm"
      >
        没有匹配的任务
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useV3DevTaskStore } from '@/stores/v3devtasks';
import type { DevTaskPriority, DevTaskType } from '@/api/devtask';
import TypeBadge from './TypeBadge.vue';
import PriorityBadge from './PriorityBadge.vue';
import StatusChip from './StatusChip.vue';

const store = useV3DevTaskStore();

const TASK_TYPES: DevTaskType[] = ['功能需求', '问题', '优化', '技术债'];
const PRIORITIES: DevTaskPriority[] = ['P0 紧急', 'P1 高', 'P2 中', 'P3 低'];

const filterType = ref<Set<DevTaskType>>(new Set());
const filterPriority = ref<Set<DevTaskPriority>>(new Set());

const filteredPlanning = computed(() =>
  store.tasks
    .filter((t) => !t.is_deleted && t.status !== '已完成')
    .filter((t) =>
      filterType.value.size ? filterType.value.has(t.type) : true,
    )
    .filter((t) =>
      filterPriority.value.size ? filterPriority.value.has(t.priority) : true,
    ),
);

function toggleFilter(
  key: 'type' | 'priority',
  val: DevTaskType | DevTaskPriority,
) {
  if (key === 'type') {
    const set = filterType.value;
    if (set.has(val as DevTaskType)) set.delete(val as DevTaskType);
    else set.add(val as DevTaskType);
  } else {
    const set = filterPriority.value;
    if (set.has(val as DevTaskPriority)) set.delete(val as DevTaskPriority);
    else set.add(val as DevTaskPriority);
  }
}

defineEmits<{
  open: [slug: string];
  delete: [slug: string];
}>();
</script>
