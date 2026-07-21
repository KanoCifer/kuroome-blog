<template>
  <div class="space-y-8">
    <!-- stat cards -->
    <section>
      <div class="mb-3 flex items-baseline justify-between">
        <h2
          class="text-foreground font-serif text-lg font-medium tracking-tight"
        >
          本周概览
        </h2>
        <span class="text-muted-foreground text-xs">{{ weekRange }}</span>
      </div>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="border-border bg-background rounded-3xl border px-5 py-4 shadow-[0_1px_1px_color-mix(in_oklch,var(--ink)_6%,transparent),0_6px_14px_color-mix(in_oklch,var(--ink)_10%,transparent),0_18px_32px_color-mix(in_oklch,var(--ink)_8%,transparent)]"
        >
          <div
            class="text-muted-foreground text-[10px] font-medium tracking-widest uppercase"
          >
            {{ stat.label }}
          </div>
          <div
            class="text-foreground font-family-averia mt-1 text-3xl leading-none font-normal tracking-tight"
          >
            {{ stat.value }}
          </div>
          <div class="mt-1 text-xs" :class="stat.deltaClass">
            {{ stat.delta }}
          </div>
        </div>
      </div>
    </section>

    <!-- type distribution -->
    <section>
      <div class="mb-3 flex items-baseline justify-between">
        <h2
          class="text-foreground font-serif text-lg font-medium tracking-tight"
        >
          类型分布
        </h2>
        <span class="text-muted-foreground text-xs">全部任务</span>
      </div>
      <div class="space-y-3">
        <div
          v-for="row in distributionRows"
          :key="row.type"
          class="flex items-center gap-3"
        >
          <span class="text-foreground w-16 shrink-0 text-sm">{{
            row.type
          }}</span>
          <div class="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
              class="h-full rounded-full transition-transform duration-400"
              :style="{
                width: '100%',
                transform: `scaleX(${row.pct / 100})`,
                backgroundColor: row.color,
                transformOrigin: 'left',
              }"
            />
          </div>
          <span
            class="text-muted-foreground w-6 shrink-0 text-right text-xs tabular-nums"
            >{{ row.count }}</span
          >
        </div>
      </div>
    </section>

    <!-- completed timeline -->
    <section>
      <div class="mb-3 flex items-baseline justify-between">
        <h2
          class="text-foreground font-serif text-lg font-medium tracking-tight"
        >
          最近完成
        </h2>
        <span class="text-muted-foreground text-xs">按完成时间倒序</span>
      </div>
      <div class="space-y-0">
        <div
          v-for="task in doneThisWeek.slice(0, 8)"
          :key="task.slug"
          class="flex gap-3 border-t px-1 py-3"
        >
          <div
            class="mt-2 h-2 w-2 shrink-0 rounded-full"
            style="background: var(--success)"
          />
          <div
            class="min-w-0 flex-1 cursor-pointer"
            @click="$emit('open', task.slug)"
          >
            <p
              class="text-muted-foreground truncate text-sm font-medium line-through"
            >
              {{ task.title }}
            </p>
            <p class="text-muted-foreground/60 text-[11px] tabular-nums">
              {{ (task.updated_at ?? '').slice(0, 10) }}
            </p>
          </div>
        </div>
        <div
          v-if="!doneThisWeek.length"
          class="text-muted-foreground/70 px-1 py-6 text-center text-sm"
        >
          本周还没有完成的任务
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useV3DevTaskStore } from '@/features/todos/stores/v3devtasks';
import {
  completedThisWeek,
  inProgress,
  urgentActive,
  typeDistribution,
} from '@/features/todos/composables';
import { formatCurrentWeekRange } from '@/lib/dayjs';
import type { DevTaskType } from '@/features/todos/api';

const store = useV3DevTaskStore();

const TYPE_COLORS: Record<DevTaskType, string> = {
  功能需求: 'var(--chart-1)',
  问题: 'var(--chart-4)',
  优化: 'var(--chart-5)',
  技术债: 'var(--chart-2)',
};

const doneThisWeek = computed(() => completedThisWeek(store.tasks));
const weekRange = formatCurrentWeekRange();

const stats = computed(() => [
  {
    label: '本周完成',
    value: doneThisWeek.value.length,
    delta: '较上周 +2',
    deltaClass: 'text-success',
  },
  {
    label: '累计任务',
    value: store.tasks.filter((t) => !t.is_deleted).length,
    delta: '全部生命周期',
    deltaClass: 'text-muted-foreground',
  },
  {
    label: '进行中',
    value: inProgress(store.tasks).length,
    delta: '需要跟进',
    deltaClass: 'text-muted-foreground',
  },
  {
    label: 'P0 紧急',
    value: urgentActive(store.tasks),
    delta: '需要关注',
    deltaClass: 'text-destructive',
  },
]);

const distributionRows = computed(() => {
  const dist = typeDistribution(store.tasks);
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  return (Object.keys(dist) as DevTaskType[]).map((type) => ({
    type,
    count: dist[type],
    pct: (dist[type] / total) * 100,
    color: TYPE_COLORS[type],
  }));
});

defineEmits<{
  open: [slug: string];
}>();
</script>
