<template>
  <MobileBentoCard
    class="flex aspect-square flex-col justify-between !p-6 max-sm:aspect-auto max-sm:h-40"
  >
    <div>
      <svg
        class="h-6 w-6 text-blue-600 dark:text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <div>
      <div
        class="font-serif text-4xl font-extrabold tracking-tighter text-slate-800 dark:text-slate-100"
      >
        {{ timeLabel }}
      </div>
      <div class="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
        {{ weekdayLabel }}, {{ dateLabel }}
      </div>
    </div>
  </MobileBentoCard>
</template>

<script setup lang="ts">
import { useNow } from "@vueuse/core";
import dayjs from "dayjs";
import { computed } from "vue";
import MobileBentoCard from "./MobileBentoCard.vue";

// Updates every 1000ms (1 second)
const now = useNow({ interval: 1000 });

const timeLabel = computed(() => dayjs(now.value).format("HH:mm"));
const dateLabel = computed(() => dayjs(now.value).format("MMM D"));
const weekdayLabel = computed(() => dayjs(now.value).format("dddd"));
</script>
