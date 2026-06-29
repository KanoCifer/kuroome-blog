<template>
  <!-- 页脚：文学手账卷末 · 单行 -->
  <footer
    class="transition-colors duration-1000"
    :class="
      !isEntryView
        ? 'border-border/40 border-t bg-white dark:bg-black'
        : 'border-0'
    "
  >
    <div
      class="text-muted-foreground mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1.5 px-6 py-2.5 text-[11px]"
    >
      <!-- 左：站名 + 版权章回标 -->
      <div class="flex items-baseline gap-2.5">
        <span class="font-serif text-[13px] italic">ka·no·ci·fer</span>
        <span aria-hidden="true" class="text-border/50">·</span>
        <span class="font-mono text-[10px] tracking-[0.2em] uppercase"
          >©2026</span
        >
      </div>

      <!-- 中：实时状态（延迟 + 在线） -->
      <div class="flex items-center gap-3">
        <StatusHoverPopover>
          <template #trigger>
            <router-link
              to="/status"
              class="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <span class="status-dot relative flex h-1.5 w-1.5">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full"
                  :class="delayStatus.dotClass"
                />
                <span
                  class="relative inline-flex h-1.5 w-1.5 rounded-full"
                  :class="delayStatus.dotClass"
                />
              </span>
              <span class="font-mono tracking-[0.1em]">延迟</span>
              <span
                :class="delayStatus.textClass"
                class="font-mono tabular-nums"
                >{{ delayStatus.label }}</span
              >
            </router-link>
          </template>
        </StatusHoverPopover>
        <span aria-hidden="true" class="text-border/50">·</span>
        <span class="inline-flex items-center gap-1.5">
          <span class="relative flex h-1.5 w-1.5">
            <span
              class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            />
            <span
              class="bg-success relative inline-flex h-1.5 w-1.5 rounded-full"
            />
          </span>
          <span class="font-mono tabular-nums"
            >{{ visitorCount.count }} 人在线</span
          >
        </span>
      </div>

      <!-- 右：链接组 -->
      <div class="flex items-center gap-3">
        <a
          href="https://github.com/KanoCifer/Flask-Example"
          target="_blank"
          rel="noopener"
          class="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <img
            src="https://github.githubassets.com/favicons/favicon.svg"
            class="h-3.5 w-3.5 opacity-60 grayscale"
            alt="Github"
          />
          <span class="font-mono tracking-[0.1em]">GitHub</span>
        </a>
        <span aria-hidden="true" class="text-border/50">·</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener"
          class="hover:text-foreground font-mono transition-colors"
          >粤ICP备2026018113号</a
        >
        <span aria-hidden="true" class="text-border/50">·</span>
        <router-link
          to="/privacy"
          class="hover:text-foreground transition-colors"
        >
          <span class="font-mono tracking-[0.1em]">隐私政策</span>
        </router-link>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { connectionDelay } from '@/plugins/visitorWs';
import StatusHoverPopover from '@/components/basic/StatusHoverPopover.vue';
import { useVisitorCountStore } from '@/stores/visitorCount';
import { computed } from 'vue';

const visitorCount = useVisitorCountStore();

const delayStatus = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  if (!ms) return { label: '-- ms', dotClass: 'bg-muted-foreground/40' };
  const label = `${Math.round(ms)} ms`;
  if (ms < 200)
    return { label, dotClass: 'bg-emerald-500', textClass: 'text-emerald-500' };
  if (ms < 2000)
    return { label, dotClass: 'bg-yellow-500', textClass: 'text-yellow-500' };
  return { label, dotClass: 'bg-red-500', textClass: 'text-red-500' };
});

defineProps<{
  isEntryView: boolean;
}>();
</script>

<style lang="scss" scoped>
footer {
  :deep(*) {
    color: var(--color-foreground);
  }
}
</style>
