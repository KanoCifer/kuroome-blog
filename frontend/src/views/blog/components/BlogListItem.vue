<template>
  <motion.div
    :whileHover="{ scale: 1.02 }"
    :whilePress="{ scale: 0.98 }"
    :initial="{ opacity: 0, y: 20 }"
    :whileInView="{ opacity: 1, y: 0 }"
    :transition="{ type: 'spring', duration: 0.5 }"
  >
    <router-link :to="`/blog/${post._id}`" class="group block">
      <article
        class="border-border/40 bg-card group-hover:border-primary/25 relative overflow-hidden rounded-3xl border p-6 shadow-sm transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-md"
      >
        <!-- Left spine accent — scales up on hover -->
        <div
          class="bg-primary absolute top-0 left-0 h-full w-1 origin-top scale-y-0 rounded-r-full transition-transform duration-500 ease-out group-hover:scale-y-100"
          aria-hidden="true"
        />

        <!-- 顶部元数据：置顶 / 日期 / 分类 -->
        <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            v-if="post.is_pinned"
            class="bg-primary/15 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
              />
            </svg>
            置顶
          </span>
          <span
            v-if="post.category"
            class="text-foreground/80 text-xs font-medium"
          >
            # {{ post.category.name }}
          </span>
          <time
            class="text-foreground/70 text-xs tabular-nums"
            :datetime="post.created_at"
          >
            {{ formatDate(post.created_at) }}
          </time>
        </div>

        <!-- Title: 始终用 text-foreground 保证对比度 -->
        <h2
          class="text-foreground group-hover:text-primary font-serif text-2xl leading-snug font-semibold transition-colors duration-300 ease-out"
          style="text-wrap: balance"
        >
          {{ post.title }}
        </h2>

        <!-- Decorative divider — extends on hover -->
        <div
          class="bg-border group-hover:bg-primary/15 my-4 h-1 w-16 transition-all duration-500 ease-out group-hover:w-full"
          aria-hidden="true"
        />

        <!-- Summary: 留出固定高度，缺数据时也不塌陷 -->
        <p
          v-if="post.summary"
          class="text-foreground/75 line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed"
        >
          {{ post.summary }}
        </p>
        <p v-else class="text-foreground/40 min-h-[2.75rem] text-sm italic">
          （暂无摘要）
        </p>

        <!-- Footer meta: 阅读时长 / 字数 / 浏览量 -->
        <footer
          class="text-foreground/60 mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
        >
          <span class="inline-flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="text-foreground/60 h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
              />
            </svg>
            <span class="text-foreground/60"
              >{{ readingTimeMinutes }} 分钟阅读</span
            >
          </span>
          <template v-if="CHAR_COUNT > 0">
            <span aria-hidden="true" class="text-border">·</span>
            <span class="text-foreground/60 tabular-nums">{{
              wordCountText
            }}</span>
          </template>
          <template v-if="post.views">
            <span aria-hidden="true" class="text-border">·</span>
            <span
              class="text-foreground/60 inline-flex items-center gap-1 tabular-nums"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {{ post.views }}
            </span>
          </template>
        </footer>
      </article>
    </router-link>
  </motion.div>
</template>

<script setup lang="ts">
import type { Post } from '@/types';
import { formatDate } from '@/utils/formatdate';
import { motion } from 'motion-v';
import { computed } from 'vue';

const props = defineProps<{
  post: Post;
  index?: number;
}>();

// 中文按字符算阅读时间，约 300 字/分钟；纯 markdown 内容先剥标签
const PLAIN_TEXT = computed(() => {
  const raw = props.post.content || props.post.body || '';
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/[#*_`>\-![\]()~]/g, '')
    .trim();
});

const CHAR_COUNT = computed(() => [...PLAIN_TEXT.value].length);

const wordCountText = computed(() => {
  const n = CHAR_COUNT.value;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k 字`;
  return `${n} 字`;
});

const readingTimeMinutes = computed(() => {
  // 300 字/分钟，最少 1 分钟
  return Math.max(1, Math.round(CHAR_COUNT.value / 300));
});
</script>
