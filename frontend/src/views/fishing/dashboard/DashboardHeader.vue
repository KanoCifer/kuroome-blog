<script setup lang="ts">
/**
 * Dashboard 顶部 sticky header。
 *
 * 替换原 view 里散落的 header + 右下角 FAB:
 * - 标题 + kanocifer slug
 * - 右侧 AI 分析按钮 (替代右下 FAB,统一浮层入口)
 */
import { Bot } from '@lucide/vue';

defineProps<{
  analysisOpen: boolean;
  analysisHasData: boolean;
}>();

defineEmits<{
  (e: 'toggle-analysis'): void;
}>();
</script>

<template>
  <header
    class="border-border/40 bg-background/80 top-0 z-30 border-b backdrop-blur-sm"
  >
    <div
      class="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6"
    >
      <div class="flex items-baseline gap-3">
        <h1 class="text-foreground font-serif text-xl text-wrap-balance">
          钓鱼地图
        </h1>
        <span
          class="text-muted-foreground font-serif text-xs tracking-[0.2em] italic"
        >
          ka·no·ci·fer
        </span>
      </div>

      <button
        class="border-border bg-background hover:bg-muted text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
        :class="analysisOpen ? 'border-primary text-primary bg-primary/5' : ''"
        type="button"
        :aria-pressed="analysisOpen"
        @click="$emit('toggle-analysis')"
      >
        <span class="relative inline-flex">
          <Bot class="h-4 w-4" aria-hidden="true" />
          <span
            v-if="analysisHasData && !analysisOpen"
            class="bg-success ring-card absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full ring-2"
            aria-hidden="true"
          />
        </span>
        <span class="hidden sm:inline">AI 分析</span>
      </button>
    </div>
  </header>
</template>
