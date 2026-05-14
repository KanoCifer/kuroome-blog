<template>
  <BasicDetail title="友情链接" subtitle="与志同道合的朋友交换链接">
    <!-- 友链卡片列表 -->
    <motion.a
      v-for="link in links"
      :key="link.id"
      :initial="{ opacity: 0, y: 10 }"
      :whileInView="{ opacity: 1, y: 0 }"
      :transition="{
        type: 'spring',
        duration: 1,
        stiffness: 100,
        damping: 20,
      }"
      :while-hover="{ y: -5 }"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
      class="group squircle relative cursor-pointer overflow-hidden border border-gray-200/60 bg-white/30 p-6 shadow-sm hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/70"
    >
      <div class="mb-4 flex items-start gap-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
          <img
            v-if="link.icon"
            :src="link.icon"
            :alt="link.name"
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
            {{ link.name }}
          </h3>
          <span
            class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {{ link.tags[0] || "友链" }}
          </span>
        </div>
      </div>

      <p class="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {{ link.description }}
      </p>

      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="tag in link.tags"
          :key="tag"
          class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        >
          {{ tag }}
        </span>
      </div>

      <div class="absolute top-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
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

    <!-- 空状态 -->
    <div v-if="links.length === 0" class="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="text-muted-foreground mb-4 h-16 w-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <p class="text-muted-foreground dark:text-muted-foreground text-lg">暂无友链</p>
      <p class="text-muted-foreground mt-2 text-sm">欢迎提交申请，成为第一位友链伙伴</p>
    </div>

    <!-- 友链申请表单 -->
    <div class="col-span-full">
      <FriendLinkApplicationForm />
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import { BasicDetail } from "@/components/basic";
import FriendLinkApplicationForm from "@/components/friendlink/FriendLinkApplicationForm.vue";
import friendLinksData from "@/data/friendlinks.json";
import { onMounted, ref } from "vue";
import { motion } from "motion-v";

interface FriendLink {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  tags: string[];
}

const links = ref<FriendLink[]>([]);

onMounted(() => {
  links.value = friendLinksData.links;
});

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
};
</script>
