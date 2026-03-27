<template>
  <motion.nav
    :initial="{ y: 10, opacity: 0 }"
    :animate="{ y: 0, opacity: 1 }"
    :exit="{ y: 10, opacity: 0 }"
    :transition="{ type: 'spring', damping: 20, stiffness: 300 }"
    class="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-[3rem] bg-white/40 px-8 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-2xl"
  >
    <!-- Active Home -->
    <div class="group flex flex-col items-center gap-1">
      <router-link
        to="/"
        active-class="rounded-full bg-linear-to-br from-blue-500/80 to-blue-700/80 text-white shadow-lg"
        class="flex h-12 w-12 items-center justify-center rounded-full text-slate-600 transition-all hover:scale-110 active:scale-90 dark:text-slate-300"
      >
        <home-icon class="h-6 w-6" />
      </router-link>
      <span :style="homePage" class="font-['Inter'] text-[10px] font-medium text-slate-500"
        >Home</span
      >
    </div>
    <!-- Messages -->
    <div class="group flex flex-col items-center gap-1">
      <router-link
        to="/blog"
        active-class="rounded-full bg-linear-to-br from-blue-500/80 to-blue-700/80 text-white shadow-lg"
        class="flex h-12 w-12 items-center justify-center rounded-full text-slate-600 transition-all hover:scale-110 active:scale-90 dark:text-slate-300"
      >
        <blog-icon class="h-6 w-6" />
      </router-link>
      <span :style="blogPage" class="font-['Inter'] text-[10px] font-medium text-slate-500"
        >Blogs</span
      >
    </div>
    <button
      class="-mt-12 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-400/20 bg-blue-300 text-white shadow-xl shadow-blue-500/40"
    >
      <span class="text-[10px] font-bold">New</span>
    </button>
    <!-- Documentation/Stories -->
    <div class="group flex flex-col items-center gap-1">
      <router-link
        to="/rss"
        active-class="rounded-full bg-linear-to-br from-blue-500/80 to-blue-700/80 text-white shadow-lg"
        class="flex h-12 w-12 items-center justify-center rounded-full text-slate-600 transition-all hover:scale-110 active:scale-90 dark:text-slate-300"
      >
        <rss-icon class="h-6 w-6" />
      </router-link>
      <span :style="rssPage" class="font-['Inter'] text-[10px] font-medium text-slate-500"
        >Rss</span
      >
    </div>
    <!-- More -->
    <div class="group flex flex-col items-center gap-1">
      <button
        class="flex h-12 w-12 items-center justify-center rounded-full text-slate-600 transition-all hover:scale-110 active:scale-90 dark:text-slate-300"
      >
        <icon-more class="h-6 w-6" />
      </button>
      <span class="font-['Inter'] text-[10px] font-medium text-slate-500">More</span>
    </div>
  </motion.nav>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { motion } from "motion-v";
import { RssIcon } from "../icons";
import { BlogIcon } from "../icons";
import { HomeIcon } from "../icons";
import { computed } from "vue";
import IconMore from "../icons/IconMore.vue";

const route = useRoute();

// 定义动态样式
const homePage = computed(() => ({
  color: route.path === "/" ? "#3b82f6" : "#6b7280",
}));

const blogPage = computed(() => ({
  color: route.path === "/blog" ? "#3b82f6" : "#6b7280",
}));

const rssPage = computed(() => ({
  color: route.path === "/rss" ? "#3b82f6" : "#6b7280",
}));
</script>
