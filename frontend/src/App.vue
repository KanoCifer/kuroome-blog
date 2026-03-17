<script setup lang="ts">
import { useHead } from "@vueuse/head";
import BasicLayout from "./layouts/BasicLayout.vue";

// define head metadata centrally
useHead({
  title: "ReadingList - 阅读清单 | Kuroome's Blog",
  meta: [
    { charset: "UTF-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1.0" },
    {
      name: "description",
      content:
        "ReadingList - 个人阅读追踪与管理应用，支持微信读书导入，记录阅读进度，分享阅读心得",
    },
    {
      name: "keywords",
      content: "阅读追踪,阅读清单,微信读书,读书笔记,个人图书馆,阅读管理",
    },
    { name: "robots", content: "index, follow" },
    { name: "author", content: "ReadingList" },
    // Open Graph
    { property: "og:title", content: "ReadingList - 阅读清单" },
    {
      property: "og:description",
      content: "个人阅读追踪与管理应用，支持微信读书导入",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://kanocifer.com" },
    { property: "og:image", content: "https://kanocifer.com/og-image.png" },
    { property: "og:site_name", content: "ReadingList" },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "ReadingList - 阅读清单" },
    {
      name: "twitter:description",
      content: "个人阅读追踪与管理应用，支持微信读书导入",
    },
    { name: "twitter:image", content: "https://kanocifer.com/og-image.png" },
  ],
  link: [{ rel: "icon", type: "image/svg+xml", href: "/vite.svg" }],
});
</script>

<template>
  <BasicLayout />
</template>
