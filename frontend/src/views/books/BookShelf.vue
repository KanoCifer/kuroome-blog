<template>
  <div
    class="bg-muted/70 mx-auto my-24 min-h-screen max-w-5xl rounded-4xl px-4 py-8 sm:px-6 lg:px-8"
  >
    <div class="mx-auto">
      <!-- 页面标题 -->
      <div class="mb-8 flex items-center gap-3">
        <div
          class="bg-primary/15 text-primary flex h-12 w-12 items-center justify-center rounded-xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-7 w-7"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-6">
            <h1 class="text-foreground font-serif text-3xl font-bold">
              我的书架
            </h1>
            <span
              class="border-primary/30 bg-primary/20 text-primary self-center rounded-full border px-4 py-2 text-xs"
              >{{ books_count }}</span
            >
          </div>
          <p class="text-muted-foreground mt-1 text-sm">管理您的阅读收藏</p>
        </div>
      </div>

      <!-- 加载状态 - 骨架屏 -->
      <div
        v-if="isLoading"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="i in 6"
          :key="i"
          class="bg-card animate-pulse overflow-hidden rounded-xl shadow-sm"
        >
          <div class="bg-muted aspect-2/3" />
          <div class="p-4">
            <div class="bg-muted mb-2 h-5 w-3/4 rounded" />
            <div class="bg-muted h-4 w-1/2 rounded" />
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div
        v-else-if="errorMessage"
        class="bg-card flex flex-col items-center justify-center rounded-2xl py-16 shadow-sm"
      >
        <div
          class="bg-destructive/15 text-destructive mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-8 w-8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <p class="text-destructive mb-4 text-center">
          {{ errorMessage }}
        </p>
        <button
          type="button"
          class="bg-destructive text-primary-foreground shadow-destructive/30 hover:bg-destructive/90 focus:ring-destructive inline-flex items-center gap-2 rounded-xl px-6 py-2.5 font-semibold shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
          @click="() => fetchBooks()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.731 4.002l.129-.143a8.25 8.25 0 0113.803 3.7M4.731 4.002l3.181-3.182"
            />
          </svg>
          重试
        </button>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="books.length === 0"
        class="bg-card flex flex-col items-center justify-center rounded-2xl py-16 shadow-sm"
      >
        <div
          class="bg-muted text-muted-foreground mb-4 flex h-20 w-20 items-center justify-center rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-10 w-10"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <h3 class="text-foreground mb-2 font-serif text-xl font-semibold">
          暂无书籍
        </h3>
        <p class="text-muted-foreground mb-6 text-center">
          您的书架还是空的，快去导入一些书籍吧
        </p>
        <router-link
          to="/import"
          class="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 focus:ring-primary inline-flex items-center gap-2 rounded-xl px-6 py-2.5 font-semibold shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          导入书籍
        </router-link>
      </div>

      <!-- 书籍 Grid -->
      <transition
        enter-active-class="transition-all transition-gpu duration-500 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
      >
        <div
          v-if="!isLoading && !errorMessage && books.length > 0"
          class="book-grid-animation grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          <BookCard v-for="book in books" :key="book.id" :book="book" />
        </div>
      </transition>
      <!-- 分页 -->
      <div
        v-if="pagination && pagination.pages > 1"
        class="mt-8 flex justify-center"
      >
        <nav class="flex items-center gap-2">
          <!-- 上一页 -->
          <button
            :disabled="!pagination.has_prev"
            class="hover:bg-accent rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              pagination?.has_prev ? 'text-foreground' : 'text-muted-foreground'
            "
            @click="goToPage(pagination!.prev_num!)"
            type="button"
          >
            上一页
          </button>

          <!-- 页码 -->
          <div class="flex items-center gap-1">
            <!-- 显示第一页 -->
            <button
              v-if="pagination && pagination.page > 3"
              class="min-w-32px text-foreground hover:bg-accent rounded-lg px-2 py-2 text-sm font-medium"
              @click="goToPage(1)"
              type="button"
            >
              1
            </button>

            <!-- 省略号 -->
            <span
              v-if="pagination && pagination.page > 4"
              class="text-muted-foreground px-1"
              >...</span
            >

            <!-- 显示当前页附近的页码 -->
            <button
              v-for="pageNum in getVisiblePages"
              :key="pageNum"
              class="min-w-32px rounded-lg px-2 py-2 text-sm font-medium transition-colors"
              :class="
                pageNum === pagination?.page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              "
              @click="goToPage(pageNum)"
              type="button"
            >
              {{ pageNum }}
            </button>

            <!-- 省略号 -->
            <span
              v-if="pagination && pagination.page < pagination.pages - 3"
              class="text-muted-foreground px-1"
              >...</span
            >

            <!-- 显示最后一页 -->
            <button
              v-if="pagination && pagination.page < pagination.pages - 2"
              class="min-w-32px text-foreground hover:bg-accent rounded-lg px-2 py-2 text-sm font-medium"
              @click="goToPage(pagination.pages)"
              type="button"
            >
              {{ pagination.pages }}
            </button>
          </div>

          <!-- 下一页 -->
          <button
            :disabled="!pagination?.has_next"
            class="hover:bg-accent rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              pagination?.has_next ? 'text-foreground' : 'text-muted-foreground'
            "
            @click="goToPage(pagination!.next_num!)"
            type="button"
          >
            下一页
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BookCard from '@/components/books/BookCard.vue';
import { bookService } from '@/service/bookService';
import type { BookItem, Pagination } from '@/types';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

// 响应式状态
const books = ref<BookItem[]>([]);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>('');
const pagination = ref<Pagination | null>(null);
const currentPage = ref<number>(1);
const books_count = ref<number>(0);

// 获取可见页码范围
const getVisiblePages = computed(() => {
  if (!pagination.value) return [];

  const totalPages = pagination.value.pages;
  const current = pagination.value.page;
  const visiblePages = [];

  // 显示当前页附近的页码
  for (
    let i = Math.max(2, current - 2);
    i <= Math.min(totalPages - 1, current + 2);
    i++
  ) {
    visiblePages.push(i);
  }

  return visiblePages;
});

// 数据获取
const fetchBooks = async (page: number = 1) => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const res = await bookService.getBooks({ page, per_page: 12 });
    if (res.status === 'success') {
      books.value = res.data?.books || [];
      //
      books_count.value = res.data?.pagination?.total || 0;
      pagination.value = res.data?.pagination || null;
      currentPage.value = page;
    } else {
      throw new Error(res.message || '获取书籍列表失败');
    }
  } catch (err: unknown) {
    const error = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      error?.response?.data?.message || error?.message || '获取书籍列表失败';
  } finally {
    isLoading.value = false;
  }
};

// 分页导航
const goToPage = (page: number) => {
  if (page >= 1 && pagination.value && page <= pagination.value.pages) {
    fetchBooks(page);
  }
};

onMounted(async () => {
  // initial fetch and rewrite image urls after DOM is rendered
  await fetchBooks();
});
</script>

<style scoped>
.book-grid-animation :deep(.book-card-wrapper) {
  animation-delay: calc(var(--index) * 0.1s);
}

/* 为每个书籍卡片添加动画延迟 */
.book-grid-animation > *:nth-child(1) {
  --index: 1;
}
.book-grid-animation > *:nth-child(2) {
  --index: 2;
}
.book-grid-animation > *:nth-child(3) {
  --index: 3;
}
.book-grid-animation > *:nth-child(4) {
  --index: 4;
}
.book-grid-animation > *:nth-child(5) {
  --index: 5;
}
.book-grid-animation > *:nth-child(6) {
  --index: 6;
}
.book-grid-animation > *:nth-child(7) {
  --index: 7;
}
.book-grid-animation > *:nth-child(8) {
  --index: 8;
}
.book-grid-animation > *:nth-child(9) {
  --index: 9;
}
.book-grid-animation > *:nth-child(10) {
  --index: 10;
}
.book-grid-animation > *:nth-child(11) {
  --index: 11;
}
.book-grid-animation > *:nth-child(12) {
  --index: 12;
}
</style>
