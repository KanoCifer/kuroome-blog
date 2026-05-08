<template>
  <BasicDetail
    title="RSS 工作台"
    subtitle="在一个页面里完成解析、订阅管理与文章阅读"
  >
    <div class="col-span-full mx-auto w-full max-w-6xl space-y-8">
      <div class="flex flex-wrap items-center gap-3">
        <a
          href="#rss-parse"
          class="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
        >
          解析订阅
        </a>
        <a
          href="#rss-subscriptions"
          class="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
        >
          我的订阅
        </a>
        <a
          href="#rss-articles"
          class="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
        >
          文章列表
        </a>
      </div>

      <section
        id="rss-parse"
        class="rounded-2xl border border-blue-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold text-blue-900 dark:text-white">
              解析订阅地址
            </h2>
            <p class="mt-1 text-sm text-blue-600 dark:text-blue-400">
              支持 RSS/Atom，解析后可直接保存到我的订阅
            </p>
          </div>
        </div>

        <form
          class="flex flex-col gap-4 lg:flex-row lg:items-end"
          @submit.prevent="parseRss"
        >
          <div class="flex-1">
            <label
              for="rss-url"
              class="mb-2 block text-sm font-medium text-blue-800 dark:text-blue-200"
            >
              RSS/Atom 地址
            </label>
            <input
              id="rss-url"
              v-model="rssForm.rssUrl"
              type="text"
              placeholder="https://example.com/feed.xml"
              class="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900 transition-all placeholder:text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400"
            />
          </div>

          <button
            type="button"
            class="rounded-xl border border-blue-300 bg-blue-100 px-5 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:border-slate-700 dark:bg-slate-700/50 dark:text-blue-300 dark:hover:bg-slate-600/50"
            @click="rssForm.saveToDb = !rssForm.saveToDb"
          >
            {{ rssForm.saveToDb ? "已启用保存" : "保存到订阅" }}
          </button>

          <button
            type="submit"
            :disabled="parseLoading"
            class="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-orange-500 dark:ring-offset-slate-800"
          >
            {{ parseLoading ? "解析中..." : "开始解析" }}
          </button>
        </form>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm text-blue-600 dark:text-blue-400"
            >快捷尝试:</span
          >
          <button
            v-for="example in exampleFeeds"
            :key="example.url"
            type="button"
            class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600"
            @click="rssForm.rssUrl = example.url"
          >
            {{ example.name }}
          </button>
        </div>

        <div
          v-if="rssHistory.length > 0"
          class="mt-3 flex flex-wrap items-center gap-2"
        >
          <span class="text-sm text-blue-600 dark:text-blue-400"
            >历史记录:</span
          >
          <button
            v-for="historyUrl in rssHistory.slice(0, 3)"
            :key="historyUrl"
            type="button"
            class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600"
            @click="rssForm.rssUrl = historyUrl"
          >
            {{ historyUrl }}
          </button>
        </div>

        <div
          v-if="parseMetadata"
          class="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-5 dark:border-slate-700 dark:bg-slate-700/20"
        >
          <h3 class="text-lg font-bold text-blue-900 dark:text-white">
            {{ parseMetadata.title }}
          </h3>
          <p
            v-if="parseMetadata.description"
            class="mt-2 text-sm text-blue-600 dark:text-blue-400"
          >
            {{ parseMetadata.description }}
          </p>
          <div
            class="mt-3 flex flex-wrap items-center gap-3 text-xs text-blue-500 dark:text-blue-400"
          >
            <span v-if="parseMetadata.published"
              >更新时间: {{ formatDate(parseMetadata.published) }}</span
            >
            <a
              :href="parseMetadata.link"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              访问原站
            </a>
          </div>
        </div>

        <div v-if="parseEntries.length > 0" class="mt-5 space-y-3">
          <div class="text-sm font-semibold text-blue-700 dark:text-blue-300">
            最新解析文章（{{ parseEntries.length }}）
          </div>
          <ul class="space-y-2">
            <li
              v-for="(entry, index) in parseEntries"
              :key="`${entry.link}-${index}`"
              class="rounded-xl border border-blue-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <a
                :href="entry.link"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-blue-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
              >
                {{ entry.title }}
              </a>
              <p
                v-if="entry.summary"
                class="mt-2 line-clamp-2 text-sm text-blue-600 dark:text-blue-400"
              >
                {{ truncateSummary(entry.summary) }}
              </p>
              <div class="mt-2 text-xs text-blue-500 dark:text-blue-400">
                {{ formatDate(entry.published) }}
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section
        id="rss-subscriptions"
        class="rounded-2xl border border-blue-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold text-blue-900 dark:text-white">
              我的订阅
            </h2>
            <p class="mt-1 text-sm text-blue-600 dark:text-blue-400">
              共 {{ subscriptions.length }} 个订阅源
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            :disabled="subscriptionsLoading"
            @click="fetchSubscriptions"
          >
            {{ subscriptionsLoading ? "刷新中..." : "刷新订阅列表" }}
          </button>
        </div>

        <div
          v-if="subscriptionsError"
          class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          {{ subscriptionsError }}
        </div>

        <div v-else-if="subscriptionsLoading" class="space-y-3">
          <div
            v-for="skeleton in 3"
            :key="skeleton"
            class="h-24 animate-pulse rounded-xl border border-blue-100 bg-blue-50 dark:border-slate-700 dark:bg-slate-700/40"
          />
        </div>

        <div
          v-else-if="subscriptions.length === 0"
          class="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-8 text-center text-sm text-blue-600 dark:border-slate-700 dark:bg-slate-700/20 dark:text-blue-400"
        >
          暂无订阅，先在上方解析并保存一个 RSS 地址吧。
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="subscription in subscriptions"
            :key="subscription.id"
            class="rounded-xl border p-4 transition-all dark:border-slate-700"
            :class="
              activeSubscriptionId === subscription.id
                ? 'border-blue-300 bg-blue-50/60 dark:border-blue-700 dark:bg-blue-900/10'
                : 'border-blue-100 bg-white hover:border-blue-200 dark:bg-slate-800'
            "
          >
            <div
              class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3
                    class="truncate text-base font-semibold text-blue-900 dark:text-white"
                  >
                    {{ getSubscriptionTitle(subscription) }}
                  </h3>
                  <span
                    class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-slate-700 dark:text-blue-300"
                  >
                    {{ getFeedProtocol(subscription.rss_url) }}
                  </span>
                </div>
                <p
                  class="mt-1 text-xs break-all text-blue-500 dark:text-blue-400"
                >
                  {{ subscription.rss_url }}
                </p>
                <div
                  class="mt-2 flex flex-wrap items-center gap-3 text-xs text-blue-500 dark:text-blue-400"
                >
                  <span>文章数: {{ subscription.entry_count ?? 0 }}</span>
                  <span
                    >最近抓取:
                    {{ formatDate(subscription.last_fetched_at) }}</span
                  >
                  <span
                    >创建时间: {{ formatDate(subscription.created_at) }}</span
                  >
                </div>
              </div>

              <div class="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  @click="filterByFeed(subscription)"
                >
                  查看文章
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                  @click="handleRefresh(subscription)"
                >
                  刷新文章
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                  @click="handleDelete(subscription)"
                >
                  删除订阅
                </button>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <section
        id="rss-articles"
        class="rounded-2xl border border-blue-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold text-blue-900 dark:text-white">
              文章列表
            </h2>
            <p class="mt-1 text-sm text-blue-600 dark:text-blue-400">
              搜索与分页阅读已保存文章
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            :disabled="articlesLoading"
            @click="fetchArticles(currentPage)"
          >
            {{ articlesLoading ? "加载中..." : "刷新文章" }}
          </button>
        </div>

        <div class="mb-4 flex flex-col gap-3 lg:flex-row">
          <div class="relative flex-1">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="搜索文章标题和内容..."
              class="w-full rounded-xl border border-blue-200 bg-white py-3 pr-24 pl-4 text-sm text-blue-900 placeholder:text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
              @keyup.enter="handleSearch"
            />
            <div class="absolute inset-y-0 right-2 flex items-center gap-1">
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-slate-700 dark:hover:text-blue-300"
                @click="handleSearch"
              >
                搜索
              </button>
              <button
                v-if="searchQuery"
                type="button"
                class="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-slate-700 dark:hover:text-blue-300"
                @click="clearSearch"
              >
                清空
              </button>
            </div>
          </div>
        </div>

        <div v-if="selectedFeedUrl" class="mb-4 flex items-center gap-2">
          <span
            class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          >
            当前来源: {{ selectedFeedUrl }}
          </span>
          <button
            type="button"
            class="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-slate-600 dark:text-blue-300 dark:hover:bg-slate-700"
            @click="clearFeedFilter"
          >
            清除筛选
          </button>
        </div>

        <div
          v-if="articlesError"
          class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          {{ articlesError }}
        </div>

        <div v-else-if="articlesLoading" class="space-y-3">
          <div
            v-for="skeleton in 5"
            :key="skeleton"
            class="h-24 animate-pulse rounded-xl border border-blue-100 bg-blue-50 dark:border-slate-700 dark:bg-slate-700/40"
          />
        </div>

        <div
          v-else-if="articles.length === 0"
          class="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-8 text-center text-sm text-blue-600 dark:border-slate-700 dark:bg-slate-700/20 dark:text-blue-400"
        >
          暂无文章，尝试刷新订阅或更换搜索条件。
        </div>

        <div v-else>
          <ul class="space-y-3">
            <li
              v-for="article in articles"
              :key="article.id"
              class="rounded-xl border border-blue-100 bg-white p-4 transition-all hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600"
            >
              <div class="flex flex-col gap-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <router-link
                    :to="`/rss/articles/${article.id}`"
                    class="text-base font-semibold text-blue-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                  >
                    {{ article.title || "无标题" }}
                  </router-link>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="
                      article.is_read
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    "
                  >
                    {{ article.is_read ? "已读" : "未读" }}
                  </span>
                </div>
                <p
                  v-if="article.summary"
                  class="line-clamp-2 text-sm text-blue-600 dark:text-blue-400"
                >
                  {{ article.summary }}
                </p>
                <div
                  class="flex flex-wrap items-center gap-3 text-xs text-blue-500 dark:text-blue-400"
                >
                  <span v-if="article.author">作者: {{ article.author }}</span>
                  <span>发布时间: {{ formatDate(article.published) }}</span>
                  <span class="truncate">来源: {{ article.feed_url }}</span>
                  <a
                    :href="article.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    阅读原文
                  </a>
                </div>
              </div>
            </li>
          </ul>

          <nav
            v-if="totalPages > 1"
            class="mt-6 flex items-center justify-center gap-3"
          >
            <button
              type="button"
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
            <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
              第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
            </span>
            <button
              type="button"
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
          </nav>
        </div>
      </section>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import { BasicDetail } from "@/components/basic";
import { rssService } from "@/service/rssService";
import { useNotificationStore } from "@/stores/notification";
import type { RssArticle, RssSubscription } from "@/types";
import { formatDate } from "@/utils/formatdate";
import { useStorage } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

interface RssMetadata {
  title: string;
  description: string;
  link: string;
  published?: string | null;
}

interface RssEntry {
  title: string;
  link: string;
  summary: string;
  published: string | null;
  content?: string;
}

interface ParseForm {
  rssUrl: string;
  saveToDb: boolean;
}

interface ExampleFeed {
  name: string;
  url: string;
}

const route = useRoute();
const router = useRouter();
const notifier = useNotificationStore();

const rssForm = ref<ParseForm>({
  rssUrl: "",
  saveToDb: false,
});
const rssHistory = useStorage<string[]>("rssHistory", []);
const parseMetadata = ref<RssMetadata | null>(null);
const parseEntries = ref<RssEntry[]>([]);
const parseLoading = ref(false);

type ViewSubscription = RssSubscription & {
  rss_url: string;
  feed_title: string | null;
  entry_count: number;
  last_fetched_at: string | null;
  created_at: string;
};

const subscriptions = ref<ViewSubscription[]>([]);
const subscriptionsLoading = ref(false);
const subscriptionsError = ref("");
const activeSubscriptionId = ref<number | null>(null);

const articles = ref<RssArticle[]>([]);
const articlesLoading = ref(false);
const articlesError = ref("");
const currentPage = ref(1);
const totalItems = ref(0);
const limit = 20;
const searchQuery = ref("");
const selectedFeedUrl = ref("");

const exampleFeeds: ExampleFeed[] = [
  { name: "少数派", url: "https://sspai.com/feed" },
  { name: "GitHub", url: "https://github.com/blog.atom" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
];

const totalPages = computed(() => Math.ceil(totalItems.value / limit));

const truncateSummary = (summary: string, maxLength = 160): string => {
  if (!summary) {
    return "";
  }

  const plainText = summary.replace(/<[^>]*>/g, "").trim();
  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength)}...`;
};

const getFeedHost = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const getFeedProtocol = (url: string): string => {
  try {
    return new URL(url).protocol.replace(":", "").toUpperCase();
  } catch {
    return "URL";
  }
};

const getSubscriptionTitle = (subscription: RssSubscription): string => {
  if (subscription.feed_title && subscription.feed_title.trim()) {
    return subscription.feed_title;
  }

  return getFeedHost(subscription.rss_url);
};

const mapSubscriptionForView = (subscription: unknown): ViewSubscription => {
  const source = subscription as RssSubscription & {
    rssUrl?: string;
    feedTitle?: string;
    entryCount?: number;
    lastFetchedAt?: string | null;
    createdAt?: string;
    rss_url?: string;
    feed_title?: string;
    entry_count?: number;
    last_fetched_at?: string | null;
    created_at?: string;
  };

  return {
    ...(source as RssSubscription),
    rss_url: source.rss_url ?? source.rssUrl ?? "",
    feed_title: source.feed_title ?? source.feedTitle ?? null,
    entry_count: source.entry_count ?? source.entryCount ?? 0,
    last_fetched_at: source.last_fetched_at ?? source.lastFetchedAt ?? null,
    created_at: source.created_at ?? source.createdAt ?? "",
  };
};

const syncRouteQuery = async (page: number): Promise<void> => {
  const query: Record<string, string> = {};
  if (page > 1) {
    query.page = String(page);
  }
  if (selectedFeedUrl.value.trim()) {
    query.feed_url = selectedFeedUrl.value.trim();
  }
  if (searchQuery.value.trim()) {
    query.search = searchQuery.value.trim();
  }

  try {
    await router.replace({
      path: "/rss",
      query,
    });
  } catch {
    // 同一路由重复更新 query 时可忽略
  }
};

const parseRss = async (): Promise<void> => {
  const rssUrl = rssForm.value.rssUrl.trim();
  if (!rssUrl) {
    notifier.error("请输入 RSS 订阅地址");
    return;
  }

  parseLoading.value = true;

  if (!rssHistory.value.includes(rssUrl)) {
    rssHistory.value.unshift(rssUrl);
    if (rssHistory.value.length > 3) {
      rssHistory.value.splice(3);
    }
  }

  try {
    const parsedData = await rssService.parseRss({
      rss_url: rssUrl,
      save_to_db: rssForm.value.saveToDb,
    });

    parseMetadata.value = {
      title: parsedData.meta.title,
      description: parsedData.meta.description,
      link: parsedData.meta.link,
      published: parsedData.meta.published ?? null,
    };
    parseEntries.value = parsedData.entries.map((entry) => ({
      title: entry.title,
      link: entry.link,
      summary: entry.summary,
      published: entry.published ?? null,
      content: entry.content,
    }));

    notifier.success("RSS 解析成功");

    if (rssForm.value.saveToDb) {
      await fetchSubscriptions();
      await fetchArticles(1);
    }
  } catch (error: unknown) {
    console.error("RSS parse error:", error);
    notifier.error(
      `解析失败: ${error instanceof Error ? error.message : "未知错误"}`,
    );
  } finally {
    parseLoading.value = false;
  }
};

const fetchSubscriptions = async (): Promise<void> => {
  subscriptionsLoading.value = true;
  subscriptionsError.value = "";

  try {
    const data = await rssService.getSubscriptions();
    if (!Array.isArray(data)) {
      throw new Error("订阅列表格式错误");
    }

    subscriptions.value = data.map((item) => mapSubscriptionForView(item));

    if (selectedFeedUrl.value) {
      const active = subscriptions.value.find(
        (subscription) => subscription.rss_url === selectedFeedUrl.value,
      );
      activeSubscriptionId.value = active ? active.id : null;
    }
  } catch (error: unknown) {
    console.error("fetch subscriptions error:", error);
    subscriptionsError.value =
      error instanceof Error ? error.message : "加载订阅失败";
    notifier.error(subscriptionsError.value);
  } finally {
    subscriptionsLoading.value = false;
  }
};

const fetchArticles = async (page = 1): Promise<void> => {
  articlesLoading.value = true;
  articlesError.value = "";

  try {
    const params: Record<string, number | string> = {
      page,
      limit,
    };

    const feedUrl = selectedFeedUrl.value.trim();
    if (feedUrl) {
      params.feed_url = feedUrl;
    }

    const search = searchQuery.value.trim();
    if (search) {
      params.search = search;
    }

    const response = await rssService.getArticles(params);
    articles.value = response.items;
    totalItems.value = response.total;
    currentPage.value = response.page;
  } catch (error: unknown) {
    console.error("fetch articles error:", error);
    articlesError.value =
      error instanceof Error ? error.message : "加载文章失败";
    notifier.error(articlesError.value);
  } finally {
    articlesLoading.value = false;
  }
};

const handleRefresh = async (subscription: RssSubscription): Promise<void> => {
  try {
    await rssService.refreshSubscription(subscription.id);
    notifier.success(`已刷新：${getSubscriptionTitle(subscription)}`);
    await fetchSubscriptions();

    if (selectedFeedUrl.value === subscription.rss_url) {
      await fetchArticles(1);
    }
  } catch (error: unknown) {
    console.error("refresh subscription error:", error);
    notifier.error(
      `刷新失败: ${error instanceof Error ? error.message : "未知错误"}`,
    );
  }
};

const handleDelete = async (subscription: RssSubscription): Promise<void> => {
  const confirmed = window.confirm(
    `确定删除订阅「${getSubscriptionTitle(subscription)}」及其相关文章吗？`,
  );
  if (!confirmed) {
    return;
  }

  try {
    await rssService.deleteSubscription(subscription.id);
    notifier.success("订阅删除成功");

    if (selectedFeedUrl.value === subscription.rss_url) {
      selectedFeedUrl.value = "";
      activeSubscriptionId.value = null;
      await syncRouteQuery(1);
      await fetchArticles(1);
    }

    await fetchSubscriptions();
  } catch (error: unknown) {
    console.error("delete subscription error:", error);
    notifier.error(
      `删除失败: ${error instanceof Error ? error.message : "未知错误"}`,
    );
  }
};

const filterByFeed = async (subscription: RssSubscription): Promise<void> => {
  selectedFeedUrl.value = subscription.rss_url;
  activeSubscriptionId.value = subscription.id;
  await syncRouteQuery(1);
  await fetchArticles(1);
};

const clearFeedFilter = async (): Promise<void> => {
  selectedFeedUrl.value = "";
  activeSubscriptionId.value = null;
  await syncRouteQuery(1);
  await fetchArticles(1);
};

const handleSearch = async (): Promise<void> => {
  await syncRouteQuery(1);
  await fetchArticles(1);
};

const clearSearch = async (): Promise<void> => {
  searchQuery.value = "";
  await handleSearch();
};

const goToPage = async (page: number): Promise<void> => {
  if (page < 1 || page > totalPages.value) {
    return;
  }

  await syncRouteQuery(page);
  await fetchArticles(page);
};

onMounted(async () => {
  if (typeof route.query.feed_url === "string") {
    selectedFeedUrl.value = route.query.feed_url;
  }
  if (typeof route.query.search === "string") {
    searchQuery.value = route.query.search;
  }

  const pageFromQuery =
    typeof route.query.page === "string"
      ? Number.parseInt(route.query.page, 10)
      : 1;
  const initialPage =
    Number.isNaN(pageFromQuery) || pageFromQuery < 1 ? 1 : pageFromQuery;

  await Promise.all([fetchSubscriptions(), fetchArticles(initialPage)]);
});
</script>
