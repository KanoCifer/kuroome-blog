<template>
  <span
    class="rounded-full border px-1.5 py-px text-[10px] font-medium"
    :class="cls"
  >
    {{ priority }}
  </span>
</template>

<script setup lang="ts">
import type { DevTaskPriority } from '@/api/devtask';

const props = defineProps<{ priority: DevTaskPriority }>();

const PRIORITY_CLASS: Record<DevTaskPriority, string> = {
  'P0 紧急': 'border-destructive/40 bg-destructive/10 text-destructive',
  'P1 高':
    'border-orange-200 bg-orange-50/60 text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/30 dark:text-orange-400',
  'P2 中': 'border-border text-muted-foreground',
  'P3 低': 'border-border text-muted-foreground/70',
};

const cls =
  PRIORITY_CLASS[props.priority] ?? 'border-border text-muted-foreground';
</script>
