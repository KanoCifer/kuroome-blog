<template>
  <div
    class="mt-24 min-h-screen rounded-t-4xl bg-blue-50/80 px-4 py-8 backdrop-blur-sm sm:px-6 lg:px-8 dark:bg-slate-900/80"
    :style="sectionStyle"
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
              d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324.324a1.454 1.454 0 01-2.106 0L3.955 15.41c-.87-.88-1.22-1.964-.7-2.299l.485-.491a2.025 2.025 0 011.515-.39l.583.284a1.75 1.75 0 001.934 0l.584-.284c.52-.335.64-.86.7-1.299l.486-.491"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-3xl font-bold text-blue-900 dark:text-white">RSS 阅读器</h1>
          <p class="mt-1 text-sm text-blue-600 dark:text-blue-400">解析并阅读 RSS/Atom 订阅源</p>
        </div>
        <RouterLink
          to="/rss/subscriptions"
          class="ml-auto text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >管理订阅</RouterLink
        >
      </div>

      <!-- 输入区域 -->
      <div
        class="mb-8 rounded-2xl border border-blue-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <form @submit.prevent="parseRss" class="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label
              for="rss-url"
              class="mb-2 block text-sm font-medium text-blue-800 dark:text-blue-200"
            >
              RSS/Atom 订阅地址
            </label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-5 w-5 text-blue-400"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
              </div>
              <input
                id="rss-url"
                v-model="rssForm.rssUrl"
                type="text"
                placeholder="https://example.com/feed.xml"
                class="w-full rounded-xl border border-blue-200 bg-blue-50 py-3 pr-4 pl-12 text-blue-900 transition-all placeholder:text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400"
              />
            </div>
          </div>
          <!-- 保存选项 -->

          <button
            type="button"
            @click="rssForm.saveToDb = !rssForm.saveToDb"
            class="flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-100 px-8 py-3 font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:border-slate-700 dark:bg-slate-700/50 dark:text-blue-300 dark:hover:bg-slate-600/50"
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
                d="M9 12h3.75M9 15h3.75M3 9h15M3 12h15M3 15h15M21 9l-6 6m0 0l-6-6m6 6V3"
              />
            </svg>
            {{ rssForm.saveToDb ? "已保存" : "保存到数据库" }}
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 py-3 font-semibold text-white transition-all hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-orange-500 dark:ring-offset-slate-800"
          >
            <svg
              v-if="isLoading"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              class="h-5 w-5 animate-spin"
            >
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
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            {{ isLoading ? "解析中..." : "解析订阅" }}
          </button>
        </form>

        <!-- 快捷链接 -->
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="text-sm text-blue-600 dark:text-blue-400">快捷尝试:</span>
          <button
            v-for="example in exampleFeeds"
            :key="example.url"
            type="button"
            class="cursor-pointer rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600"
            @click="rssForm.rssUrl = example.url"
          >
            {{ example.name }}
          </button>

          <span class="text-sm text-blue-600 dark:text-blue-400">历史记录:</span>
          <button
            v-for="history in rssHistory.slice(0, 3)"
            :key="history"
            type="button"
            class="cursor-pointer rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600"
            @click="rssForm.rssUrl = history"
          >
            {{ history }}
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
          <div class="mb-4 h-4 w-full rounded bg-blue-100 dark:bg-slate-700" />
          <div class="h-4 w-1/3 rounded bg-blue-100 dark:bg-slate-700" />
        </div>
      </div>

      <!-- RSS 元数据 -->
      <div
        v-else-if="rssMetadata"
        class="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="border-b border-blue-100 p-6 dark:border-slate-700">
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <h2 class="mb-2 text-xl font-bold text-blue-900 dark:text-white">
                {{ rssMetadata.title }}
              </h2>
              <p
                v-if="rssMetadata.description"
                class="mb-3 text-sm text-blue-600 dark:text-blue-400"
              >
                {{ rssMetadata.description }}
              </p>
              <a
                :href="rssMetadata.link"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                访问原站
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
              </a>
            </div>
            <div
              class="ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-6 w-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324.324a1.454 1.454 0 01-2.106 0L3.955 15.41c-.87-.88-1.22-1.964-.7-2.299l.485-.491a2.025 2.025 0 011.515-.39l.583.284a1.75 1.75 0 001.934 0l.584-.284c.52-.335.64-.86.7-1.299l.486-.491"
                />
              </svg>
            </div>
          </div>
          <div
            v-if="rssMetadata.published"
            class="mt-3 flex items-center gap-2 text-xs text-blue-500"
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
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            最后更新: {{ formatDate(rssMetadata.published) }}
          </div>
        </div>

        <!-- 统计信息 -->
        <div
          class="flex items-center gap-6 border-t border-blue-100 bg-blue-50/50 px-6 py-4 dark:border-slate-700 dark:bg-slate-700/20"
        >
          <div class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-5 w-5 text-blue-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
              />
            </svg>
            <span class="text-sm font-medium text-blue-700 dark:text-blue-300"
              >共 {{ rssEntries.length }} 篇文章</span
            >
          </div>
        </div>
      </div>

      <!-- RSS 条目列表 -->
      <div v-if="rssEntries.length > 0" class="space-y-4">
        <h3 class="mb-4 flex items-center gap-2 text-lg font-bold text-blue-900 dark:text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-5 w-5 text-blue-500"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          文章列表
        </h3>
        <ul class="space-y-3">
          <li
            v-for="(entry, index) in rssEntries"
            :key="entry.link"
            class="group relative overflow-hidden rounded-xl border border-blue-100 bg-white p-5 transition-all hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600 dark:hover:bg-slate-700/50"
            :style="{ '--index': index }"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 flex-1">
                <a
                  :href="entry.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block cursor-pointer font-semibold text-blue-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                >
                  {{ entry.title }}
                </a>
                <p
                  v-if="entry.summary"
                  class="mt-2 line-clamp-2 text-sm text-blue-600 dark:text-blue-400"
                >
                  {{ truncateSummary(entry.summary) }}
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-blue-500">
                  <span v-if="entry.published" class="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="h-3.5 w-3.5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                    {{ formatDate(entry.published) }}
                  </span>
                  <a
                    :href="entry.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex cursor-pointer items-center gap-1 text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="h-3.5 w-3.5"
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
            </div>
          </li>
        </ul>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!isLoading && !rssMetadata"
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
              d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324.324a1.454 1.454 0 01-2.106 0L3.955 15.41c-.87-.88-1.22-1.964-.7-2.299l.485-.491a2.025 2.025 0 011.515-.39l.583.284a1.75 1.75 0 001.934 0l.584-.284c.52-.335.64-.86.7-1.299l.486-.491"
            />
          </svg>
        </div>
        <h3 class="mb-2 text-xl font-bold text-blue-900 dark:text-white">输入 RSS/Atom 订阅地址</h3>
        <p class="mb-6 text-center text-blue-600 dark:text-blue-400">
          在上方输入框中粘贴 RSS 或 Atom 订阅链接，即可解析阅读
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import request from "@/request";
import { useNotificationStore } from "@/stores/notification";
import { useScroll, useStorage } from "@vueuse/core";
import { computed, ref } from "vue";
interface RssMetadata {
  title: string;
  description: string;
  link: string;
  published?: string;
}

interface RssEntry {
  title: string;
  link: string;
  summary: string;
  published: string;
  content?: string;
}

interface ExampleFeed {
  name: string;
  url: string;
}

interface ParseForm {
  rssUrl: string;
  saveToDb: boolean;
}

const rssForm = ref<ParseForm>({
  rssUrl: "",
  saveToDb: false,
});
// useStorage already keeps the array synced with localStorage; mutations
// to rssHistory.value will persist automatically.
const rssHistory = useStorage<string[]>("rssHistory", []);
const rssMetadata = ref<RssMetadata | null>(null);
const rssEntries = ref<RssEntry[]>([]);
const isLoading = ref(false);
const notifier = useNotificationStore();

// Example RSS feeds for quick testing
const exampleFeeds: ExampleFeed[] = [
  { name: "少数派", url: "https://sspai.com/feed" },
  { name: "掘金", url: "https://juejin.cn/feed" },
  { name: "GitHub", url: "https://github.com/blog.atom" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
];

// Format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? "刚刚" : `${diffMins} 分钟前`;
      }
      return diffHours === 1 ? "1 小时前" : `${diffHours} 小时前`;
    } else if (diffDays === 1) {
      return "昨天";
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  } catch {
    return dateString;
  }
};

// Truncate summary text
const truncateSummary = (summary: string, maxLength: number = 150): string => {
  if (!summary) return "";
  // Remove HTML tags if present
  const text = summary.replace(/<[^>]*>/g, "").trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const parseRss = async () => {
  if (!rssForm.value.rssUrl.trim()) {
    notifier.error("请输入 RSS 订阅地址");
    return;
  }

  isLoading.value = true;

  // Save to history with cap of 3 entries
  if (!rssHistory.value.includes(rssForm.value.rssUrl)) {
    rssHistory.value.unshift(rssForm.value.rssUrl);
    if (rssHistory.value.length > 3) {
      rssHistory.value.splice(3);
    }
  }

  try {
    const response = await request.post("/rss/parse-rss", {
      rss_url: rssForm.value.rssUrl,
      save_to_db: rssForm.value.saveToDb,
    });

    if (response.status === 200) {
      const parsedData = response.data.data;

      // Extract RSS metadata and entries
      const meta = parsedData.meta;
      const entries = parsedData.entries;

      notifier.success("RSS 解析成功");

      // Update the UI with the parsed RSS metadata
      rssMetadata.value = {
        title: meta.title,
        description: meta.description,
        link: meta.link,
        published: meta.published,
      };

      // Update the UI with the parsed RSS entries
      rssEntries.value = entries.map(
        (entry: {
          title: string;
          link: string;
          summary: string;
          published: string;
          content?: string;
        }) => ({
          title: entry.title,
          link: entry.link,
          summary: entry.summary,
          content: entry.content,
          published: entry.published,
        }),
      );
    } else {
      notifier.error("解析失败，请检查 RSS 地址是否正确");
    }
  } catch (error) {
    console.error("RSS parse error:", error);
    notifier.error("解析失败: " + (error instanceof Error ? error.message : "未知错误"));
  } finally {
    isLoading.value = false;
  }
};

const { y } = useScroll(window);
const sectionStyle = computed(() => {
  // compute scale with a ceiling of 1 so the content does not grow indefinitely
  const scale = Math.min(1, 0.9 + y.value * 0.001);
  return {
    transform: `scale(${scale})`, // 内容区稍快
  };
});
</script>
