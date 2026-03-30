<template>
  <BentoCard class="flex flex-col items-center justify-center">
    <p class="text-sm font-medium tracking-wider text-slate-500">
      {{ dateLabel }}
    </p>
    <p class="mt-2 font-mono text-6xl font-bold tracking-tight text-blue-800 dark:text-slate-300">
      {{ timeLabel }}
    </p>
    <p class="mt-1 text-sm text-slate-400">
      {{ weekdayLabel }}
    </p>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import { useNow } from "@vueuse/core";
import dayjs from "dayjs";
import { computed } from "vue";

// Updates every 1000ms (1 second)
const now = useNow({ interval: 1000 });

const timeLabel = computed(() => dayjs(now.value).format("HH:mm"));
const dateLabel = computed(() => dayjs(now.value).format("YYYY-MM-DD"));
const weekdayLabel = computed(() => dayjs(now.value).format("dddd"));
</script>
