<template>
  <BentoCard>
    <div class="p-4">
      <h3
        class="text-muted-foreground mb-2 ml-2 text-xs font-bold tracking-wider uppercase"
      >
        TechStack
      </h3>
      <div class="flex flex-wrap gap-2">
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
import BentoCard from "@/components/bento/BentoCard.vue";

const techStack = [
  { name: "TaskIQ", color: "green" },
  { name: "Vue", color: "rose" },
  { name: "React", color: "teal" },
  { name: "Postgre", color: "indigo" },
  { name: "SQLAlchemy", color: "cyan" },
  { name: "FastAPI", color: "indigo" },
  { name: "Redis", color: "teal" },
  { name: "MongoDB", color: "fuchsia" },
];

// TODO(human): Replace hardcoded color classes with theme-aware semantic tokens.
// Each entry currently uses a hand-picked color (green, rose, teal, etc.) that doesn't
// adapt when the user switches themes. Choose an approach:
// 1. Use theme accent tokens (accent-*, accessible via CSS vars like bg-accent-amber/10)
// 2. Use opacity variants of bg-primary/accent (keeps variety, follows theme)
// 3. Derive colors from CSS custom properties with hue rotation
const colorClasses: Record<string, string> = {
  green:
    "bg-success/15 text-success hover:bg-success/25 dark:bg-success/10 dark:text-success dark:hover:bg-success/20",
  rose: "bg-destructive/15 text-destructive hover:bg-destructive/25 dark:bg-destructive/10 dark:text-destructive dark:hover:bg-destructive/20",
  teal: "bg-chart-2/15 text-chart-2 hover:bg-chart-2/25 dark:bg-chart-2/10 dark:text-chart-2 dark:hover:bg-chart-2/20",
  indigo:
    "bg-chart-3/15 text-chart-3 hover:bg-chart-3/25 dark:bg-chart-3/10 dark:text-chart-3 dark:hover:bg-chart-3/20",
  cyan: "bg-chart-1/15 text-chart-1 hover:bg-chart-1/25 dark:bg-chart-1/10 dark:text-chart-1 dark:hover:bg-chart-1/20",
  fuchsia:
    "bg-chart-5/15 text-chart-5 hover:bg-chart-5/25 dark:bg-chart-5/10 dark:text-chart-5 dark:hover:bg-chart-5/20",
};
</script>
