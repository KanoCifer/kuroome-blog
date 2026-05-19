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
            <div
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="text-muted-foreground h-5 w-5"
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
              class="text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 border-border bg-card block w-full rounded-xl border py-3 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
              @keyup.enter="handleSearch"
            />
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <router-link
            v-if="user.isAuthenticated"
            to="/blog/new"
            class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary inline-flex w-fit items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="mr-2 h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
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
              class="border-border bg-card flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center"
            >
              <div
                class="border-primary/20 border-t-primary mb-4 h-10 w-10 animate-spin rounded-full border-4"
              ></div>
              <p class="text-muted-foreground">加载中...</p>
            </div>

            <!-- Error State -->
            <div
              v-else-if="errorMessage"
              class="border-destructive/30 bg-destructive/10 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="text-destructive/60 mb-4 h-12 w-12"
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
              <p class="text-destructive text-lg font-medium">加载失败</p>
              <p class="text-destructive/80 mt-1 text-sm">{{ errorMessage }}</p>
              <button
                class="bg-destructive hover:bg-destructive/90 focus:ring-ring mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
                @click="fetchPosts(1)"
              >
                重试
              </button>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="posts.length === 0"
              class="border-border bg-muted flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="text-muted-foreground/40 mb-4 h-12 w-12"
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
              <p class="text-muted-foreground text-lg font-medium">
                No blog posts available.
              </p>
              <p class="text-muted-foreground/70 mt-1 text-sm">
                {{
                  activeCategory
                    ? "There are no posts in this category yet."
                    : "Check back later for new content."
                }}
              </p>
            </div>

            <!-- Blog Post Item -->
            <BlogListItem v-for="post in posts" :key="post._id" :post="post" />
          </div>

          <!-- Pagination -->
          <nav
            v-if="pagination && pagination.pages > 1"
            class="mt-10"
            aria-label="博客分页"
          >
            <ul
              class="border-border/80 bg-card/90 mx-auto inline-flex w-full max-w-full items-center justify-center gap-1 rounded-2xl border p-1.5 shadow-sm backdrop-blur-sm sm:w-fit sm:gap-2"
            >
              <!-- Previous Button -->
              <li>
                <button
                  :disabled="!pagination?.has_prev"
                  class="focus-visible:ring-ring inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  :class="
                    pagination?.has_prev
                      ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      : 'text-muted-foreground/50 cursor-not-allowed'
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
                  class="focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  @click="goToPage(1)"
                >
                  1
                </button>
              </li>

              <!-- 省略号 -->
              <li v-if="pagination && pagination.page > 4">
                <span class="text-muted-foreground/60 px-1 text-sm">...</span>
              </li>

              <!-- 显示当前页附近的页码 -->
              <li v-for="pageNum in getVisiblePages" :key="pageNum">
                <button
                  class="focus-visible:ring-ring inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  :class="
                    pageNum === pagination?.page
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  "
                  @click="goToPage(pageNum)"
                >
                  {{ pageNum }}
                </button>
              </li>

              <!-- 省略号 -->
              <li v-if="pagination && pagination.page < pagination.pages - 3">
                <span class="text-muted-foreground/60 px-1 text-sm">...</span>
              </li>

              <!-- 显示最后一页 -->
              <li v-if="pagination && pagination.page < pagination.pages - 2">
                <button
                  class="focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  @click="goToPage(pagination.pages)"
                >
                  {{ pagination.pages }}
                </button>
              </li>

              <!-- Next Button -->
              <li>
                <button
                  :disabled="!pagination?.has_next"
                  class="focus-visible:ring-ring inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  :class="
                    pagination?.has_next
                      ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      : 'text-muted-foreground/50 cursor-not-allowed'
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
        <!-- HomeSideBar Style Sidebar -->
        <div class="col-span-1 w-full shrink-0 lg:w-72">
          <div class="sticky top-24 h-fit space-y-6">
            <BentoProfileCard />
            <BentoCalendar />
            <BentoCategory
              @filterPosts="handleFilterPosts"
              @resetFilter="handleResetFilter"
            />
          </div>
        </div>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import BasicDetail from "@/components/basic/BasicDetail.vue";
import { blogService } from "@/service/blogService";
import { useNotificationStore } from "@/stores/notification";
import type { BlogPagination, Category, Post } from "@/types";
import { useHead } from "@unhead/vue";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BlogListItem from "./components/BlogListItem.vue";
import BentoCategory from "./components/BentoCategory.vue";
import BentoProfileCard from "@/views/entry/components/BentoProfileCard.vue";
import BentoCalendar from "@/views/entry/components/BentoCalendar.vue";

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
  for (
    let i = Math.max(2, current - 2);
    i <= Math.min(totalPages - 1, current + 2);
    i++
  ) {
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

    const res = await blogService.getBlogs({
      page,
      search: typeof params.search === "string" ? params.search : undefined,
    });

    posts.value = res.posts as unknown as Post[];
    categories.value = res.categories;
    pagination.value = res.pagination;
    currentPage.value = page;
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value =
      err instanceof Error ? err.message : "加载文章列表失败，请稍后重试。";
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
  () => [
    route.query.page,
    route.query.search,
    route.query.category,
    route.params.categoryId,
  ],
  ([pageQuery, searchParam, categoryQuery, categoryParam]) => {
    searchQuery.value = typeof searchParam === "string" ? searchParam : "";

    const hasCategoryQuery =
      typeof categoryQuery === "string" && categoryQuery.length > 0;
    const hasCategoryParam =
      typeof categoryParam === "string" && categoryParam.length > 0;

    if (hasCategoryQuery || hasCategoryParam) {
      return;
    }

    const pageNum = parsePageFromQuery(pageQuery);
    fetchPosts(pageNum);
  },
  { immediate: true },
);

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
      content: activeCategory.value
        ? `${activeCategory.value} 分类文章 - ReadingList`
        : "ReadingList Blog",
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
      content: activeCategory.value
        ? `${activeCategory.value} 分类文章 - ReadingList`
        : "ReadingList Blog",
    },
    {
      name: "twitter:description",
      content: activeCategory.value
        ? `探索 ${activeCategory.value} 分类下的所有文章`
        : "ReadingList 博客 - 分享个人阅读心得、技术文章、读书笔记",
    },
  ],
}));

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
