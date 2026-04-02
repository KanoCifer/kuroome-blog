<template>
  <MobileBentoCard
    class="relative overflow-hidden border-blue-500/30! bg-linear-to-br from-blue-600/90 to-blue-800/90 p-8 shadow-xl"
  >
    <div class="relative z-10 flex flex-col justify-center">
      <h3 class="mb-1 font-serif text-sm font-medium text-white/80 dark:text-blue-100">
        {{ greeting }}
      </h3>
      <h4 class="font-serif text-3xl leading-tight font-extrabold text-white">Ready for a productive</h4>
      <h4 class="mb-4 font-serif text-3xl leading-tight font-extrabold text-white">session now?</h4>
      <div class="mt-2">
        <button
          @click="$router.push('/todos')"
          class="rounded-full bg-white/20 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
        >
          Check Today's Tasks
        </button>
      </div>
    </div>

    <!-- Decorative Abstract Shape -->
    <div class="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>
    <div class="absolute top-1/2 right-4 -translate-y-1/2 opacity-20">
      <!-- Moon (evening) -->
      <svg v-if="isEvening" class="h-24 w-24 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path
          fill-rule="evenodd"
          d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
          clip-rule="evenodd"
        />
      </svg>
      <!-- Sun (morning/afternoon) -->
      <svg v-else class="h-24 w-24 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"
        />
      </svg>
    </div>
  </MobileBentoCard>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { computed } from "vue";
import MobileBentoCard from "./MobileBentoCard.vue";

const hour = dayjs().hour();

const greeting = computed(() => {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
});

const isEvening = computed(() => hour >= 18);
</script>
