<template>
  <MobileBentoCard>
    <!-- Tech Stack Card -->
    <div class="squircle p-2">
      <h3
        class="mb-4 flex items-center gap-2 font-serif text-sm font-bold text-slate-800 dark:text-slate-200"
      >
        <svg
          class="h-5 w-5 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Tech Stack
      </h3>
      <div class="flex flex-wrap gap-2">
        <span
          class="cursor-default rounded-full border border-blue-200 bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          Python
        </span>
        <span
          class="cursor-default rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700 transition-colors hover:bg-yellow-200 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
        >
          JS/TS
        </span>
        <span
          class="cursor-default rounded-full border border-green-200 bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-200 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
        >
          TaskIQ
        </span>
        <span
          class="cursor-default rounded-full border border-rose-200 bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
        >
          Vue3
        </span>
        <span
          class="cursor-default rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-200 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
        >
          Motion
        </span>
        <span
          class="cursor-default rounded-full border border-purple-200 bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-200 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
        >
          TailwindCSS
        </span>
        <span
          class="cursor-default rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-200 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
        >
          PostgreSQL
        </span>
        <span
          class="cursor-default rounded-full border border-cyan-200 bg-cyan-100 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-200 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50"
        >
          SQLAlchemy
        </span>
        <span
          class="cursor-default rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-200 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
        >
          FastAPI
        </span>
        <span
          class="cursor-default rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-200 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
        >
          Redis
        </span>
        <span
          class="cursor-default rounded-full border border-fuchsia-200 bg-fuchsia-100 px-3 py-1.5 text-xs font-semibold text-fuchsia-700 transition-colors hover:bg-fuchsia-200 dark:border-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/50"
        >
          MongoDB
        </span>
      </div>
    </div>
  </MobileBentoCard>
</template>
<script setup lang="ts">
import MobileBentoCard from "./MobileBentoCard.vue";
</script>
