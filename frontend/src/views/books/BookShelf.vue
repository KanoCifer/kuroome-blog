<template>
  <div class="bg-background flex min-h-[calc(100dvh-4rem)] flex-col">
    <BookShelfHero
      :book-count="isLoading ? null : displayedBooks.length"
      :is-syncing="isSyncing"
      @sync="handleSync"
    >
      <template #ribbon>
        <BookShelfStatsBar />
      </template>
    </BookShelfHero>

    <!-- Books Section -->
    <div class="flex-1 pb-8">
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-10">
        <!-- Loading skeleton -->
        <div v-if="isLoading">
          <div class="bg-muted mb-4 h-9 w-full animate-pulse rounded-xl" />
          <div
            class="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            <div v-for="i in 8" :key="i" class="animate-pulse">
              <div class="bg-muted aspect-3/4 rounded-xl" />
              <div class="mt-2 space-y-1.5 px-1.5">
                <div class="bg-muted h-3 w-5/6 rounded" />
                <div class="bg-muted h-3 w-3/4 rounded" />
                <div class="bg-muted h-2.5 w-1/2 rounded" />
              </div>
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

        <!-- Has books: toolbar + (reading rail) + grid/list -->
        <template v-else>
          <BookShelfToolbar
            v-model:searchQuery="searchQuery"
            v-model:filter="filter"
            v-model:sort="sort"
            v-model:density="density"
            :counts="counts"
          />

          <!-- 「你正在读」横向 rail:仅 filter=all 且非搜索状态时显示 -->
          <BookShelfReadingRail
            v-if="showReadingRail"
            :books="recentReading"
            @select="selectBook"
          />

          <!-- 「接下来读什么」推荐 rail:同样仅 filter=all 且非搜索状态时显示 -->
          <BookShelfRecommendRail
            v-if="showRecommendRail"
            :books="statsStore.recommends"
            :loading="statsStore.isLoadingRecommends"
            :has-more="statsStore.hasMoreRecommends"
            :error="statsStore.recommendError"
            @refresh="reloadRecommends"
            @load-more="loadMoreRecommends"
          />

          <!-- 分区标题(filter=all 时给"全部书架"一个 section 标识) -->
          <header
            v-if="filter === 'all' && (showReadingRail || showRecommendRail)"
            class="mt-2 mb-3 flex items-baseline justify-between"
          >
            <h2
              class="text-foreground font-serif text-xl font-bold md:text-2xl"
            >
              全部书架
            </h2>
            <span class="text-muted-foreground text-xs tabular-nums">
              {{ displayedBooks.length }} 本
            </span>
          </header>

          <!-- No results -->
          <div
            v-if="displayedBooks.length === 0"
            class="flex flex-col items-center justify-center py-16"
          >
            <p class="text-muted-foreground text-sm">
              {{ noResultMessage }}
            </p>
          </div>

          <!-- List variant -->
          <div v-else-if="density === 'list'" class="flex flex-col gap-2">
            <WereadBookCard
              v-for="(book, index) in displayedBooks"
              :key="book.bookId"
              :book="book"
              :index="index"
              variant="list"
              @select="selectBook"
            />
          </div>

          <!-- Grid variant -->
          <div v-else :class="gridClass">
            <WereadBookCard
              v-for="(book, index) in displayedBooks"
              :key="book.bookId"
              :book="book"
              :index="index"
              @select="selectBook"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- 详情面板 -->
    <WereadBookDetailPanel
      :book="selectedBook"
      :open="isOpen"
      @close="close"
    />
  </div>
</template>

<script setup lang="ts">
import { useWereadShelf } from '@/composables/useWereadShelf';
import { useReadStatsStore } from '@/stores/readStats';
import WereadBookCard from '@/components/weread/WereadBookCard.vue';
import WereadBookDetailPanel from '@/components/weread/WereadBookDetailPanel.vue';
import { useWereadBookDetailSingleton } from '@/components/weread/composables/useWereadBookDetailSingleton';
import { onMounted } from 'vue';
import BookShelfHero from './components/BookShelfHero.vue';
import BookShelfReadingRail from './components/BookShelfReadingRail.vue';
import BookShelfRecommendRail from './components/BookShelfRecommendRail.vue';
import BookShelfStatsBar from './components/BookShelfStatsBar.vue';
import BookShelfToolbar from './components/BookShelfToolbar.vue';
import { useShelfView } from './composables/useShelfView';

const statsStore = useReadStatsStore();

const {
  isLoading,
  errorMessage,
  isSyncing,
  visibleBooks,
  fetchBooks,
  handleSync,
} = useWereadShelf();

// ── 详情面板状态 (单例 — 整个应用共享同一份) ────────────────
const { selectedBook, isOpen, selectBook, close } = useWereadBookDetailSingleton();

// ── 视图状态机: 偏好 / 分桶 / 排序 / 派生 UI ───────────────
const {
  searchQuery,
  filter,
  sort,
  density,
  counts,
  recentReading,
  showReadingRail,
  showRecommendRail,
  displayedBooks,
  gridClass,
  noResultMessage,
} = useShelfView(visibleBooks);

function reloadRecommends() {
  statsStore.fetchRecommends(true);
}
function loadMoreRecommends() {
  statsStore.fetchRecommends(false);
}

onMounted(async () => {
  await Promise.all([fetchBooks(), statsStore.fetchStats()]);
  // 推荐独立拉取(已被 BookStats 拉过则不重复)
  if (statsStore.recommends.length === 0) {
    statsStore.fetchRecommends(true);
  }
});
</script>
