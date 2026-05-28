<template>
  <div
    class="book-card group bg-card dark:bg-card m-2 overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
  >
    <!-- 封面区域 -->
    <div class="bg-muted relative aspect-2/3 overflow-hidden dark:bg-gray-700">
      <img
        v-if="book.cover && !coverError"
        :src="coverSrc"
        :alt="book.title"
        class="book-cover h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        @error="handleImageError"
      />
      <!-- 封面占位 -->
      <div v-else class="flex h-full w-full items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="text-muted-foreground dark:text-muted-foreground h-16 w-16"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </div>
      <!-- 状态徽章 -->
      <div class="absolute top-2 right-2">
        <span
          :class="[
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            badge.class,
          ]"
        >
          {{ badge.text }}
        </span>
      </div>
    </div>
    <!-- 书籍信息 -->
    <div class="p-4">
      <h3
        class="text-foreground dark:text-foreground truncate text-base font-semibold"
        :title="book.title"
      >
        {{ book.title }}
      </h3>
      <p
        class="text-muted-foreground dark:text-muted-foreground mt-1 truncate text-sm opacity-70"
      >
        {{ book.author }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookItem } from '@/types';
import { computed, ref } from 'vue';

interface Badge {
  text: string;
  class: string;
}

const props = defineProps<{
  book: BookItem;
}>();

const coverError = ref(false);

const badge = computed<Badge>(() => {
  if (props.book.iscompleted) {
    return {
      text: '已读',
      class:
        'bg-success/20 text-success dark:bg-green-400/10 dark:text-green-400',
    };
  }
  return {
    text: '在读',
    class: 'bg-primary/20 text-primary dark:bg-blue-400/10 dark:text-blue-400',
  };
});

const handleImageError = () => {
  coverError.value = true;
};

const coverSrc = computed(() => {
  const raw = props.book.cover?.trim() || '';
  if (!raw) return '';

  if (raw.startsWith('/api/v1/rss/image-proxy?')) {
    return raw;
  }

  // data URL 与同源相对路径无需代理
  if (raw.startsWith('data:') || raw.startsWith('/')) {
    return raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    return `/api/v1/rss/image-proxy?url=${encodeURIComponent(raw)}`;
  }

  return raw;
});
</script>
