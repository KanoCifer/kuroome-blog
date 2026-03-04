<template>
  <div
    class="mt-24 min-h-screen rounded-t-4xl bg-blue-50/80 px-4 py-8 backdrop-blur-sm sm:px-6 lg:px-8 dark:bg-slate-900/80"
  >
    <div class="mx-auto max-w-4xl">
      <!-- Back button and Header Actions -->
      <div class="mb-6 flex items-center justify-between">
        <button
          @click="router.push('/rss/articles')"
          class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
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
          返回文章列表
        </button>

        <button
          v-if="article"
          @click="toggleReadStatus"
          :disabled="isToggling"
          class="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          :class="
            article.is_read
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
              : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
          "
        >
          <svg v-if="isToggling" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-4 w-4"
          >
            <path
              v-if="article.is_read"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {{ article.is_read ? "标记为未读" : "标记为已读" }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-6">
        <div
          class="animate-pulse overflow-hidden rounded-2xl border border-blue-100 bg-white p-8 dark:border-slate-700 dark:bg-slate-800"
        >
          <div class="mb-6 h-8 w-3/4 rounded bg-blue-200 dark:bg-slate-700" />
          <div class="mb-8 flex gap-4">
            <div class="h-4 w-24 rounded bg-blue-100 dark:bg-slate-700" />
            <div class="h-4 w-32 rounded bg-blue-100 dark:bg-slate-700" />
          </div>
          <div class="space-y-4">
            <div class="h-4 w-full rounded bg-blue-100 dark:bg-slate-700" />
            <div class="h-4 w-full rounded bg-blue-100 dark:bg-slate-700" />
            <div class="h-4 w-5/6 rounded bg-blue-100 dark:bg-slate-700" />
            <div class="h-4 w-full rounded bg-blue-100 dark:bg-slate-700" />
            <div class="h-4 w-4/5 rounded bg-blue-100 dark:bg-slate-700" />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="errorMessage"
        class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 py-16 text-center dark:border-red-800 dark:bg-red-900/20"
      >
        <p class="text-lg font-medium text-red-600 dark:text-red-400">加载失败</p>
        <p class="mt-1 text-sm text-red-500">{{ errorMessage }}</p>
        <button
          class="mt-4 cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          @click="fetchArticle"
        >
          重试
        </button>
      </div>

      <!-- Article Content -->
      <div
        v-else-if="article"
        class="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="border-b border-blue-100 p-8 dark:border-slate-700">
          <h1 class="mb-4 text-3xl leading-tight font-bold text-blue-900 dark:text-white">
            {{ article.title }}
          </h1>

          <div class="flex flex-wrap gap-x-6 gap-y-3 text-sm text-blue-600 dark:text-blue-400">
            <div v-if="article.author" class="flex items-center gap-1.5 font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              {{ article.author }}
            </div>

            <div v-if="article.published" class="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              {{ formatDate(article.published) }}
            </div>

            <div class="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
              <span class="max-w-[200px] truncate" :title="article.feed_url">{{
                article.feed_url
              }}</span>
            </div>

            <a
              v-if="article.link"
              :href="article.link"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1.5 text-blue-700 hover:text-blue-800 hover:underline dark:text-blue-300 dark:hover:text-blue-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
              阅读原文
            </a>
          </div>
        </div>

        <div class="p-8">
          <div
            class="prose prose-lg prose-blue prose-a:text-blue-600 prose-img:rounded-xl dark:prose-invert dark:prose-a:text-blue-400 max-w-none"
            v-html="safeContent"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import request from "@/request";
import { useNotificationStore } from "@/stores/notification";
import type { ApiResponse, RssArticle } from "@/types";
import DOMPurify from "dompurify";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const article = ref<RssArticle | null>(null);
const isLoading = ref<boolean>(true);
const isToggling = ref<boolean>(false);
const errorMessage = ref<string>("");
const notifier = useNotificationStore();

const articleId = computed(() => route.params.id as string);

const safeContent = computed(() => {
  return DOMPurify.sanitize(article.value?.content || article.value?.summary || "");
});

const fetchArticle = async () => {
  if (!articleId.value) return;
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const res = await request.get<ApiResponse<RssArticle>>(`/rss/articles/${articleId.value}`);
    if (res.data.status === "success" && res.data.data) {
      article.value = res.data.data;
    } else {
      throw new Error(res.data.message || "获取文章详情失败");
    }
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value =
      err instanceof Error ? err.message : String(err) || "加载文章失败，请稍后重试。";
    notifier.error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

const toggleReadStatus = async () => {
  if (!article.value) return;
  isToggling.value = true;
  const isCurrentlyRead = article.value.is_read;

  try {
    if (isCurrentlyRead) {
      await request.delete(`/rss/articles/${articleId.value}/read`);
      article.value.is_read = false;
      notifier.success("已标记为未读");
    } else {
      await request.post(`/rss/articles/${articleId.value}/read`);
      article.value.is_read = true;
      notifier.success("已标记为已读");
    }
  } catch (err: unknown) {
    console.error("Toggle read status error:", err);
    notifier.error("操作失败，请重试");
  } finally {
    isToggling.value = false;
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
  fetchArticle();
});

watch(articleId, () => {
  fetchArticle();
});
</script>

<style scoped>
/* Scoped styles can be added if needed, though Tailwind covers most needs */
:deep(.prose img) {
  margin-left: auto;
  margin-right: auto;
}
</style>
