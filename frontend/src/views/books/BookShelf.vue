<template>
  <div class="bg-background flex min-h-[calc(100dvh-4rem)] flex-col">
    <BookShelfHero
      :book-count="isLoading ? null : displayedBooks.length"
      :is-syncing="isSyncing"
      @sync="handleSync"
    />

    <BookShelfStatsBar />

    <!-- Books Section -->
    <div class="flex-1 pb-8">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10">
        <!-- Loading skeleton -->
        <div
          v-if="isLoading"
          class="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          <div v-for="i in 8" :key="i" class="animate-pulse">
            <div class="bg-muted aspect-3/4 rounded-xl" />
            <div class="mt-2 px-1.5 space-y-1.5">
              <div class="bg-muted h-3 w-5/6 rounded" />
              <div class="bg-muted h-3 w-3/4 rounded" />
              <div class="bg-muted h-2.5 w-1/2 rounded" />
            </div>
          </div>
        </div>

        <!-- Error state -->
        <div
          v-else-if="errorMessage"
          class="flex flex-col items-center justify-center py-20"
        >
          <p class="text-destructive mb-4 text-center text-sm">
            {{ errorMessage }}
          </p>
          <button
            type="button"
            class="bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl px-5 py-2 text-sm font-medium transition-colors"
            @click="fetchBooks"
          >
            重试
          </button>
        </div>

        <!-- Empty shelf -->
        <div
          v-else-if="visibleBooks.length === 0"
          class="flex flex-col items-center justify-center py-20"
        >
          <p class="text-muted-foreground font-medium">暂无书籍</p>
          <p class="text-muted-foreground/60 mt-1 text-sm">
            你的微信读书书架还是空的
          </p>
        </div>

        <!-- Has books: search + results -->
        <div v-else>
          <!-- Search bar -->
          <div class="mb-4">
            <div class="relative">
              <Search
                class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索书名或作者…"
                class="border-border bg-card placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2 pr-4 pl-9 text-sm outline-none transition-colors focus:ring-2"
              />
            </div>
          </div>

          <!-- No results -->
          <div
            v-if="displayedBooks.length === 0"
            class="flex flex-col items-center justify-center py-16"
          >
            <p class="text-muted-foreground text-sm">
              没有找到「{{ searchQuery }}」相关的书籍
            </p>
          </div>

          <!-- Books grid -->
          <div
            v-else
            class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            <BookCard
              v-for="(book, index) in displayedBooks"
              :key="book.bookId"
              :book="book"
              :index="index"
              @select="handleBookClick"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReadStatsStore } from '@/stores/readStats';
import { useWereadShelf } from '@/composables/useWereadShelf';
import { computed, onMounted, ref } from 'vue';
import { Search } from '@lucide/vue';
import BookCard from './components/BookCard.vue';
import BookShelfHero from './components/BookShelfHero.vue';
import BookShelfStatsBar from './components/BookShelfStatsBar.vue';

const searchQuery = ref('');
const statsStore = useReadStatsStore();

const { isLoading, errorMessage, isSyncing, visibleBooks, fetchBooks, handleSync } =
  useWereadShelf();

const displayedBooks = computed(() => {
  const list = visibleBooks.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  );
});

const handleBookClick = (bookId: string) => {
  const link = document.createElement('a');
  link.href = `weread://reading?bId=${bookId}`;
  link.click();
};

onMounted(async () => {
  await Promise.all([fetchBooks(), statsStore.fetchStats()]);
});
</script>
