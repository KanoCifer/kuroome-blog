<template>
  <BentoCard class="group flex flex-col gap-2 select-none">
    <!-- 顶部：图标和标题 -->
    <!-- Hearder -->
    <div class="flex items-baseline justify-between">
      <div
        class="bg-primary/15 flex h-10 w-10 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rounded-xl"
      >
        <CalendarDays class="h-4 w-4 text-blue-500" />
      </div>

      <div class="mb-3 flex items-center justify-end-safe gap-3">
        <h3 class="text-foreground text-lg font-semibold">
          {{ monthLabel }}
        </h3>
        <span class="text-muted-foreground text-sm">{{ yearLabel }}</span>
      </div>
    </div>

    <!-- Weekday headers -->
    <div
      class="mb-1 grid gap-x-3 text-center"
      style="grid-template-columns: repeat(7, 1fr)"
    >
      <span
        v-for="(label, idx) in weekdays"
        :key="idx"
        class="py-1 text-xs font-medium"
        :class="idx === weekdayToday ? 'text-primary' : 'text-muted-foreground'"
      >
        {{ label }}
      </span>
    </div>

    <!-- Days grid -->
    <div
      class="grid gap-x-3 text-center"
      style="grid-template-columns: repeat(7, 1fr)"
    >
      <!-- Leading blank cells for alignment -->
      <span v-for="n in startOffset" :key="'blank-' + n" />

      <!-- Day numbers -->
      <span
        v-for="day in daysInMonth"
        :key="day"
        class="mx-auto flex aspect-square w-full max-w-8 items-center justify-center rounded-lg text-sm transition-colors"
        :class="
          day === today
            ? 'bg-primary text-primary-foreground font-bold'
            : 'text-muted-foreground hover:bg-primary/10'
        "
      >
        {{ day }}
      </span>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import dayjs from 'dayjs';
import { computed } from 'vue';
import { CalendarDays } from '@lucide/vue';

const now = dayjs();

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekdayToday = computed(() => dayjs().day());
const monthLabel = computed(() => now.format('MMMM'));
const yearLabel = computed(() => now.format('YYYY'));

// Day of week for the 1st of the month (0 = Sunday)
const startOffset = computed(() => now.startOf('month').day());

// Total days in current month
const daysInMonth = computed(() => now.daysInMonth());

// Current day number (1-31)
const today = computed(() => now.date());
</script>
