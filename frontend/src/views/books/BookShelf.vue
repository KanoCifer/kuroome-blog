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
            @select="handleBookClick"
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
            <BookCard
              v-for="(book, index) in displayedBooks"
              :key="book.bookId"
              :book="book"
              :index="index"
              variant="list"
              @select="handleBookClick"
            />
          </div>

          <!-- Grid variant -->
          <div v-else :class="gridClass">
            <BookCard
              v-for="(book, index) in displayedBooks"
              :key="book.bookId"
              :book="book"
              :index="index"
              :variant="density"
              @select="handleBookClick"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WereadUserBook } from '@/api/wereadGateway';
import { useWereadShelf } from '@/composables/useWereadShelf';
import { useReadStatsStore } from '@/stores/readStats';
import dayjs from 'dayjs';
import { computed, onMounted, ref, watch } from 'vue';
import BookCard from './components/BookCard.vue';
import BookShelfHero from './components/BookShelfHero.vue';
import BookShelfReadingRail from './components/BookShelfReadingRail.vue';
import BookShelfRecommendRail from './components/BookShelfRecommendRail.vue';
import BookShelfStatsBar from './components/BookShelfStatsBar.vue';
import BookShelfToolbar from './components/BookShelfToolbar.vue';
import type {
  ShelfDensity,
  ShelfFilter,
  ShelfSort,
} from './components/BookShelfToolbar.vue';

const STORAGE_KEY = 'bookshelf:view-prefs';

const searchQuery = ref('');
const filter = ref<ShelfFilter>('all');
const sort = ref<ShelfSort>('recent');
const density = ref<ShelfDensity>('standard');

// 读偏好
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw) as {
      filter?: ShelfFilter;
      sort?: ShelfSort;
      density?: ShelfDensity;
    };
    if (saved.filter) filter.value = saved.filter;
    if (saved.sort) sort.value = saved.sort;
    if (saved.density) density.value = saved.density;
  }
} catch {
  /* ignore */
}

// 写偏好
watch([filter, sort, density], ([f, s, d]) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ filter: f, sort: s, density: d }),
    );
  } catch {
    /* ignore */
  }
});

const statsStore = useReadStatsStore();

const {
  isLoading,
  errorMessage,
  isSyncing,
  visibleBooks,
  fetchBooks,
  handleSync,
} = useWereadShelf();

// ── 状态分桶 ─────────────────────────────────────────────────
const buckets = computed(() => {
  const reading: WereadUserBook[] = [];
  const finished: WereadUserBook[] = [];
  const wishlist: WereadUserBook[] = [];
  for (const b of visibleBooks.value) {
    if (b.finishReading) finished.push(b);
    else if (b.readUpdateTime) reading.push(b);
    else wishlist.push(b);
  }
  return { reading, finished, wishlist };
});

const counts = computed(() => ({
  all: visibleBooks.value.length,
  reading: buckets.value.reading.length,
  finished: buckets.value.finished.length,
  wishlist: buckets.value.wishlist.length,
}));

// ── 「你正在读」横向 rail 数据(最近翻开的 12 本)─────────────
const recentReading = computed(() => {
  return [...buckets.value.reading]
    .sort((a, b) => {
      const ta = a.readUpdateTime ? dayjs(a.readUpdateTime).valueOf() : 0;
      const tb = b.readUpdateTime ? dayjs(b.readUpdateTime).valueOf() : 0;
      return tb - ta;
    })
    .slice(0, 12);
});

const showReadingRail = computed(
  () =>
    filter.value === 'all' &&
    searchQuery.value.trim() === '' &&
    recentReading.value.length > 0,
);

// ── 推荐 rail 显示条件:filter=all 且非搜索时露出 ────────────
const showRecommendRail = computed(
  () => filter.value === 'all' && searchQuery.value.trim() === '',
);

function reloadRecommends() {
  statsStore.fetchRecommends(true);
}
function loadMoreRecommends() {
  statsStore.fetchRecommends(false);
}

// ── 筛选 + 搜索 + 排序 ───────────────────────────────────────
const displayedBooks = computed(() => {
  let list: WereadUserBook[];
  if (filter.value === 'reading') list = buckets.value.reading;
  else if (filter.value === 'finished') list = buckets.value.finished;
  else if (filter.value === 'wishlist') list = buckets.value.wishlist;
  else list = visibleBooks.value;

  // 搜索
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
    );
  }

  // 排序
  const sorted = [...list];
  if (sort.value === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
  } else if (sort.value === 'author') {
    sorted.sort((a, b) =>
      (a.author || '').localeCompare(b.author || '', 'zh-Hans-CN'),
    );
  } else {
    // recent: isTop 置顶,然后 readUpdateTime DESC,null 排末尾
    sorted.sort((a, b) => {
      if (a.isTop !== b.isTop) return a.isTop ? -1 : 1;
      const ta = a.readUpdateTime ? dayjs(a.readUpdateTime).valueOf() : 0;
      const tb = b.readUpdateTime ? dayjs(b.readUpdateTime).valueOf() : 0;
      return tb - ta;
    });
  }
  return sorted;
});

// ── Grid 类名(按密度变列数和间距)─────────────────────────────
const gridClass = computed(() => {
  if (density.value === 'compact') {
    return 'grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8';
  }
  // standard
  return 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
});

// ── 空结果文案 ───────────────────────────────────────────────
const noResultMessage = computed(() => {
  const q = searchQuery.value.trim();
  if (q) return `没有找到「${q}」相关的书籍`;
  if (filter.value === 'reading') return '当前没有在读的书';
  if (filter.value === 'finished') return '还没有读完的书';
  if (filter.value === 'wishlist') return '没有待读的书';
  return '暂无书籍';
});

const handleBookClick = (bookId: string) => {
  const link = document.createElement('a');
  link.href = `weread://reading?bId=${bookId}`;
  link.click();
};

onMounted(async () => {
  await Promise.all([fetchBooks(), statsStore.fetchStats()]);
  // 推荐独立拉取(已被 BookStats 拉过则不重复)
  if (statsStore.recommends.length === 0) {
    statsStore.fetchRecommends(true);
  }
});
</script>
