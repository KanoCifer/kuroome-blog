<template>
  <BentoCard>
    <!-- Tech Stack Card -->
    <div class="p-4">
      <h3 class="mb-2 ml-2 font-serif text-xs font-bold tracking-wider text-gray-600 uppercase dark:text-gray-400">
        TechStack
      </h3>
      <div class="flex flex-wrap gap-2">
        <span
          class="cursor-default rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
        >
          TaskIQ
        </span>
        <span
          class="cursor-default rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
        >
          Vue3
        </span>
        <span
          class="cursor-default rounded-md bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
        >
          Motion
        </span>
        <span
          class="cursor-default rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
        >
          PostgreSQL
        </span>
        <span
          class="cursor-default rounded-md bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50"
        >
          SQLAlchemy
        </span>
        <span
          class="cursor-default rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
        >
          FastAPI
        </span>
        <span
          class="cursor-default rounded-md bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
        >
          Redis
        </span>
        <span
          class="cursor-default rounded-md bg-fuchsia-100 px-2.5 py-1 text-xs font-medium text-fuchsia-700 transition-colors hover:bg-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/50"
        >
          MongoDB
        </span>
      </div>
    </div>
  </BentoCard>
</template>
<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
</script>
