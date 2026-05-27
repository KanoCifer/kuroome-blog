<template>
  <BasicDetail title="推荐网站" subtitle="发现有趣的网站和工具">
    <motion.a
      :initial="{ opacity: 0, y: 10 }"
      :whileInView="{ opacity: 1, y: 0 }"
      :transition="{
        type: 'spring',
        duration: 1,
        stiffness: 100,
        damping: 20,
      }"
      :while-hover="{ y: -5 }"
      v-for="site in sites"
      :key="site.id"
      :href="site.url"
      target="_blank"
      rel="noopener noreferrer"
      class="group squircle relative cursor-pointer overflow-hidden border border-gray-200/60 bg-white/30 p-6 shadow-sm hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/70"
    >
      <div class="mb-4 flex items-start gap-4">
        <div
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700"
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

      <p
        class="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400"
      >
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
    </motion.a>
  </BasicDetail>
</template>

<script setup lang="ts">
import { BasicDetail } from "@/components/basic";
import websitesData from "@/data/websites.json";
import type { Website } from "@/types";
import { useImageError } from "@/composables/useImageError";
import { onMounted, ref } from "vue";
import { motion } from "motion-v";

const sites = ref<Website[]>([]);

onMounted(() => {
  sites.value = websitesData.sites;
});

const { handleImageError } = useImageError();
</script>
