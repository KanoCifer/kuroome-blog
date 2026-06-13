<template>
  <section
    v-if="shouldRender"
    class="mb-8"
    aria-labelledby="shelf-recommend-heading"
  >
    <header class="mb-3 flex items-baseline justify-between gap-3">
      <div class="flex items-baseline gap-2">
        <h2
          id="shelf-recommend-heading"
          class="text-foreground font-serif text-xl font-bold md:text-2xl"
        >
          接下来读什么
        </h2>
        <span class="text-muted-foreground text-xs">按你的偏好挑的</span>
      </div>
      <button
        type="button"
        class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="loading"
        @click="$emit('refresh')"
        aria-label="换一批"
      >
        <RefreshCw
          class="h-3.5 w-3.5"
          :class="{ 'animate-spin': loading && books.length > 0 }"
        />
        换一批
      </button>
    </header>

    <!-- Skeleton -->
    <div
      v-if="showSkeleton"
      class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:gap-4 sm:px-6 md:-mx-10 md:px-10"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="w-28 flex-shrink-0 animate-pulse sm:w-32 md:w-36"
      >
        <div class="bg-muted aspect-3/4 rounded-xl" />
        <div class="mt-2 space-y-1.5 px-1">
          <div class="bg-muted h-3 w-5/6 rounded" />
          <div class="bg-muted h-2.5 w-1/2 rounded" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error && books.length === 0"
      class="border-border/60 text-muted-foreground flex flex-col items-center justify-center rounded-2xl border border-dashed py-8 text-center text-sm"
    >
      <p class="text-destructive mb-3 text-xs">{{ error }}</p>
      <button
        type="button"
        class="bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
        @click="$emit('refresh')"
      >
        重试
      </button>
    </div>

    <!-- Empty(loading 完且无数据,不报错)-->
    <div
      v-else-if="!loading && books.length === 0"
      class="border-border/60 text-muted-foreground rounded-2xl border border-dashed py-8 text-center text-xs"
    >
      暂时没有推荐
    </div>

    <!-- Carousel -->
    <div
      v-else
      ref="railEl"
      class="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 md:-mx-10 md:scroll-px-10 md:px-10 [&::-webkit-scrollbar]:hidden"
    >
      <button
        v-for="book in books"
        :key="book.bookId"
        type="button"
        class="group block w-28 flex-shrink-0 snap-start text-left sm:w-32 md:w-36"
        @click="openBook(book)"
      >
        <Motion
          :layoutId="RECOMMEND_COVER_LAYOUT_ID_PREFIX + book.bookId"
          class="bg-card relative aspect-3/4 overflow-hidden rounded-xl shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
        >
          <img
            v-if="book.cover"
            :src="book.cover"
            :alt="book.title"
            loading="lazy"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
          <div
            v-else
            class="bg-muted flex h-full w-full items-center justify-center"
          >
            <span class="text-muted-foreground/40 font-serif text-2xl">
              {{ book.title.slice(0, 1) }}
            </span>
          </div>

          <!-- 评分角标 -->
          <span
            v-if="book.newRating > 0"
            class="bg-background/85 text-foreground absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums backdrop-blur-md"
          >
            <Star class="text-primary h-2.5 w-2.5 fill-current" />
            {{ ratingScore(book.newRating) }}
          </span>
        </Motion>
        <p
          class="text-foreground mt-2 line-clamp-2 px-1 text-xs leading-snug font-medium"
          :title="book.title"
        >
          {{ book.title }}
        </p>
        <p
          v-if="book.author"
          class="text-muted-foreground mt-0.5 truncate px-1 text-[11px]"
          :title="book.author"
        >
          {{ book.author }}
        </p>
        <p
          v-if="book.reason"
          class="text-muted-foreground/70 mt-1 line-clamp-2 px-1 text-[10.5px] leading-snug"
          :title="book.reason"
        >
          {{ book.reason }}
        </p>
      </button>

      <!-- 更多卡片 -->
      <button
        v-if="hasMore"
        type="button"
        class="border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground flex w-28 flex-shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs transition-colors disabled:opacity-50 sm:w-32 md:w-36"
        :disabled="loading"
        @click="$emit('loadMore')"
        aria-label="加载更多推荐"
      >
        <ArrowRight class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        <span>{{ loading ? '加载中…' : '更多' }}</span>
      </button>
    </div>

    <BookRecommendDetail :book="activeBook" @close="closeBook" />
  </section>
</template>

<script setup lang="ts">
import type { BookRecommendItem } from '@/api/wereadGateway';
import { ArrowRight, RefreshCw, Star } from '@lucide/vue';
import { Motion } from 'motion-v';
import { computed, ref } from 'vue';
import BookRecommendDetail from '../bookStats/components/BookRecommendDetail.vue';
import { RECOMMEND_COVER_LAYOUT_ID_PREFIX } from '../bookStats/components/recommendLayoutId';

const props = defineProps<{
  books: BookRecommendItem[];
  loading: boolean;
  hasMore: boolean;
  error?: string;
}>();

defineEmits<{
  (e: 'refresh'): void;
  (e: 'loadMore'): void;
}>();

const showSkeleton = computed(() => props.loading && props.books.length === 0);

// 始终显示 section header(让用户知道有这区块),除非完全没数据且没在 loading 且没错误
const shouldRender = computed(
  () => props.loading || props.books.length > 0 || !!props.error,
);

/** 远端 newRating 是 0-100 整数,转成 0-10 分小数 */
function ratingScore(v: number): string {
  if (!v || v <= 0) return '--';
  return ((v / 100) * 10).toFixed(1);
}

/** 当前打开的推荐书；null = 模态关闭 */
const activeBook = ref<BookRecommendItem | null>(null);

function openBook(book: BookRecommendItem) {
  activeBook.value = book;
}

function closeBook() {
  activeBook.value = null;
}
</script>
