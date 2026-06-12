<script setup lang="ts">
import { useNow } from '@vueuse/core';
import dayjs from 'dayjs';
import { computed } from 'vue';

const now = useNow({ interval: 1000 });
const hourLabel = computed(() => dayjs(now.value).format('HH'));
const minuteLabel = computed(() => dayjs(now.value).format('mm'));
</script>

<template>
  <p
    class="text-primary/80 font-family-harmonyos mt-2 text-6xl font-bold tracking-tight"
  >
    {{ hourLabel }}<span class="animate-timer-ping mx-1">:</span
    >{{ minuteLabel }}
  </p>
</template>
