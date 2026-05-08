<template>
  <BentoCard>
    <div class="flex h-full items-center gap-5">
      <div class="flex shrink-0 items-center justify-center">
        <svg
          v-if="isDay"
          class="size-12 text-amber-400"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="5" />
          <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </g>
        </svg>
        <svg
          v-else
          class="size-12 text-slate-300"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
      <div class="flex flex-col justify-center">
        <h2
          class="font-serif text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100"
        >
          {{ greeting }}
        </h2>
        <p
          class="mt-1 font-serif text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {{ changelogHint }}
        </p>
      </div>
      <!-- 更新日志按钮 -->
      <button
        @click.stop="$router.push('/changelog')"
        class="squircle ml-4 shrink-0 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 ring ring-blue-100 transition-all hover:scale-105 hover:bg-blue-100 dark:bg-blue-900/60 dark:text-blue-400 dark:ring-blue-800"
      >
        Changelog
      </button>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import { computed } from "vue";

const isDay = computed(() => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
});

const changelogHint = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Check out what's new today!";
  if (hour < 18) return "See what's changed this afternoon";
  return "New updates waiting for you tonight";
});
</script>
