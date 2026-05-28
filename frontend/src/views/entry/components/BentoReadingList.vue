<template>
  <BentoCard class="group relative min-w-0 overflow-hidden">
    <!-- 背景渐变 -->
    <div
      class="absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-orange-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />

    <RouterLink
      to="/home"
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

        <!-- 进度条 -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[10px]">
            <span class="text-muted-foreground">本月进度</span>
            <span class="font-medium text-amber-600"
              >{{ progressPercent }}%</span
            >
          </div>
          <div class="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              class="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700 ease-out group-hover:animate-pulse"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>
      </div>
    </RouterLink>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import { useAnimateNumber } from '@/composables/useAnimateNumber';
import { bookService } from '@/service/bookService';
import type { BookItem } from '@/types';
import { BookOpen } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';

const { displayValue: displayCount, animateTo } = useAnimateNumber();
const progressPercent = ref(68);
const bookCovers = ['bg-red-400', 'bg-blue-400', 'bg-green-400'];

onMounted(async () => {
  try {
    const response = await bookService.getBooks({ per_page: 100 });
    const books = response.data?.books || [];
    const readingBooks = books.filter((b: BookItem) => !b.iscompleted);
    animateTo(readingBooks.length || 5);
  } catch {
    console.warn('Failed to fetch reading books, using default count');
    animateTo(5);
  }
});
</script>
