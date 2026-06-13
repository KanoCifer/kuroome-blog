<template>
  <BentoCard
    :initial="{ scale: 0.5, opacity: 0 }"
    :animate="{ scale: 1, opacity: 1 }"
    class="group relative flex h-full flex-col overflow-hidden p-2!"
  >
    <!-- 背景水波纹效果 -->
    <div
      class="absolute inset-0 bg-linear-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />
    <RouterLink
      to="/todos"
      class="relative flex h-full items-center gap-3 px-4 py-2"
    >
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 transition-transform duration-300 group-hover:scale-110"
      >
        <svg
          class="size-4.5 text-violet-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </div>
      <span class="text-foreground text-sm font-medium">开发任务</span>
      <svg
        class="text-muted-foreground ml-auto size-4 transition-transform duration-300 group-hover:translate-x-0.5"
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
    </RouterLink>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from './BentoCard.vue';
</script>
