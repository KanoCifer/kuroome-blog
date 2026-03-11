<template>
  <div class="mt-36 min-h-screen rounded-t-4xl bg-gray-50 px-4 py-12 dark:bg-gray-900">
    <div class="mx-auto max-w-6xl">
      <div class="mb-12 text-center">
        <h1 class="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-50">推荐网站</h1>
        <p class="text-lg text-gray-600 dark:text-gray-400">发现有趣的网站和工具</p>
      </div>

      <TransitionGroup
        tag="div"
        mode="out-in"
        enter-active-class="transition-all transform-gpu duration-500 ease-in-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all transform-gpu duration-500 ease-in-out"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <a
          v-for="site in sites"
          :key="site.id"
          :href="site.url"
          target="_blank"
          rel="noopener noreferrer"
          class="group squircle relative cursor-pointer overflow-hidden border border-gray-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/70"
        >
          <div class="mb-4 flex items-start gap-4">
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800"
            >
              <img
                v-if="site.icon"
                :src="site.icon"
                :alt="site.name"
                class="h-8 w-8 object-contain"
                @error="handleImageError"
              />
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h3
                class="truncate text-lg font-bold text-gray-900 transition-colors duration-300 group-hover:text-gray-700 dark:text-gray-100 dark:group-hover:text-gray-300"
              >
                {{ site.name }}
              </h3>
              <span
                class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                {{ site.category }}
              </span>
            </div>
          </div>

          <p class="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {{ site.description }}
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="tag in site.tags"
              :key="tag"
              class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              {{ tag }}
            </span>
          </div>

          <div
            class="absolute top-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
        </a>
      </TransitionGroup>

      <div class="mt-12 text-center">
        <RouterLink
          to="/"
          class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回首页
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import websitesData from "@/data/websites.json";
import { onMounted, ref } from "vue";

interface Website {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: string;
  tags: string[];
}

const sites = ref<Website[]>([]);

const loadSites = () => {
  const allSites = websitesData.sites;
  const delay = 500; // 每个卡片间隔 500ms

  allSites.forEach((site: Website, index: number) => {
    setTimeout(() => {
      sites.value.push(site);
    }, index * delay);
  });
};

onMounted(() => {
  loadSites();
});

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
};
</script>
