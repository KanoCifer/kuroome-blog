<template>
  <div
    :style="sectionStyle"
    class="mt-24 min-h-screen rounded-t-4xl bg-blue-50/80 px-4 py-8 backdrop-blur-sm sm:px-6 lg:px-8 dark:bg-slate-900/80"
  >
    <div class="mx-auto max-w-4xl">
      <!-- 页面标题 -->
      <div class="mb-8 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
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
          <h1 class="text-3xl font-bold text-blue-900 dark:text-white">RSS 文章列表</h1>
          <p class="mt-1 text-sm text-blue-600 dark:text-blue-400">阅读已保存的订阅文章</p>
        </div>
        <router-link
          to="/rss/subscriptions"
          class="ml-auto text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          管理订阅
        </router-link>
      </div>

      <!-- 加载中 -->
      <div v-if="isLoading" class="space-y-4">
        <div
          v-for="i in 5"
          :key="i"
          class="animate-pulse overflow-hidden rounded-xl border border-blue-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
        >
          <div class="mb-3 h-6 w-3/4 rounded bg-blue-200 dark:bg-slate-700" />
          <div class="mb-4 h-4 w-full rounded bg-blue-100 dark:bg-slate-700" />
          <div class="h-4 w-1/3 rounded bg-blue-100 dark:bg-slate-700" />
        </div>
      </div>

      <!-- 错误状态 -->
      <div
        v-else-if="errorMessage"
        class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 py-16 text-center dark:border-red-800 dark:bg-red-900/20"
      >
        <p class="text-lg font-medium text-red-600 dark:text-red-400">加载失败</p>
        <p class="mt-1 text-sm text-red-500">{{ errorMessage }}</p>
        <button
          class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
          @click="fetchArticles(currentPage)"
        >
          重试
        </button>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="articles.length === 0"
        class="flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-800"
      >
        <p class="text-lg font-medium text-blue-500">暂无文章</p>
      </div>

      <!-- 文章列表 -->
      <div v-else class="space-y-4">
        <ul class="space-y-4">
          <li
            v-for="article in articles"
            :key="article.id"
            class="group relative overflow-hidden rounded-xl border border-blue-100 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600 dark:hover:bg-slate-700/50"
          >
            <div class="flex flex-col gap-3">
              <div class="flex items-start justify-between gap-4">
                <router-link
                  :to="`/rss/articles/${article.id}`"
                  class="block text-lg font-bold text-blue-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                >
                  {{ article.title || "无标题" }}
                </router-link>
                <span
                  v-if="!article.is_read"
                  class="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                >
                  未读
                </span>
              </div>

              <div
                class="mt-1 flex flex-wrap items-center gap-3 text-xs text-blue-500 dark:text-blue-400"
              >
                <span v-if="article.author" class="font-medium">{{ article.author }}</span>
                <span v-if="article.published" class="flex items-center gap-1">
                  {{ formatDate(article.published) }}
                </span>
                <span
                  class="max-w-[200px] truncate opacity-75 sm:max-w-xs"
                  :title="article.feed_url"
                >
                  来源: {{ article.feed_url }}
                </span>
              </div>
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
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                    : 'cursor-not-allowed bg-blue-100 text-blue-400 dark:bg-slate-800 dark:text-slate-600'
                "
                @click="goToPage(currentPage - 1)"
              >
                上一页
              </button>
            </li>
            <li class="px-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
            </li>
            <li>
              <button
                :disabled="currentPage >= totalPages"
                class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                :class="
                  currentPage < totalPages
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                    : 'cursor-not-allowed bg-blue-100 text-blue-400 dark:bg-slate-800 dark:text-slate-600'
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
  </div>
</template>

<script setup lang="ts">
import request from "@/request";
import { useNotificationStore } from "@/stores/notification";
import type { ApiResponse, RssArticle, RssArticleListResponse } from "@/types";
import { useScroll } from "@vueuse/core";
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

    const res = await request.get<ApiResponse<RssArticleListResponse>>("/rss/articles", {
      params,
    });

    if (res.data.status === "success" && res.data.data) {
      articles.value = res.data.data.items;
      totalItems.value = res.data.data.total;
      currentPage.value = res.data.data.page;
    } else {
      throw new Error(res.data.message || "获取文章列表失败");
    }
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value =
      err instanceof Error ? err.message : String(err) || "加载文章列表失败，请稍后重试。";
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

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
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

const { y } = useScroll(window);
const sectionStyle = computed(() => {
  // compute scale with a ceiling of 1 so the content does not grow indefinitely
  const scale = Math.min(1, 0.9 + y.value * 0.001);
  return {
    transform: `scale(${scale})`, // 内容区稍快
  };
});
</script>
