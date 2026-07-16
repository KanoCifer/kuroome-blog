<script setup lang="ts">
import { connectionDelay } from '@/plugins/visitorWs';
import { useVisitorCountStore } from '@/stores/visitorCount';
import { motion } from 'motion-v';
import { computed, ref } from 'vue';

const visitorCount = useVisitorCountStore();
const islandExpanded = ref(false);

const delayStatus = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  if (!ms) return { label: '-- ms', dotClass: 'bg-white/40' };
  const label = `${Math.round(ms)} ms`;
  if (ms < 200)
    return { label, dotClass: 'bg-emerald-400', textClass: 'text-emerald-400' };
  if (ms < 2000)
    return { label, dotClass: 'bg-yellow-400', textClass: 'text-yellow-400' };
  return { label, dotClass: 'bg-red-400', textClass: 'text-red-400' };
});
</script>

<template>
  <motion.div
    :animate="{
      height: islandExpanded ? 96 : 28,
      width: islandExpanded ? 220 : 160,
      borderRadius: islandExpanded ? 24 : 14,
    }"
    :transition="{ type: 'spring', stiffness: 400, damping: 30, bounce: 0 }"
    class="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 cursor-pointer overflow-hidden bg-black text-white shadow-lg shadow-black/20"
    @click="islandExpanded = !islandExpanded"
    role="button"
    :aria-expanded="islandExpanded"
    aria-label="实时状态面板"
  >
    <!-- 未展开状态 -->
    <motion.div
      :initial="{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }"
      :animate="{
        opacity: islandExpanded ? 0 : 1,
        scale: islandExpanded ? 0.25 : 1,
        filter: islandExpanded ? 'blur(4px)' : 'blur(0px)',
      }"
      :exit="{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }"
      :transition="{ type: 'spring', duration: 0.3, bounce: 0 }"
      class="flex h-7 items-center justify-center gap-2 px-3"
      :class="{ 'pointer-events-none': islandExpanded }"
    >
      <span class="relative flex h-1.5 w-1.5">
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          :class="delayStatus.dotClass"
        />
        <span
          class="relative inline-flex h-1.5 w-1.5 rounded-full"
          :class="delayStatus.dotClass"
        />
      </span>
      <span class="text-[10px] tracking-wider tabular-nums">{{
        delayStatus.label
      }}</span>
      <span class="text-white/30">·</span>
      <span class="relative flex h-1.5 w-1.5">
        <span
          class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
        />
        <span
          class="bg-success relative inline-flex h-1.5 w-1.5 rounded-full"
        />
      </span>
      <span class="text-[10px] tracking-wider tabular-nums"
        >{{ visitorCount.count }} 在线</span
      >
    </motion.div>

    <!-- 展开状态 -->
    <motion.div
      :initial="{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }"
      :animate="{
        opacity: islandExpanded ? 1 : 0,
        scale: islandExpanded ? 1 : 0.92,
        filter: islandExpanded ? 'blur(0px)' : 'blur(4px)',
      }"
      :exit="{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }"
      :transition="{ type: 'spring', duration: 0.3, bounce: 0 }"
      class="absolute inset-0 flex flex-col justify-between px-4 py-3"
      :class="{ 'pointer-events-none': !islandExpanded }"
    >
      <router-link
        to="/status"
        class="flex items-center justify-between"
        @click.stop
      >
        <span class="text-[11px] font-medium tracking-wide opacity-90"
          >Service Status</span
        >
        <svg
          class="h-3.5 w-3.5 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </router-link>
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-[9px] tracking-[0.15em] uppercase opacity-50"
            >Latency</span
          >
          <span
            class="font-mono text-sm font-semibold tabular-nums"
            :class="delayStatus.textClass"
            >{{ delayStatus.label }}</span
          >
        </div>
        <div class="flex flex-col items-end gap-0.5">
          <span class="text-[9px] tracking-[0.15em] uppercase opacity-50"
            >Online</span
          >
          <span class="font-mono text-sm font-semibold tabular-nums">{{
            visitorCount.count
          }}</span>
        </div>
      </div>
    </motion.div>
  </motion.div>
</template>
