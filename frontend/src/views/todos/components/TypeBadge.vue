<template>
  <span class="rounded-full border px-1.5 py-px text-[10px] font-medium" :class="cls">
    {{ type }}
  </span>
</template>

<script setup lang="ts">
import type { DevTaskType } from '@/api/devtask';

const props = defineProps<{ type: DevTaskType }>();

const TYPE_CLASS: Record<DevTaskType, string> = {
  '问题': 'border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-400',
  '功能需求': 'border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-400',
  '优化': 'border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400',
  '技术债': 'border-purple-200 bg-purple-50/60 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/30 dark:text-purple-400',
};

const cls = TYPE_CLASS[props.type] ?? 'border-border text-muted-foreground';
</script>
