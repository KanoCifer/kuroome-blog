<template>
  <BentoCard class="flex flex-col">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200">
        {{ monthLabel }}
      </h3>
      <span class="text-sm text-slate-600 dark:text-slate-400">{{
        yearLabel
      }}</span>
    </div>

    <!-- Weekday headers -->
    <div
      class="mb-1 grid text-center"
      style="grid-template-columns: repeat(7, 1fr)"
    >
      <span
        v-for="(label, idx) in weekdays"
        :key="idx"
        class="py-1 text-xs font-medium"
        :class="idx === weekdayToday ? 'text-blue-500' : 'text-slate-500'"
      >
        {{ label }}
      </span>
    </div>

    <!-- Days grid -->
    <div class="grid text-center" style="grid-template-columns: repeat(7, 1fr)">
      <!-- Leading blank cells for alignment -->
      <span v-for="n in startOffset" :key="'blank-' + n" />

      <!-- Day numbers -->
      <span
        v-for="day in daysInMonth"
        :key="day"
        class="mx-auto flex aspect-square w-full max-w-8 items-center justify-center rounded-full text-sm transition-colors"
        :class="
          day === today
            ? 'bg-blue-500 font-bold text-white'
            : 'text-slate-700 hover:bg-blue-100 dark:text-slate-300 dark:hover:bg-blue-900/30'
        "
      >
        {{ day }}
      </span>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import dayjs from "dayjs";
import { computed } from "vue";

const now = dayjs();

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekdayToday = computed(() => dayjs().day());
const monthLabel = computed(() => now.format("MMMM"));
const yearLabel = computed(() => now.format("YYYY"));

// Day of week for the 1st of the month (0 = Sunday)
const startOffset = computed(() => now.startOf("month").day());

// Total days in current month
const daysInMonth = computed(() => now.daysInMonth());

// Current day number (1-31)
const today = computed(() => now.date());
</script>
