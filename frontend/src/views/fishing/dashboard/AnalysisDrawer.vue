<script setup lang="ts">
/**
 * AI 智能分析侧边抽屉。
 *
 * 替换原本右下角 FAB + popover 浮层组合:
 * - 桌面/移动统一从右侧滑入,40 vw 宽度
 * - 点击 backdrop 或 ✕ 关闭
 * - 与 Map 的路线浮层在视觉上彻底分离 (一个底部、一个右侧)
 */
import WeatherAnalysis from '@/components/ai/WeatherAnalysis.vue';
import type { WeatherAnalysisPayload } from '@/types/fishing';
import { X } from '@lucide/vue';

defineProps<{
  open: boolean;
  payload: WeatherAnalysisPayload | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="bg-foreground/20 fixed inset-0 z-40 backdrop-blur-[2px]"
        @click="$emit('close')"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="open"
        class="bg-card border-border fixed top-0 right-0 z-50 flex h-screen w-[420px] max-w-[90vw] flex-col border-l shadow-2xl"
        role="dialog"
        aria-label="AI 分析"
      >
        <div
          class="border-border flex items-center justify-between border-b px-5 py-4"
        >
          <div>
            <h3 class="text-foreground font-family-averia text-lg">AI 分析</h3>
            <p class="text-muted-foreground mt-0.5 text-xs">
              基于当前天气与潮汐综合判断
            </p>
          </div>
          <button
            class="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            type="button"
            aria-label="关闭分析"
            @click="$emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex flex-1 flex-col overflow-y-auto px-5 py-4">
          <WeatherAnalysis :weather_data="payload" :auto-analyze="open" />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
