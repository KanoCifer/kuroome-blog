<template>
  <BentoCard>
    <div class="flex h-full items-center gap-5">
      <div class="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white/60 shadow-md">
        <img src="/images/about.webp" alt="Avatar" class="h-full w-full object-cover" />
      </div>
      <div class="flex flex-col justify-center">
        <h2 class="font-serif text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {{ greeting }}
        </h2>
        <p class="mt-1 font-serif text-sm font-medium text-slate-600 dark:text-slate-400">
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
