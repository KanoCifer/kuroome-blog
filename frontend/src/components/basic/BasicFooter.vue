<template>
  <!-- Footer -->
  <footer
    class="transition-colors duration-1000"
    :class="
      !isEntryView
        ? 'border-border border-t bg-white dark:bg-black'
        : 'border-0 bg-transparent'
    "
  >
    <div
      class="text-muted-foreground mx-auto flex w-full max-w-7xl flex-row flex-wrap items-center justify-between gap-3 px-6 py-3 text-base"
    >
      <!-- 左侧：版权信息 -->
      <div class="flex items-center gap-2">
        &copy; 2026 By KanoCifer
        <span class="text-muted-foreground mx-1 text-sm">|</span>
        <span class="inline-flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              :class="delayStatus.dotClass"
            ></span>
            <span
              class="relative inline-flex h-2 w-2 rounded-full"
              :class="delayStatus.dotClass"
            ></span>
          </span>
          延迟 {{ delayStatus.label }}
        </span>
      </div>

      <!-- 右侧：链接与状态 -->
      <div class="flex items-center gap-4">
        <span class="inline-flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span
              class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            ></span>
            <span
              class="bg-success relative inline-flex h-2 w-2 rounded-full"
            ></span>
          </span>
          {{ visitorCount.count }} 人在线
        </span>

        <a
          href="https://github.com/KanoCifer/Flask-Example"
          target="_blank"
          class="hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <img
            src="https://github.githubassets.com/favicons/favicon.svg"
            class="h-4 w-4 opacity-70 grayscale"
            alt="Github"
          />
          KanoCifer
        </a>

        <a class="hover:text-foreground transition-colors" target="_blank"
          >粤ICP备2026018113号</a
        >

        <router-link
          to="/privacy"
          class="hover:text-foreground transition-colors"
          >隐私政策</router-link
        >
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { connectionDelay } from '@/plugins/visitorWs';
import { useVisitorCountStore } from '@/stores/visitorCount';
import { computed } from 'vue';

const visitorCount = useVisitorCountStore();

const delayStatus = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  if (!ms) return { label: '-- ms', dotClass: 'bg-muted-foreground/40' };
  const label = `${Math.round(ms)} ms`;
  if (ms < 200) return { label, dotClass: 'bg-emerald-500' };
  if (ms < 2000) return { label, dotClass: 'bg-yellow-500' };
  return { label, dotClass: 'bg-red-500' };
});

defineProps<{
  isEntryView: boolean;
}>();
</script>
