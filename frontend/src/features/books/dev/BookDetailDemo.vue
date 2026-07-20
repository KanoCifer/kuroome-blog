<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHead } from '@unhead/vue';
import {
  wereadGateway,
  type WereadBookProgress,
  type WereadUserBook,
} from '@/features/books/api/weread';
import WereadBookCard from '@/features/books/components/WereadBookCard.vue';
import WereadBookDetailPanel from '@/features/books/components/WereadBookDetailPanel.vue';
import { useWereadBookDetailSingleton } from '@/features/books/composables/useWereadBookDetailSingleton';

useHead({
  title: '书籍详情面板演示 - Kuroome',
  meta: [
    {
      name: 'description',
      content:
        '书籍卡片点击打开浮层详情面板的演示,展示进度条、阅读统计、继续阅读入口。',
    },
  ],
});

// ── mock 数据 (6 本书) ─────────────────────────────────────────
interface MockBook extends Omit<WereadUserBook, 'readProgress'> {
  /** 演示用的 mock 进度,优先于真实 API 返回 */
  mockProgress: WereadBookProgress | null;
}

const now = Math.floor(Date.now() / 1000);

const mockBooks = ref<MockBook[]>([
  {
    id: 'mock-001',
    user_id: 1,
    bookId: 'mock-sapiens',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    cover: null,
    category: '历史',
    isTop: false,
    readUpdateTime: now - 86400 * 2,
    updateTime: now - 86400 * 2,
    finishReading: false,
    secret: false,
    updated_at: new Date().toISOString(),
    mockProgress: {
      chapterUid: 14,
      chapterOffset: 320,
      progress: 45,
      updateTime: now - 86400 * 2,
      readingTime: 12 * 3600 + 30 * 60,
      finishTime: null,
      isStartReading: '1',
    },
  },
  {
    id: 'mock-002',
    user_id: 1,
    bookId: 'mock-3body',
    title: '三体',
    author: '刘慈欣',
    cover: null,
    category: '科幻',
    isTop: true,
    readUpdateTime: now - 86400 * 30,
    updateTime: now - 86400 * 30,
    finishReading: true,
    secret: false,
    updated_at: new Date().toISOString(),
    mockProgress: {
      chapterUid: 38,
      chapterOffset: 0,
      progress: 100,
      updateTime: now - 86400 * 30,
      readingTime: 8 * 3600 + 15 * 60,
      finishTime: now - 86400 * 30,
      isStartReading: '1',
    },
  },
  {
    id: 'mock-003',
    user_id: 1,
    bookId: 'mock-tobelive',
    title: '活着',
    author: '余华',
    cover: null,
    category: '文学',
    isTop: false,
    readUpdateTime: null,
    updateTime: null,
    finishReading: false,
    secret: false,
    updated_at: new Date().toISOString(),
    mockProgress: null,
  },
  {
    id: 'mock-004',
    user_id: 1,
    bookId: 'mock-cienanos',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    cover: null,
    category: '文学',
    isTop: false,
    readUpdateTime: now - 86400 * 5,
    updateTime: now - 86400 * 5,
    finishReading: false,
    secret: false,
    updated_at: new Date().toISOString(),
    mockProgress: {
      chapterUid: 7,
      chapterOffset: 150,
      progress: 23,
      updateTime: now - 86400 * 5,
      readingTime: 4 * 3600 + 22 * 60,
      finishTime: null,
      isStartReading: '1',
    },
  },
  {
    id: 'mock-005',
    user_id: 1,
    bookId: 'mock-thinking',
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    cover: null,
    category: '心理学',
    isTop: false,
    readUpdateTime: now - 3600,
    updateTime: now - 3600,
    finishReading: false,
    secret: false,
    updated_at: new Date().toISOString(),
    mockProgress: {
      chapterUid: 22,
      chapterOffset: 480,
      progress: 67,
      updateTime: now - 3600,
      readingTime: 18 * 3600 + 45 * 60,
      finishTime: null,
      isStartReading: '1',
    },
  },
  {
    id: 'mock-006',
    user_id: 1,
    bookId: 'mock-zen',
    title: '禅与摩托车维修艺术',
    author: '罗伯特·M·波西格',
    cover: null,
    category: '哲学',
    isTop: false,
    readUpdateTime: null,
    updateTime: null,
    finishReading: false,
    secret: false,
    updated_at: new Date().toISOString(),
    mockProgress: null,
  },
]);

// ── 选中书的真实进度 (从 API 拿) ─────────────────────────────
const realProgress = ref<Record<string, WereadBookProgress | null>>({});

async function loadRealProgress(bookId: string): Promise<void> {
  if (realProgress.value[bookId] !== undefined) return; // 已加载
  try {
    const res = await wereadGateway.getBookProgress(bookId, false);
    realProgress.value = {
      ...realProgress.value,
      [bookId]: res.data ?? null,
    };
  } catch {
    realProgress.value = { ...realProgress.value, [bookId]: null };
  }
}

// ── 详情面板状态 (单例 — 与 BookShelf 共享) ────────────────
const { selectedBook, isOpen, selectBook, close } =
  useWereadBookDetailSingleton();

function handleCardClick(book: MockBook): void {
  // 转成 WereadUserBook 喂给 panel
  const userBook: WereadUserBook = {
    id: book.id,
    user_id: book.user_id,
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    cover: book.cover,
    category: book.category,
    isTop: book.isTop,
    readUpdateTime: book.readUpdateTime,
    updateTime: book.updateTime,
    finishReading: book.finishReading,
    secret: book.secret,
    readProgress: realProgress.value[book.bookId] ?? book.mockProgress,
    updated_at: book.updated_at,
  };
  selectBook(userBook);
  void loadRealProgress(book.bookId);
}

// panel 当前显示用的进度 (mock 优先,API 拿到的真实数据为辅)
const currentProgress = computed<WereadBookProgress | null>(() => {
  if (!selectedBook.value) return null;
  return (
    realProgress.value[selectedBook.value.bookId] ??
    mockBooks.value.find((b) => b.bookId === selectedBook.value!.bookId)
      ?.mockProgress ??
    null
  );
});
</script>

<template>
  <div class="bg-background min-h-[calc(100dvh-4rem)]">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
      <!-- header -->
      <header class="mb-8 sm:mb-12">
        <p
          class="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase"
        >
          Demo · Book Detail Panel
        </p>
        <h1
          class="text-foreground font-serif text-3xl font-semibold sm:text-4xl"
        >
          书籍详情面板
        </h1>
        <p class="text-muted-foreground mt-3 max-w-2xl text-sm sm:text-base">
          点击下方任意一张卡片,弹出详情浮层;点空白处或右上角 ×
          关闭。面板内含进度、阅读统计、继续阅读入口。
        </p>
      </header>

      <!-- 卡片网格 -->
      <div
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <WereadBookCard
          v-for="book in mockBooks"
          :key="book.bookId"
          :book="{
            id: book.id,
            user_id: book.user_id,
            bookId: book.bookId,
            title: book.title,
            author: book.author,
            cover: book.cover,
            category: book.category,
            isTop: book.isTop,
            readUpdateTime: book.readUpdateTime,
            updateTime: book.updateTime,
            finishReading: book.finishReading,
            secret: book.secret,
            readProgress: book.mockProgress,
            updated_at: book.updated_at,
          }"
          @click="handleCardClick(book)"
        />
      </div>

      <!-- 提示 -->
      <footer
        class="text-muted-foreground mt-10 border-t pt-6 text-xs sm:mt-16"
      >
        <p>
          状态:
          <code class="bg-muted rounded px-1.5 py-0.5">{{
            isOpen ? `打开 - ${selectedBook?.title}` : '关闭'
          }}</code>
        </p>
      </footer>
    </div>

    <!-- 详情面板 -->
    <WereadBookDetailPanel
      :book="selectedBook"
      :open="isOpen"
      :progress="currentProgress"
      @close="close"
    />
  </div>
</template>
