<template>
  <BasicDetail
    :title="activeCategory ? `Category: ${activeCategory}` : 'Blog'"
    subtitle="分享阅读心得、技术思考与读书笔记"
  >
    <div class="col-span-full container mx-auto min-h-dvh max-w-6xl px-4 py-8">
      <div class="mb-6 flex flex-col gap-4">
        <!-- 搜索框 -->
        <div class="flex w-full items-center justify-between gap-4">
          <div class="relative w-fit">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-5 w-5 text-gray-500 dark:text-gray-400"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="搜索文章标题和内容..."
              class="block w-full rounded-xl border border-gray-300 bg-white py-3 pr-4 pl-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500"
              @keyup.enter="handleSearch"
            />
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-5 w-5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <router-link
            v-if="user.isAuthenticated"
            to="/blog/new"
            class="inline-flex w-fit items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            New Post
          </router-link>
        </div>
      </div>
      <div class="flex flex-col gap-8 lg:flex-row">
        <!-- Main Content -->
        <div class="min-w-0 flex-1">
          <div class="space-y-6">
            <!-- Loading State -->
            <div
              v-if="isLoading"
              class="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700"
            >
              <div class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              <p class="text-gray-600 dark:text-gray-400">加载中...</p>
            </div>

            <!-- Error State -->
            <div
              v-else-if="errorMessage"
              class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-16 text-center dark:border-rose-800 dark:bg-rose-300/30"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mb-4 h-12 w-12 text-red-400"
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
              <p class="text-lg font-medium text-red-600 dark:text-red-400">加载失败</p>
              <p class="mt-1 text-sm text-red-500">{{ errorMessage }}</p>
              <button
                class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
                @click="fetchPosts(1)"
              >
                重试
              </button>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="posts.length === 0"
              class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800/30"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
                />
              </svg>
              <p class="text-lg font-medium text-gray-500">No blog posts available.</p>
              <p class="mt-1 text-sm text-gray-400">
                {{ activeCategory ? "There are no posts in this category yet." : "Check back later for new content." }}
              </p>
            </div>

            <!-- Blog Post Item -->
            <div
              v-for="post in posts"
              :key="post._id"
              :class="[
                'relative mb-8 rounded-3xl p-6 shadow-md transition-all duration-300 hover:shadow-lg dark:shadow-none',
                post.is_pinned
                  ? 'bg-blue-50/80 ring-3 ring-blue-400/60 dark:bg-slate-800/80 dark:ring-blue-500/40'
                  : 'bg-white dark:border dark:border-gray-700/50 dark:bg-gray-900',
              ]"
            >
              <!-- Pinned Badge -->
              <div
                v-if="post.is_pinned"
                class="absolute -top-3 right-4 flex items-center gap-1.5 rounded-full bg-linear-to-r from-blue-500 to-sky-500 px-3 py-1 text-xs font-bold text-white shadow-md dark:from-blue-600 dark:to-sky-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                置顶
              </div>

              <router-link
                :to="`/blog/${post._id}`"
                :class="[
                  'mb-2 block text-3xl font-semibold transition-colors',
                  post.is_pinned
                    ? 'text-blue-900 hover:text-blue-700 dark:text-blue-100 dark:hover:text-blue-300'
                    : 'hover:text-blue-600 dark:text-white dark:hover:text-blue-400',
                ]"
              >
                {{ post.title }}
              </router-link>
              <p
                :class="[
                  'my-4 text-sm',
                  post.is_pinned ? 'text-blue-700/80 dark:text-blue-300/80' : 'text-gray-600 dark:text-gray-400',
                ]"
              >
                发布于 {{ formatDate(post.created_at) }}
                <span v-if="post.category" class="ml-2"> </span>
              </p>
              <!-- HTML Content Preview -->
              <div
                :class="[
                  'post-preview prose prose-base dark:prose-invert max-h-72 max-w-none overflow-y-hidden rounded-xl p-4 leading-relaxed',
                  post.is_pinned
                    ? 'dark:prose-invert bg-white/70 ring-1 ring-blue-200/50 dark:bg-black/20 dark:ring-blue-800/30'
                    : 'dark:prose-invert bg-gray-50/80 ring-1 ring-gray-200/50 dark:bg-gray-800/50 dark:ring-gray-700/30',
                ]"
                v-html="getPreviewHtml(post.body)"
              ></div>
              <div
                :class="[
                  'mt-4 flex items-center justify-between border-t pt-4',
                  post.is_pinned
                    ? 'border-blue-200/60 dark:border-blue-800/40'
                    : 'border-gray-100 dark:border-gray-700',
                ]"
              >
                <div
                  :class="[
                    'flex items-center gap-4 text-sm',
                    post.is_pinned ? 'text-blue-700/70 dark:text-blue-300/70' : 'text-gray-500 dark:text-gray-400',
                  ]"
                >
                  <router-link
                    v-if="post.category"
                    :to="`/blog/category/${post.category.id}`"
                    :class="[
                      'flex items-center gap-1.5 transition-colors',
                      post.is_pinned
                        ? 'hover:text-blue-800 dark:hover:text-blue-400'
                        : 'hover:text-blue-600 dark:hover:text-blue-400',
                    ]"
                    title="Category"
                  >
                    <!-- tags icon -->
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      ></path>
                    </svg>
                    <span>{{ post.category.name }}</span>
                  </router-link>
                </div>
                <router-link
                  :to="`/blog/${post._id}`"
                  :class="[
                    'inline-flex items-center text-sm font-medium transition-colors',
                    post.is_pinned
                      ? 'text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
                  ]"
                >
                  阅读更多
                  <svg class="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    ></path>
                  </svg>
                </router-link>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <nav v-if="pagination && pagination.pages > 1" class="mt-10" aria-label="博客分页">
            <ul
              class="mx-auto inline-flex w-full max-w-full items-center justify-center gap-1 rounded-2xl border border-gray-200/80 bg-white/90 p-1.5 shadow-sm backdrop-blur-sm sm:w-fit sm:gap-2 dark:border-gray-700/70 dark:bg-gray-900/80"
            >
              <!-- Previous Button -->
              <li>
                <button
                  :disabled="!pagination?.has_prev"
                  class="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-gray-900"
                  :class="
                    pagination?.has_prev
                      ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white'
                      : 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                  "
                  @click="goToPage(pagination!.prev_num!)"
                >
                  <span aria-hidden="true">&laquo;</span>
                  <span class="hidden sm:inline">上一页</span>
                </button>
              </li>

              <!-- Page Numbers -->
              <!-- 显示第一页 -->
              <li v-if="pagination && pagination.page > 3">
                <button
                  class="inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
                  @click="goToPage(1)"
                >
                  1
                </button>
              </li>

              <!-- 省略号 -->
              <li v-if="pagination && pagination.page > 4">
                <span class="px-1 text-sm text-gray-400 dark:text-gray-500">...</span>
              </li>

              <!-- 显示当前页附近的页码 -->
              <li v-for="pageNum in getVisiblePages" :key="pageNum">
                <button
                  class="inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-gray-900"
                  :class="
                    pageNum === pagination?.page
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 dark:bg-blue-500 dark:shadow-blue-500/20'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                  "
                  @click="goToPage(pageNum)"
                >
                  {{ pageNum }}
                </button>
              </li>

              <!-- 省略号 -->
              <li v-if="pagination && pagination.page < pagination.pages - 3">
                <span class="px-1 text-sm text-gray-400 dark:text-gray-500">...</span>
              </li>

              <!-- 显示最后一页 -->
              <li v-if="pagination && pagination.page < pagination.pages - 2">
                <button
                  class="inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white dark:focus-visible:ring-offset-gray-900"
                  @click="goToPage(pagination.pages)"
                >
                  {{ pagination.pages }}
                </button>
              </li>

              <!-- Next Button -->
              <li>
                <button
                  :disabled="!pagination?.has_next"
                  class="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-gray-900"
                  :class="
                    pagination?.has_next
                      ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white'
                      : 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                  "
                  @click="goToPage(pagination!.next_num!)"
                >
                  <span class="hidden sm:inline">下一页</span>
                  <span aria-hidden="true">&raquo;</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <!-- Category Sidebar -->
        <div class="w-full shrink-0 lg:w-72">
          <div class="sticky top-24">
            <CategorySidebar @filterPosts="handleFilterPosts" @resetFilter="handleResetFilter" />
          </div>
        </div>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import request from "@/api/request";
import BasicDetail from "@/components/basic/BasicDetail.vue";
import { useNotificationStore } from "@/stores/notification";
import type { BlogPagination, BlogsResponse, Category, Post } from "@/types";
import { formatDate } from "@/utils/formatdate";
import { useHead } from "@unhead/vue";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import { computed, nextTick, ref, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import CategorySidebar from "./components/CategorySidebar.vue";

const route = useRoute();
const router = useRouter();
const posts = ref<Post[]>([]);
const categories = ref<Category[]>([]);
const pagination = ref<BlogPagination | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");
const searchQuery = ref<string>("");

const user = ref({
  isAuthenticated: true,
  id: 1,
  isAdmin: false,
});

const activeCategory = ref<string | null>(null);

const currentPage = ref(1);

const parsePageFromQuery = (pageQuery: unknown): number => {
  if (typeof pageQuery !== "string") {
    return 1;
  }

  const parsedPage = Number.parseInt(pageQuery, 10);
  return Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
};

// 获取可见页码范围
const getVisiblePages = computed(() => {
  if (!pagination.value) return [];

  const totalPages = pagination.value.pages;
  const current = pagination.value.page;
  const visiblePages = [];

  // 显示当前页附近的页码
  for (let i = Math.max(2, current - 2); i <= Math.min(totalPages - 1, current + 2); i++) {
    visiblePages.push(i);
  }

  return visiblePages;
});

const fetchPosts = async (page: number = 1) => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const params: Record<string, string | number> = { page };
    if (route.query.search && typeof route.query.search === "string") {
      params.search = route.query.search;
      searchQuery.value = route.query.search;
    }

    const res = await request.get<BlogsResponse>("/blogs", {
      params,
    });

    if (res.data.status === "success") {
      posts.value = res.data.data.posts;
      categories.value = res.data.data.categories;
      pagination.value = res.data.data.pagination;
      currentPage.value = page;
    } else {
      throw new Error(res.data.message || "获取文章列表失败");
    }
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value = err instanceof Error ? err.message : "加载文章列表失败，请稍后重试。";
    useNotificationStore().error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

const goToPage = (page: number) => {
  if (page >= 1 && pagination.value && page <= pagination.value.pages) {
    // 保留搜索参数
    const query = {
      ...route.query,
      page: page.toString(),
      search: searchQuery.value || undefined,
    };
    if (!searchQuery.value) {
      delete query.search;
    }
    router.push({ query });
  }
};

const handleSearch = () => {
  // 搜索时回到第一页
  const query = {
    ...route.query,
    page: "1",
    search: searchQuery.value || undefined,
  };
  if (searchQuery.value) {
    query.search = searchQuery.value;
  } else {
    delete query.search;
  }
  router.push({ query });
};

const clearSearch = () => {
  searchQuery.value = "";
  handleSearch();
};

watch(
  () => [route.query.page, route.query.search, route.query.category, route.params.categoryId],
  ([pageQuery, searchParam, categoryQuery, categoryParam]) => {
    searchQuery.value = typeof searchParam === "string" ? searchParam : "";

    const hasCategoryQuery = typeof categoryQuery === "string" && categoryQuery.length > 0;
    const hasCategoryParam = typeof categoryParam === "string" && categoryParam.length > 0;

    if (hasCategoryQuery || hasCategoryParam) {
      return;
    }

    const pageNum = parsePageFromQuery(pageQuery);
    fetchPosts(pageNum);
  },
  { immediate: true },
);

watchEffect(async () => {
  await nextTick();
  hljs.highlightAll();
});

// 设置页面 meta 标签
useHead(() => ({
  title: activeCategory.value
    ? `Category: ${activeCategory.value} - ReadingList Blog`
    : "ReadingList Blog - 阅读与分享",
  meta: [
    {
      name: "description",
      content: activeCategory.value
        ? `探索 ${activeCategory.value} 分类下的所有文章 - 个人阅读心得、技术分享、读书笔记`
        : "ReadingList 博客 - 分享个人阅读心得、技术文章、读书笔记，记录阅读的美好时光",
    },
    {
      name: "keywords",
      content: activeCategory.value
        ? `${activeCategory.value}, 博客, 阅读, 技术分享, 读书笔记, ReadingList`
        : "博客, 阅读, 技术分享, 读书笔记, ReadingList, 个人博客, 阅读心得",
    },
    {
      property: "og:title",
      content: activeCategory.value ? `${activeCategory.value} 分类文章 - ReadingList` : "ReadingList Blog",
    },
    {
      property: "og:description",
      content: activeCategory.value
        ? `探索 ${activeCategory.value} 分类下的所有文章`
        : "ReadingList 博客 - 分享个人阅读心得、技术文章、读书笔记",
    },
    {
      property: "og:type",
      content: "website",
    },
    {
      property: "og:url",
      content: activeCategory.value
        ? `https://readinglist.example.com/blog/category/${activeCategory.value}`
        : "https://readinglist.example.com/blog",
    },
    {
      name: "twitter:title",
      content: activeCategory.value ? `${activeCategory.value} 分类文章 - ReadingList` : "ReadingList Blog",
    },
    {
      name: "twitter:description",
      content: activeCategory.value
        ? `探索 ${activeCategory.value} 分类下的所有文章`
        : "ReadingList 博客 - 分享个人阅读心得、技术文章、读书笔记",
    },
  ],
}));

const getPreviewHtml = (html: string) => {
  if (!html) return "";
  const sanitizedHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
  return sanitizedHtml;
};

// 处理分类过滤
const handleFilterPosts = (filteredPosts: Post[], categoryName: string) => {
  posts.value = filteredPosts;
  activeCategory.value = categoryName;
  searchQuery.value = "";
  pagination.value = null; // 分类过滤结果不分页
  // 清除URL中的search参数
  const query = { ...route.query };
  delete query.search;
  router.push({ query });
};

// 重置过滤
const handleResetFilter = () => {
  activeCategory.value = null;
  searchQuery.value = "";
  // 清除URL中的search和category参数
  const query = { ...route.query };
  delete query.category;
  delete query.search;
  router.push({ query });
};
</script>
<style scoped>
/* Post preview styles */
.post-preview {
  font-size: 0.875rem;
  line-height: 1.6;
}

.post-preview :deep(p) {
  margin-bottom: 0.75rem;
}

.post-preview :deep(p):last-child {
  margin-bottom: 0;
}

.post-preview :deep(h1),
.post-preview :deep(h2),
.post-preview :deep(h3),
.post-preview :deep(h4) {
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.post-preview :deep(ul),
.post-preview :deep(ol) {
  margin-left: 1.25rem;
  margin-bottom: 0.75rem;
}

.post-preview :deep(li) {
  margin-bottom: 0.25rem;
}

.post-preview :deep(code) {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.post-preview :deep(pre) {
  padding: 0.75rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}

.post-preview :deep(pre code) {
  padding: 0;
  background: transparent;
}

/* 预览卡片里统一覆盖语法高亮内联色，避免深色背景下文字不可见 */
.post-preview :deep(pre code *) {
  color: inherit !important;
  background: transparent !important;
}

.post-preview :deep(blockquote) {
  padding-left: 0.75rem;
  border-left-width: 3px;
  margin-bottom: 0.75rem;
  font-style: italic;
}

.post-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
  margin: 0.5rem 0;
}

/* Light mode specific styles */
:global(.light) .post-preview :deep(code) {
  background-color: #f3f4f6;
  color: #1f2937;
}

:global(.light) .post-preview :deep(pre) {
  background-color: #f3f4f6;
}

:global(.light) .post-preview :deep(blockquote) {
  border-left-color: #d1d5db;
  color: #4b5563;
}

/* Dark mode specific styles */
:global(.dark) .post-preview :deep(code) {
  background-color: #374151;
  color: #f9fafb;
}

:global(.dark) .post-preview :deep(pre) {
  background-color: #1f2937;
}

:global(.dark) .post-preview :deep(blockquote) {
  border-left-color: #4b5563;
  color: #9ca3af;
}

/* Pinned post specific preview styles */
:global(.dark) .post-preview.pinned :deep(code) {
  background-color: #1e3a5f;
  color: #bfdbfe;
}

:global(.dark) .post-preview.pinned :deep(pre) {
  background-color: #1e3a5f;
}

:global(.light) .post-preview.pinned :deep(code) {
  background-color: #dbeafe;
  color: #1e40af;
}

:global(.light) .post-preview.pinned :deep(pre) {
  background-color: #dbeafe;
}
</style>
