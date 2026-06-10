<template>
  <BentoCard class="group relative min-w-0 overflow-hidden">
    <!-- 背景渐变 -->
    <div
      class="absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-orange-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />

    <RouterLink
      to="/bookshelf"
      class="relative flex h-full flex-col justify-between p-1"
    >
      <!-- 顶部：图标和标题 -->
      <div class="flex items-start justify-between">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 transition-transform duration-300 group-hover:scale-110 group-hover:rounded-xl"
        >
          <BookOpen class="size-5 text-amber-600" />
        </div>
        <div class="flex -space-x-2">
          <div
            v-for="(color, i) in bookCovers"
            :key="i"
            :class="[
              'h-8 w-6 rounded shadow-sm transition-transform duration-300',
              color,
            ]"
            :style="{ transitionDelay: `${i * 50}ms` }"
          />
        </div>
      </div>

      <!-- 中部：统计信息 -->
      <div class="mt-3 space-y-2">
        <div class="flex items-baseline gap-1">
          <span class="text-foreground text-2xl font-bold tracking-tight">{{
            displayCount
          }}</span>
          <span class="text-muted-foreground text-xs">本在读</span>
        </div>

        <!-- 阅读时长 -->
        <div class="space-y-1.5 text-[10px]">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">本周</span>
            <span class="font-medium text-amber-600">{{
              formatDuration(weeklyMinutes)
            }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">本月</span>
            <span class="font-medium text-amber-600">{{
              formatDuration(monthlyMinutes)
            }}</span>
          </div>
        </div>
      </div>
    </RouterLink>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import { useAnimateNumber } from '@/composables/useAnimateNumber';
import { wereadGateway } from '@/api/wereadGateway';
import { useReadStatsStore } from '@/stores/readStats';
import { BookOpen } from '@lucide/vue';
import { onMounted, computed } from 'vue';

const { displayValue: displayCount, animateTo } = useAnimateNumber();
const readStats = useReadStatsStore();
const bookCovers = ['bg-red-400', 'bg-blue-400', 'bg-green-400'];

const weeklyMinutes = computed(
  () => readStats.weeklySnapshot?.totalReadTime ?? 0,
);
const monthlyMinutes = computed(
  () => readStats.monthlySnapshot?.totalReadTime ?? 0,
);

function formatDuration(seconds: number): string {
  if (!seconds) return '0分钟';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分`;
}

onMounted(async () => {
  try {
    const [shelfRes] = await Promise.all([
      wereadGateway.getUserShelf(),
      readStats.fetchStats(),
    ]);
    const books = shelfRes.data?.user_books ?? [];
    const readingBooks = books.filter((b) => !b.finishReading);
    animateTo(readingBooks.length || 10);
  } catch {
    console.warn('Failed to fetch reading data, using default count');
    animateTo(5);
  }
});
</script>
