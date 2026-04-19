<template>
  <BentoCard>
    <div class="p-4">
      <h3 class="mb-2 ml-2 text-xs font-bold tracking-wider text-gray-600 uppercase dark:text-gray-400">TechStack</h3>
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

const colorClasses: Record<string, string> = {
  green:
    "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50",
  rose: "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50",
  teal: "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50",
  indigo:
    "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50",
  cyan: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50",
  fuchsia:
    "bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/50",
};
</script>
