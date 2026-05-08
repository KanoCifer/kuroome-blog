<template>
  <BentoCard
    class="group relative h-fit cursor-pointer overflow-hidden"
    @click="goToWebsites"
  >
    <div class="relative z-10 flex h-full flex-col justify-between px-6 py-4">
      <div
        class="text-xs font-bold tracking-wide text-neutral-500 uppercase transition-colors duration-300 group-hover:text-neutral-600 dark:text-neutral-400 dark:group-hover:text-neutral-300"
      >
        Daily Pick
      </div>
      <div class="my-1 flex items-center">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors duration-300 group-hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:group-hover:bg-neutral-600"
        >
          <img
            v-if="randomSite?.icon"
            :src="randomSite.icon"
            :alt="randomSite?.name"
            class="h-6 w-6 object-contain"
            @error="handleImageError"
          />
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0 3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        </div>
        <h3
          class="ml-2 text-lg leading-tight font-bold text-neutral-800 transition-colors duration-300 group-hover:text-neutral-950 dark:text-neutral-100 dark:group-hover:text-white"
        >
          {{ randomSite?.name || "加载中..." }}
        </h3>
      </div>
      <div>
        <p
          class="line-clamp-2 text-sm text-neutral-500 transition-colors duration-300 group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-300"
        >
          {{ randomSite?.description || "正在获取推荐网站..." }}
        </p>
      </div>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import websitesData from "@/data/websites.json";
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

interface Website {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: string;
  tags: string[];
}

const randomSite = computed<Website | null>(() => {
  if (websitesData.sites.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * websitesData.sites.length);
  return websitesData.sites[randomIndex];
});

const goToWebsites = () => {
  router.push("/websites");
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
};
</script>
