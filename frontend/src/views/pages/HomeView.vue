<script setup lang="ts">
import AddBookForm from '@/components/books/AddBookForm.vue';
import BookActionButtons from '@/components/books/BookActionButtons.vue';
import HomeSideBar from '@/components/layout/HomeSideBar.vue';
import MessageBoard from '@/components/message/MessageBoard.vue';
import { bookService } from '@/service/bookService';
import { useNotificationStore } from '@/stores/notification';
import type { BookItem, Pagination } from '@/types';
import { useHead } from '@vueuse/head';
import { computed, ref } from 'vue';
useHead({
  title: "Kuroome's Blog - 个人阅读清单与博客",
  meta: [
    {
      name: 'description',
      content: '个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录',
    },
    { name: 'keywords', content: '阅读清单,博客,书籍管理,个人知识库' },
    { property: 'og:title', content: "Kuroome's Blog - 个人阅读清单与博客" },
    {
      property: 'og:description',
      content: '个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录',
    },
    { property: 'og:type', content: 'website' },
    { property: 'twitter:card', content: 'summary' },
    {
      property: 'twitter:title',
      content: "Kuroome's Blog - 个人阅读清单与博客",
    },
    {
      property: 'twitter:description',
      content: '个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录',
    },
  ],
});

const books = ref<BookItem[]>([]);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>('');
const pendingBookId = ref<number | null>(null);
const pagination = ref<Pagination | null>(null);
const currentPage = ref<number>(1);
const notifier = useNotificationStore();
const addBookFormRef = ref<InstanceType<typeof AddBookForm> | null>(null);
// 获取可见页码范围
const getVisiblePages = computed(() => {
  if (!pagination.value) return [];

  const totalPages = pagination.value.pages;
  const current = pagination.value.page;
  const visiblePages: number[] = [];

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

const fetchBooks = async (page: number = 1) => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const res = await bookService.getBooks({ page, per_page: 20 });
    books.value = res.data?.books ?? [];
    pagination.value = res.data?.pagination ?? null;
    currentPage.value = page;
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value = '加载书籍失败，请稍后重试。';
    notifier.error(errorMessage.value);
    books.value = [];
    pagination.value = null;
    currentPage.value = 1;
  } finally {
    isLoading.value = false;
  }
};

fetchBooks();

const toggleBookStatus = async (book: BookItem) => {
  pendingBookId.value = book.id;
  try {
    await bookService.patchBookStatus(book.id, {
      iscompleted: !book.iscompleted,
    });
    books.value = books.value.map((item) =>
      item.id === book.id
        ? {
            ...item,
            iscompleted: !item.iscompleted,
          }
        : item,
    );
    notifier.success('更新状态成功');
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value = '更新阅读状态失败，请稍后重试。';
    notifier.error(errorMessage.value);
  } finally {
    pendingBookId.value = null;
  }
};

const deleteBook = async (book: BookItem) => {
  pendingBookId.value = book.id;
  try {
    await bookService.deleteBook(book.id);
    books.value = books.value.filter((item) => item.id !== book.id);
    notifier.success('删除成功');
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value = '删除书籍失败，请稍后重试。';
    notifier.error(errorMessage.value);
  } finally {
    pendingBookId.value = null;
  }
};

const editBook = (book: BookItem) => {
  if (addBookFormRef.value) {
    addBookFormRef.value.startEditing(book);
    // 滚动到表单
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// 分页导航
const goToPage = (page: number) => {
  if (page >= 1 && pagination.value && page <= pagination.value.pages) {
    fetchBooks(page);
  }
};
</script>

<template>
  <div class="mx-auto my-24 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
    <!-- 左侧：书籍列表和添加表单 -->
    <div class="lg:col-span-2">
      <!-- 使用组件：AddBookForm（子组件通过 emit("book-added") 通知父组件） -->
      <AddBookForm
        ref="addBookFormRef"
        @book-added="fetchBooks"
        @book-updated="fetchBooks"
      />

      <!-- 主视图 -->
      <!-- 书籍列表 -->
      <div class="min-h-fit space-y-4">
        <h2
          class="text-foreground mb-4 flex items-baseline font-serif text-2xl font-bold"
        >
          Reading List
        </h2>

        <div v-if="isLoading" aria-hidden="true">
          <!-- Skeleton placeholders (fixed height) to reserve space and prevent layout shift -->
          <ul class="space-y-3">
            <li class="bg-muted h-20 animate-pulse rounded-xl"></li>
            <li class="bg-muted h-20 animate-pulse rounded-xl"></li>
            <li class="bg-muted h-20 animate-pulse rounded-xl"></li>
          </ul>
        </div>
        <div
          v-else-if="errorMessage"
          class="bg-destructive/10 text-destructive flex min-h-20 w-full flex-col items-center justify-center rounded-2xl border border-dotted object-center py-4 text-center text-xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="text-destructive mb-4 h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p>
            {{ errorMessage }}
          </p>
        </div>
        <p v-else-if="books.length === 0" class="text-muted-foreground text-sm">
          暂无书籍，先添加一本吧。
        </p>

        <ul class="space-y-3" style="contain: layout">
          <li
            v-for="book in books"
            :key="book.id"
            class="group bg-card/80 hover:bg-accent relative flex min-h-20 flex-col gap-4 rounded-3xl p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p
                  class="text-foreground truncate text-lg font-semibold"
                  :title="book.title"
                >
                  {{ book.title }}
                </p>
                <span
                  v-if="book.iscompleted"
                  class="bg-success/10 text-success ring-success/30 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
                  >Done</span
                >
                <span
                  v-else
                  class="bg-warning/10 text-warning ring-warning/30 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
                  >Reading</span
                >
              </div>
              <p class="text-muted-foreground mt-1 text-sm">
                @ {{ book.author }}
              </p>
            </div>

            <BookActionButtons
              :book="book"
              :pending="pendingBookId === book.id"
              @toggle-status="toggleBookStatus"
              @delete-book="deleteBook"
              @edit-book="editBook"
            />
          </li>
        </ul>

        <!-- 分页 -->
        <div
          v-if="pagination && pagination.pages > 1"
          class="bg-muted mx-auto mt-8 flex w-fit justify-center rounded-2xl px-4 py-2"
        >
          <nav class="flex items-center gap-2">
            <!-- 上一页 -->
            <button
              :disabled="!pagination.has_prev"
              class="hover:bg-accent rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :class="
                pagination?.has_prev
                  ? 'text-foreground'
                  : 'text-muted-foreground'
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
                class="text-foreground hover:bg-accent rounded-lg px-2 py-2 text-sm font-medium"
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
                class="text-foreground hover:bg-accent rounded-lg px-2 py-2 text-sm font-medium"
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
                pagination?.has_next
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              "
              @click="goToPage(pagination!.next_num!)"
              type="button"
            >
              下一页
            </button>
          </nav>
        </div>
      </div>
      <!-- 留言板 -->
      <MessageBoard class="mt-12" />
    </div>
    <!-- 右侧边栏 -->
    <HomeSideBar />
  </div>
</template>
