<template>
  <BasicDetail title="RSS 文章列表" subtitle="阅读已保存的订阅文章">
    <div class="col-span-full mx-auto w-full max-w-4xl">
      <!-- 顶部操作栏 -->
      <div class="mb-6 flex items-center gap-3">
        <button
          @click="router.push('/rss')"
          class="bg-primary/15 text-primary hover:bg-accent inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-4 w-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          返回Rss解析
        </button>
        <router-link
          to="/rss"
          class="text-primary hover:text-primary ml-auto text-sm"
        >
          管理订阅
        </router-link>
      </div>

      <!-- 搜索框 -->
      <div class="mb-6">
        <div class="relative">
          <div
            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="text-primary h-5 w-5"
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
            class="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 block w-full rounded-xl border py-3 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
            @keyup.enter="handleSearch"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="text-primary hover:text-primary absolute inset-y-0 right-0 flex items-center pr-3"
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
      </div>

      <!-- 加载中 -->
      <div v-if="isLoading" class="space-y-4">
        <div
          v-for="i in 5"
          :key="i"
          class="border-border bg-card animate-pulse overflow-hidden rounded-xl border p-5"
        >
          <div class="bg-muted mb-3 h-6 w-3/4 rounded" />
          <div class="bg-muted mb-4 h-4 w-full rounded" />
          <div class="bg-muted h-4 w-1/3 rounded" />
        </div>
      </div>

      <!-- 错误状态 -->
      <div
        v-else-if="errorMessage"
        class="border-destructive/30 bg-destructive/10 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center"
      >
        <p class="text-destructive text-lg font-medium">加载失败</p>
        <p class="text-destructive mt-1 text-sm">{{ errorMessage }}</p>
        <button
          class="bg-destructive text-primary-foreground hover:bg-destructive/90 mt-4 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none"
          @click="fetchArticles(currentPage)"
        >
          重试
        </button>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="articles.length === 0"
        class="border-border bg-card flex flex-col items-center justify-center rounded-2xl border py-16 text-center"
      >
        <p class="text-primary text-lg font-medium">暂无文章</p>
      </div>

      <!-- 文章列表 -->
      <div v-else class="space-y-4">
        <ul class="space-y-4">
          <li
            v-for="article in articles"
            :key="article.id"
            class="group border-border bg-card hover:border-primary/30 hover:bg-primary/5 relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all"
          >
            <div class="flex flex-col gap-3">
              <div class="flex items-start justify-between gap-4">
                <router-link
                  :to="`/rss/articles/${article.id}`"
                  class="text-primary hover:text-primary block text-lg font-bold transition-colors"
                >
                  {{ article.title || "无标题" }}
                </router-link>
                <span
                  class="bg-primary/15 text-primary inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
                >
                  {{ article.is_read ? "已读" : "未读" }}
                </span>
              </div>

              <div
                class="text-primary mt-1 flex flex-wrap items-center gap-3 text-xs"
              >
                <span v-if="article.author" class="font-medium">{{
                  article.author
                }}</span>
                <span v-if="article.published" class="flex items-center gap-1">
                  {{ formatDate(article.published) }}
                </span>
                <span
                  class="max-w-50 truncate opacity-75 sm:max-w-xs"
                  :title="article.feed_url"
                >
                  来源: {{ article.feed_url }}
                </span>
              </div>

              <!-- 摘要 -->
              <p
                v-if="article.summary"
                class="text-primary mt-3 line-clamp-2 text-sm"
              >
                {{ article.summary }}
              </p>
            </div>
          </li>
        </ul>

        <!-- 分页 -->
        <nav v-if="totalPages > 1" class="mt-8 flex justify-center">
          <ul class="flex items-center gap-2">
            <li>
              <button
                :disabled="currentPage <= 1"
                class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                :class="
                  currentPage > 1
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                "
                @click="goToPage(currentPage - 1)"
              >
                上一页
              </button>
            </li>
            <li class="text-primary px-2 text-sm font-medium">
              第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
            </li>
            <li>
              <button
                :disabled="currentPage >= totalPages"
                class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                :class="
                  currentPage < totalPages
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                "
                @click="goToPage(currentPage + 1)"
              >
                下一页
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import BasicDetail from "@/components/basic/BasicDetail.vue";
import { rssService } from "@/service/rssService";
import { useNotificationStore } from "@/stores/notification";
import type { RssArticle } from "@/types";
import { formatDate } from "@/utils/formatdate";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const articles = ref<RssArticle[]>([]);
const totalItems = ref<number>(0);
const limit = ref<number>(20);
const currentPage = ref<number>(1);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>("");
const notifier = useNotificationStore();
const searchQuery = ref<string>("");

const totalPages = computed(() => Math.ceil(totalItems.value / limit.value));

const fetchArticles = async (page: number) => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const params: Record<string, string | number | string[]> = {
      page,
      limit: limit.value,
    };
    if (route.query.feed_url && typeof route.query.feed_url === "string") {
      params.feed_url = route.query.feed_url;
    }
    if (route.query.search && typeof route.query.search === "string") {
      params.search = route.query.search;
      searchQuery.value = route.query.search;
    }

    const res = await rssService.getArticles({
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 20,
      feed_url:
        typeof params.feed_url === "string" ? params.feed_url : undefined,
      search: typeof params.search === "string" ? params.search : undefined,
    });
    articles.value = res.items;
    totalItems.value = res.total;
    currentPage.value = res.page;
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value =
      err instanceof Error
        ? err.message
        : String(err) || "加载文章列表失败，请稍后重试。";
    notifier.error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    router.push({
      query: {
        ...route.query,
        page: page.toString(),
      },
    });
  }
};

const handleSearch = () => {
  router.push({
    query: {
      ...route.query,
      page: "1",
      search: searchQuery.value || undefined,
    },
  });
};

const clearSearch = () => {
  searchQuery.value = "";
  handleSearch();
};

onMounted(() => {
  const pageParam = parseInt(route.query.page as string, 10);
  fetchArticles(isNaN(pageParam) || pageParam < 1 ? 1 : pageParam);
});

// Since we use push query string, watch the route query
watch(
  () => route.query.page,
  (newPage) => {
    const pageNum = parseInt(newPage as string, 10) || 1;
    if (pageNum !== currentPage.value) {
      fetchArticles(pageNum);
    }
  },
);
watch(
  () => route.query.feed_url,
  () => {
    fetchArticles(1);
  },
);

watch(
  () => route.query.search,
  (newSearch) => {
    if (typeof newSearch === "string") {
      searchQuery.value = newSearch;
    } else {
      searchQuery.value = "";
    }
    fetchArticles(1);
  },
);
</script>
