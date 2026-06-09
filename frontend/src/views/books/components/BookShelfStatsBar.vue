<template>
  <div
    v-if="weeklySnapshot"
    class="border-border bg-card mx-auto mt-6 mb-4 w-[calc(100%-2rem)] max-w-6xl cursor-pointer rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md sm:px-6 md:mt-8 md:mb-6 md:px-10"
    @click="router.push('/bookshelf/stats')"
  >
    <div class="flex items-center gap-4 sm:gap-6">
      <div class="flex-1">
        <p class="text-muted-foreground mb-1 text-xs">本周阅读</p>
        <p class="text-foreground text-xl font-bold">
          {{ formatDuration(weeklySnapshot.totalReadTime) }}
        </p>
      </div>
      <div class="bg-border h-10 w-px" />
      <div class="flex-1">
        <p class="text-muted-foreground mb-1 text-xs">阅读天数</p>
        <p class="text-foreground text-xl font-bold">
          {{ weeklySnapshot.readDays ?? 0 }}
          <span class="text-muted-foreground text-xs font-normal">天</span>
        </p>
      </div>
      <div class="bg-border hidden h-10 w-px sm:block" />
      <div
        v-if="latestBook"
        class="hidden min-w-0 flex-1 items-center gap-3 sm:flex"
      >
        <img
          v-if="latestBook.cover"
          :src="latestBook.cover"
          :alt="latestBook.title ?? ''"
          class="h-12 w-9 flex-shrink-0 rounded object-cover shadow-sm"
        />
        <div class="min-w-0">
          <p class="text-muted-foreground mb-0.5 text-xs">最近在读</p>
          <p class="text-foreground truncate text-sm font-medium">
            {{ latestBook.title }}
          </p>
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="text-muted-foreground h-5 w-5 flex-shrink-0"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M8.25 4.5l7.5 7.5-7.5 7.5"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useReadStatsStore } from '@/stores/readStats';

const router = useRouter();
const statsStore = useReadStatsStore();

const weeklySnapshot = computed(() => statsStore.weeklySnapshot);
const latestBook = computed(() => {
  const s = statsStore.weeklySnapshot;
  if (!s?.readLongest?.length) return null;
  return s.readLongest[0];
});

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
</script>
