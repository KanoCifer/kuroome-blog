<template>
  <BentoCard class="group relative overflow-hidden">
    <!-- 背景水波纹效果 -->
    <div
      class="absolute inset-0 bg-linear-to-br from-violet-500/10 via-fuchsia-500/5 to-pink-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />
    <div class="relative">
      <!-- Header -->
      <div class="mx-3 flex items-center justify-between">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 transition-transform duration-300 group-hover:scale-110 group-hover:rounded-xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-violet-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <h3
          class="text-muted-foreground text-xs font-bold tracking-wider uppercase"
        >
          TechStack
        </h3>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="tech in techStack"
          :key="tech.name"
          :class="[
            'cursor-default rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            colorClasses[tech.color],
          ]"
        >
          {{ tech.name }}
        </span>
      </div>
    </div>
  </BentoCard>
</template>
<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';

const techStack = [
  { name: 'TaskIQ', color: 'green' },
  { name: 'Vue', color: 'rose' },
  { name: 'React', color: 'teal' },
  { name: 'Postgre', color: 'indigo' },
  { name: 'SQLAlchemy', color: 'cyan' },
  { name: 'FastAPI', color: 'indigo' },
  { name: 'Redis', color: 'teal' },
  { name: 'MongoDB', color: 'fuchsia' },
];

// TODO(human): Replace hardcoded color classes with theme-aware semantic tokens.
// Each entry currently uses a hand-picked color (green, rose, teal, etc.) that doesn't
// adapt when the user switches themes. Choose an approach:
// 1. Use theme accent tokens (accent-*, accessible via CSS vars like bg-accent-amber/10)
// 2. Use opacity variants of bg-primary/accent (keeps variety, follows theme)
// 3. Derive colors from CSS custom properties with hue rotation
const colorClasses: Record<string, string> = {
  green:
    'bg-success/15 text-success hover:bg-success/25 dark:bg-success/10 dark:text-success dark:hover:bg-success/20',
  rose: 'bg-destructive/15 text-destructive hover:bg-destructive/25 dark:bg-destructive/10 dark:text-destructive dark:hover:bg-destructive/20',
  teal: 'bg-chart-2/15 text-chart-2 hover:bg-chart-2/25 dark:bg-chart-2/10 dark:text-chart-2 dark:hover:bg-chart-2/20',
  indigo:
    'bg-chart-3/15 text-chart-3 hover:bg-chart-3/25 dark:bg-chart-3/10 dark:text-chart-3 dark:hover:bg-chart-3/20',
  cyan: 'bg-chart-1/15 text-chart-1 hover:bg-chart-1/25 dark:bg-chart-1/10 dark:text-chart-1 dark:hover:bg-chart-1/20',
  fuchsia:
    'bg-chart-5/15 text-chart-5 hover:bg-chart-5/25 dark:bg-chart-5/10 dark:text-chart-5 dark:hover:bg-chart-5/20',
};
</script>
