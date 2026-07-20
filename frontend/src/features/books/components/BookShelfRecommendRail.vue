<template>
  <BookRecommendGrid
    :books="books"
    :loading="loading"
    :has-more="hasMore"
    :error="error"
    section-class="mb-8"
    hide-when-empty
    @refresh="$emit('refresh')"
    @load-more="$emit('loadMore')"
  >
    <template #header="{ loading: isLoading, onRefresh }">
      <header
        class="mb-3 flex items-baseline justify-between gap-3"
        aria-labelledby="shelf-recommend-heading"
      >
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
          :disabled="isLoading"
          @click="onRefresh"
          aria-label="换一批"
        >
          <RefreshCw
            class="h-3.5 w-3.5"
            :class="{ 'animate-spin': isLoading && books.length > 0 }"
          />
          换一批
        </button>
      </header>
    </template>

    <template #card="{ book, open, ratingScore }">
      <button
        type="button"
        class="group block w-28 flex-shrink-0 snap-start text-left sm:w-32 md:w-36"
        @click="open(book)"
      >
        <Motion
          :layoutId="RECOMMEND_COVER_LAYOUT_ID_PREFIX + book.bookId"
          class="bg-background relative aspect-3/4 overflow-hidden rounded-xl shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
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
    </template>

    <template #load-more="{ loading: isLoading, onLoadMore }">
      <button
        type="button"
        class="border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground flex w-28 flex-shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs transition-colors disabled:opacity-50 sm:w-32 md:w-36"
        :disabled="isLoading"
        @click="onLoadMore"
        aria-label="加载更多推荐"
      >
        <ArrowRight class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        <span>{{ isLoading ? '加载中…' : '更多' }}</span>
      </button>
    </template>
  </BookRecommendGrid>
</template>

<script setup lang="ts">
import type { BookRecommendItem } from '@/features/books/api';
import { ArrowRight, RefreshCw, Star } from '@lucide/vue';
import { Motion } from 'motion-v';
import BookRecommendGrid from '@/features/books/components/BookRecommendGrid.vue';
import { RECOMMEND_COVER_LAYOUT_ID_PREFIX } from '@/features/books/helper/recommendLayoutId';

defineProps<{
  books: BookRecommendItem[];
  loading: boolean;
  hasMore: boolean;
  error?: string;
}>();

defineEmits<{
  (e: 'refresh'): void;
  (e: 'loadMore'): void;
}>();
</script>
