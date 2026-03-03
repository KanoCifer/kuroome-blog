<template>
  <BentoCard>
    <div class="flex h-full items-center gap-5">
      <div
        class="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white/60 shadow-md"
      >
        <img src="/images/avatar.webp" alt="Avatar" class="h-full w-full object-cover" />
      </div>
      <div class="flex flex-col justify-center">
        <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {{ greeting }}
        </h2>
        <p class="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          Welcome back. Ready for a new read?
        </p>
      </div>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BentoCard from "./BentoCard.vue";

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
});
</script>
