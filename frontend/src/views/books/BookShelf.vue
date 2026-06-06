<template>
  <div class="bg-background flex min-h-[calc(100dvh-4rem)] flex-col">
    <!-- Hero Image Section -->
    <div class="relative h-[40vh] flex-shrink-0 overflow-hidden md:h-[45vh]">
      <img src="/card/card-1.jpeg" alt="" class="h-full w-full object-cover" />
      <div
        class="from-background/40 via-background/5 to-background pointer-events-none absolute inset-0 bg-gradient-to-b"
      />

      <!-- Back Button -->
      <div
        class="absolute top-0 right-0 left-0 z-10 flex items-center px-4 py-4 md:px-6"
      >
        <button
          type="button"
          class="border-border bg-card/60 hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors"
          @click="handleBack"
          aria-label="返回"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="text-foreground h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
      </div>
      <!-- Sync Button -->
      <div
        class="absolute top-0 right-0 z-10 flex items-center px-4 py-4 md:px-6"
      >
        <button
          type="button"
          class="border-border bg-card/60 hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors disabled:opacity-50"
          :disabled="isSyncing"
          @click="handleSync"
          aria-label="同步书架"
        >
          <CloudSync
            class="text-foreground h-5 w-5"
            :class="{ 'animate-spin': isSyncing }"
          />
        </button>
      </div>

      <!-- Title Overlay -->
      <div
        class="absolute right-0 bottom-0 left-0 z-10 px-6 pb-6 md:px-10 md:pb-8"
      >
        <h1
          class="font-serif text-3xl font-bold text-white drop-shadow-lg md:text-5xl"
        >
          我的书架
        </h1>
        <div class="mt-2 flex items-center gap-3">
          <span class="text-sm text-white/75 md:text-base">微信读书</span>
          <span class="h-1 w-1 rounded-full bg-white/40" />
          <span v-if="!isLoading" class="text-sm text-white/75 md:text-base"
            >{{ visibleBooks.length }} 本书</span
          >
        </div>
      </div>
    </div>

    <!-- Stats Summary Bar -->
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

    <!-- Books Section -->
    <div class="flex-1 pb-8">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10">
        <!-- Loading skeleton -->
        <div
          v-if="isLoading"
          class="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          <div v-for="i in 8" :key="i" class="animate-pulse">
            <div class="bg-muted aspect-2/3 rounded-xl" />
            <div class="mt-3 space-y-2">
              <div class="bg-muted h-4 w-3/4 rounded" />
              <div class="bg-muted h-3 w-1/2 rounded" />
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

        <!-- Empty state -->
        <div
          v-else-if="visibleBooks.length === 0"
          class="flex flex-col items-center justify-center py-20"
        >
          <p class="text-muted-foreground font-medium">暂无书籍</p>
          <p class="text-muted-foreground/60 mt-1 text-sm">
            你的微信读书书架还是空的
          </p>
        </div>

        <!-- Books grid -->
        <div
          v-else
          class="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          <div
            v-for="(book, index) in visibleBooks"
            :key="book.bookId"
            class="group cursor-pointer"
            :data-book-id="book.bookId"
          >
            <div
              class="bg-card hover:shadow-primary/5 relative aspect-2/3 overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              :style="{ animationDelay: `${index * 30}ms` }"
            >
              <img
                v-if="coverMap[book.bookId]"
                :src="coverMap[book.bookId]"
                :alt="book.title"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
                @error="
                  ($event.target as HTMLImageElement).style.display = 'none'
                "
              />
              <div
                v-else
                class="bg-muted flex h-full w-full items-center justify-center"
              >
                <span class="text-muted-foreground/40 font-serif text-2xl">{{
                  book.title.slice(0, 1)
                }}</span>
              </div>
              <div
                v-if="book.finishReading"
                class="bg-success/90 absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              >
                已读
              </div>
            </div>
            <div class="mt-2.5 px-0.5">
              <p
                class="text-foreground truncate text-sm font-medium"
                :title="book.title"
              >
                {{ book.title }}
              </p>
              <p class="text-muted-foreground truncate text-xs">
                {{ book.author }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WereadUserBook } from '@/api/wereadGateway';
import { useReadStatsStore } from '@/stores/readStats';
import { wereadService } from '@/service/wereadService/index';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { CloudSync } from '@lucide/vue';

const router = useRouter();
const isLoading = ref(true);
const errorMessage = ref('');
const books = ref<WereadUserBook[]>([]);
const coverMap = ref<Record<string, string>>({});

const isSyncing = ref(false);
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

const visibleBooks = computed(() => books.value.filter((b) => !b.secret));

let observer: IntersectionObserver | null = null;

const setupObserver = () => {
  observer?.disconnect();

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const bookId = (entry.target as HTMLElement).dataset.bookId;
        if (!bookId || coverMap.value[bookId]) {
          observer!.unobserve(entry.target);
          continue;
        }
        observer!.unobserve(entry.target);
        loadCover(bookId);
      }
    },
    { rootMargin: '200px' },
  );

  document.querySelectorAll('[data-book-id]').forEach((el) => {
    observer!.observe(el);
  });
};

const loadCover = async (bookId: string) => {
  if (coverMap.value[bookId]) return;
  try {
    const res = await wereadService.getBookInfo(bookId);
    if (res.status === 'success' && res.data?.cover) {
      coverMap.value = { ...coverMap.value, [bookId]: res.data.cover };
    }
  } catch {
    /* ignore failed cover loads */
  }
};

const handleBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
};

const fetchBooks = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const res = await wereadService.getUserShelf();
    if (res.status === 'success' && res.data) {
      books.value = res.data.user_books;
    } else {
      throw new Error(res.message || '获取书架失败');
    }
  } catch (err: unknown) {
    const error = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      error?.response?.data?.message || error?.message || '获取书架失败';
  } finally {
    isLoading.value = false;
  }
};

const handleSync = async () => {
  isSyncing.value = true;
  try {
    const res = await wereadService.syncMyBooks();
    if (res.status === 'success') {
      await fetchBooks();
      await nextTick();
      setupObserver();
    } else {
      throw new Error(res.message || '同步失败');
    }
  } catch (err: unknown) {
    const error = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      error?.response?.data?.message || error?.message || '同步失败';
  } finally {
    isSyncing.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchBooks(), statsStore.fetchStats()]);
  await nextTick();
  setupObserver();
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>
