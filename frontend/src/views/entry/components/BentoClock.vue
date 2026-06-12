<template>
  <BentoCard class="flex w-64 flex-col items-center justify-center select-none">
    <p class="text-muted-foreground text-sm font-medium tracking-wider">
      {{ dateLabel }}
    </p>
    <BentoClockTime />
    <p class="text-muted-foreground mt-1 text-sm">
      {{ weekdayLabel }}
    </p>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import BentoClockTime from './BentoClockTime.vue';
import dayjs from 'dayjs';
import { ref, onMounted, onUnmounted } from 'vue';

// Date & weekday only change once per day — update lazily
const dateLabel = ref(dayjs().format('YYYY-MM-DD'));
const weekdayLabel = ref(dayjs().format('dddd'));

let dateTimer: ReturnType<typeof setInterval> | null = null;

function refreshDateLabels() {
  const now = dayjs();
  dateLabel.value = now.format('YYYY-MM-DD');
  weekdayLabel.value = now.format('dddd');
}

onMounted(() => {
  // Refresh at midnight
  const msUntilMidnight =
    dayjs().endOf('day').valueOf() - Date.now() + 1000;
  dateTimer = setTimeout(() => {
    refreshDateLabels();
    // Then check every hour in case of timezone shifts
    dateTimer = setInterval(refreshDateLabels, 3_600_000);
  }, msUntilMidnight);
});

onUnmounted(() => {
  if (dateTimer) {
    clearTimeout(dateTimer);
    clearInterval(dateTimer);
    dateTimer = null;
  }
});
</script>
