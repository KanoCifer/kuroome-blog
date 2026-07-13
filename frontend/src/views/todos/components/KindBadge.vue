<template>
  <span class="rounded-full border px-1.5 py-px text-[10px] font-medium" :class="cls">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import type { DevTaskKind } from '@/api/devtask';

const props = defineProps<{ kind?: DevTaskKind | '' | null }>();

// 空串 / null = spec（老文档兜底）
const normalized: DevTaskKind = props.kind === 'subtask' ? 'subtask' : 'spec';

// spec 用中性色（默认，弱化）；subtask 用 primary 强调它是可执行单元
const KIND_CLASS: Record<DevTaskKind, string> = {
  spec: 'border-border text-muted-foreground',
  subtask: 'border-primary/30 bg-primary/5 text-primary',
};

const cls = KIND_CLASS[normalized];
const label = normalized === 'subtask' ? '子任务' : '规格';
</script>
