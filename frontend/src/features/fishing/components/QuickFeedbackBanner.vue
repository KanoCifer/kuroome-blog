<script setup lang="ts">
/**
 * Quick feedback banner —— "钓完了？告诉我们今天实际如何"。
 *
 * 放在 dashboard 顶部 (Map / Index 之上),没有 routeInfo 时显示。
 * 不再用 warning 色调,改成 muted + 主按钮,跟 dashboard 网格协调。
 */
import { SlideFadeTransition } from '@/components';

defineProps<{
  disabled?: boolean;
}>();

defineEmits<{
  (e: 'submit'): void;
}>();
</script>

<template>
  <SlideFadeTransition enter-from-class="opacity-0 -translate-y-1" leave-to-class="opacity-0 -translate-y-1">
    <section
      v-if="!disabled"
      class="border-border bg-muted/30 flex flex-col items-start gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div>
        <p class="text-foreground font-family-averia text-base italic">
          钓完了？告诉我们今天实际如何
        </p>
        <p class="text-muted-foreground mt-0.5 text-sm">
          三个问题，三十秒——您的反馈会帮系统下次更准
        </p>
      </div>
      <button
        v-if="!disabled"
        class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
        type="button"
        @click="$emit('submit')"
      >
        反馈今日指数
      </button>
    </section>
  </SlideFadeTransition>
</template>
