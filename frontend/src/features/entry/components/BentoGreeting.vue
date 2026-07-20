<template>
  <BentoCard>
    <div class="flex h-full items-center gap-5 py-4">
      <div class="flex shrink-0 items-center justify-center">
        <svg
          v-if="isDay"
          class="text-warning size-12"
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
          class="text-muted size-12"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
      <div class="flex flex-col justify-center">
        <h2
          class="text-foreground font-serif text-2xl font-bold tracking-tight"
        >
          {{ greeting }}
        </h2>
        <p class="text-muted-foreground mt-1 font-serif text-sm font-medium">
          {{ changelogHint }}
        </p>
      </div>
      <!-- 更新日志按钮 -->
      <button
        @click.stop="$router.push('/version-log')"
        class="squircle bg-primary/10 text-primary ring-primary/20 hover:bg-primary/20 ml-4 shrink-0 px-3 py-2 text-xs font-bold ring transition-all hover:scale-105"
      >
        Changelog
      </button>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from './BentoCard.vue';
import { useGreeting } from '@/shared/composables';

const { isDay, greeting, changelogHint } = useGreeting();
</script>
