<template>
  <BasicDetail title="我的订阅" subtitle="管理您的 RSS 订阅源">
    <div class="col-span-full mx-auto max-w-4xl">
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
              d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324.324a1.454 1.454 0 01-2.106 0L3.955 15.41c-.87-.88-1.22-1.964-.7-2.299l.485-.491a2.025 2.025 0 011.515-.39l.583.284a1.75 1.75 0 001.934 0l.584-.284c.52-.335.64-.86.7-1.299l.486-.491"
            />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-bold text-blue-900 dark:text-white">订阅管理</h2>
            <span
              class="rounded-full border border-blue-300 bg-blue-200/60 px-3 py-1 text-xs text-blue-500 dark:bg-blue-200 dark:text-blue-900"
            >
              {{ subscriptions.length }}
            </span>
          </div>
          <p class="mt-1 text-sm text-blue-600 dark:text-blue-400">查看和管理已保存的 RSS 订阅源</p>
        </div>
        <button
          @click="router.push('/rss/parse')"
          class="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
        >
          RSS 解析
        </button>
      </div>

      <!-- 错误状态 -->
      <div
        v-if="errorMessage"
        class="mb-6 rounded-2xl border border-red-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="flex items-center gap-3 text-red-600 dark:text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-6 w-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p>{{ errorMessage }}</p>
          <button
            @click="fetchSubscriptions"
            class="ml-auto rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50"
          >
            重试
          </button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" aria-hidden="true" class="space-y-4">
        <div
          v-for="i in 3"
          :key="i"
          class="animate-pulse overflow-hidden rounded-xl border border-blue-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
        >
          <div class="mb-3 h-6 w-3/4 rounded bg-blue-200 dark:bg-slate-700" />
          <div class="h-4 w-1/3 rounded bg-blue-100 dark:bg-slate-700" />
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="subscriptions.length === 0"
        class="flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-white py-16 dark:border-slate-700 dark:bg-slate-800"
      >
        <div
          class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-400 dark:bg-slate-700 dark:text-blue-500"
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
              d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 class="mb-2 text-xl font-bold text-blue-900 dark:text-white">暂无订阅</h3>
        <p class="mb-6 text-center text-blue-600 dark:text-blue-400">暂无订阅，去添加一个吧</p>
        <router-link
          to="/rss"
          class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-slate-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          去添加
        </router-link>
      </div>

      <!-- 订阅列表 -->
      <div v-else class="space-y-4">
        <ul class="space-y-3">
          <li
            v-for="sub in subscriptions"
            :key="sub.id"
            class="group relative overflow-hidden rounded-xl border border-blue-100 bg-white p-5 transition-all hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600 dark:hover:bg-slate-700/50"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0 flex-1">
                <p
                  class="truncate font-semibold text-blue-900 dark:text-white"
                  :title="sub.rss_url"
                >
                  {{ getSubscriptionTitle(sub.feed_title, sub.rss_url) }}
                </p>
                <p class="mt-1 truncate text-sm text-blue-500" :title="sub.rss_url">
                  {{ sub.rss_url }}
                </p>

                <p
                  v-if="sub.feed_description"
                  class="mt-2 line-clamp-2 text-sm text-blue-600 dark:text-blue-300"
                >
                  {{ sub.feed_description }}
                </p>

                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {{ getFeedHost(sub.rss_url) }}
                  </span>
                  <span
                    class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    {{ getFeedProtocol(sub.rss_url) }}
                  </span>
                  <span
                    v-if="sub.entry_count !== undefined"
                    class="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-600 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    {{ sub.entry_count ?? 0 }} 篇可见文章
                  </span>
                </div>

                <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-blue-500">
                  <span v-if="sub.created_at" class="flex items-center gap-1">
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
                    添加于 {{ formatDate(sub.created_at) }}
                  </span>
                  <a
                    v-if="sub.feed_link"
                    :href="sub.feed_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    访问网站
                  </a>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <router-link
                  :to="`/rss/articles?feed_url=${encodeURIComponent(sub.rss_url)}`"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
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
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                  查看文章
                </router-link>
                <button
                  type="button"
                  @click="handleRefresh(sub.id)"
                  :disabled="refreshingSubscriptionId === sub.id"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-emerald-900/50 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
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
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865A8.25 8.25 0 0117.834 6.165l3.181 3.183"
                    />
                  </svg>
                  {{ refreshingSubscriptionId === sub.id ? "刷新中..." : "刷新" }}
                </button>

                <AlertDialog>
                  <AlertDialogTrigger>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/30"
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
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                      删除
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent class="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>你确定要删除此订阅吗？</AlertDialogTitle>
                      <AlertDialogDescription>
                        这将永久删除订阅，并且无法恢复。请确认你要删除的订阅 URL 是
                        <span class="font-mono text-red-600 dark:text-red-400">{{
                          sub.rss_url
                        }}</span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        class="bg-red-500/70 hover:bg-red-500"
                        @click="handleDelete(sub.id)"
                      >
                        确定</AlertDialogAction
                      >
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BasicDetail } from "@/components/basic";
import request, { type ApiResponse } from "@/request";
import { useNotificationStore } from "@/stores/notification";
import type { RssSubscription } from "@/types";
import { formatDate } from "@/utils/formatdate";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const subscriptions = ref<RssSubscription[]>([]);
const isLoading = ref<boolean>(false);
const errorMessage = ref<string>("");
const refreshingSubscriptionId = ref<number | null>(null);
const notificationStore = useNotificationStore();

const getFeedHost = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "未知来源";
  }
};

const getFeedProtocol = (url: string) => {
  try {
    return new URL(url).protocol.replace(":", "").toUpperCase();
  } catch {
    return "UNKNOWN";
  }
};

const getSubscriptionTitle = (feedTitle: string | null | undefined, rssUrl: string) => {
  const normalizedTitle = feedTitle?.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }
  return getFeedHost(rssUrl);
};

const fetchSubscriptions = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const res = await request.get<ApiResponse<RssSubscription[]>>("/rss/subscriptions");
    if (res.data.status === "success") {
      subscriptions.value = res.data.data || [];
    } else {
      throw new Error(res.data.message || "获取订阅列表失败");
    }
  } catch (err: unknown) {
    const error = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    errorMessage.value = error?.response?.data?.message || error?.message || "获取订阅列表失败";
  } finally {
    isLoading.value = false;
  }
};

const handleRefresh = async (id: number) => {
  if (refreshingSubscriptionId.value !== null) {
    return;
  }

  refreshingSubscriptionId.value = id;
  try {
    const res = await request.post<ApiResponse<{ saved_count: number }>>(
      `/rss/subscriptions/${id}/refresh`,
    );
    if (res.data.status === "success") {
      const savedCount = res.data.data?.saved_count ?? 0;
      notificationStore.success(`订阅刷新成功，新增 ${savedCount} 篇文章`);
    } else {
      throw new Error(res.data.message || "刷新订阅失败");
    }
  } catch (err: unknown) {
    const error = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    notificationStore.error(error?.response?.data?.message || error?.message || "刷新订阅失败");
  } finally {
    refreshingSubscriptionId.value = null;
  }
};

const handleDelete = async (id: number) => {
  try {
    const res = await request.delete<ApiResponse<null>>(`/rss/subscriptions/${id}`);
    if (res.data.status === "success") {
      subscriptions.value = subscriptions.value.filter((sub) => sub.id !== id);
    } else {
      throw new Error(res.data.message || "删除订阅失败");
    }
  } catch (err: unknown) {
    const error = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    notificationStore.error(error?.response?.data?.message || error?.message || "删除订阅失败");
  }
};

onMounted(() => {
  fetchSubscriptions();
});
</script>
