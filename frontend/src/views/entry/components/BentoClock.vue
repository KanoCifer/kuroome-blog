<template>
  <BentoCard class="flex w-64 flex-col items-center justify-center select-none">
    <p class="text-muted-foreground text-sm font-medium tracking-wider">
      {{ dateLabel }}
    </p>
    <p
      class="text-primary/80 font-family-harmonyos mt-2 text-6xl font-bold tracking-tight"
    >
      {{ hourLabel }}<span class="animate-timer-ping mx-1">:</span
      >{{ minuteLabel }}
    </p>
    <p class="text-muted-foreground mt-1 text-sm">
      {{ weekdayLabel }}
    </p>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import { useNow } from '@vueuse/core';
import dayjs from 'dayjs';
import { computed } from 'vue';

// Updates every 1000ms (1 second)
const now = useNow({ interval: 1000 });

const hourLabel = computed(() => dayjs(now.value).format('HH'));
const minuteLabel = computed(() => dayjs(now.value).format('mm'));
const dateLabel = computed(() => dayjs(now.value).format('YYYY-MM-DD'));
const weekdayLabel = computed(() => dayjs(now.value).format('dddd'));
</script>
