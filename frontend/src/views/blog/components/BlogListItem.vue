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

        <!-- Pinned badge -->
        <div v-if="post.is_pinned" class="mb-4">
          <span
            class="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
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
        </div>

        <!-- Title -->
        <h2
          class="text-primary group-hover:text-primary group-hover:bg-primary/30 w-fit rounded-full px-3 py-2 font-serif text-2xl leading-snug transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-sm"
          style="text-wrap: balance"
        >
          {{ post.title }}
        </h2>

        <!-- Decorative divider — extends on hover -->
        <div
          class="bg-border group-hover:bg-primary/15 my-4 h-1 w-16 transition-all duration-500 ease-out group-hover:w-full"
          aria-hidden="true"
        />

        <!-- Summary -->
        <p
          v-if="post.summary"
          class="line-clamp-3 text-sm leading-relaxed text-gray-500 dark:text-white/70"
        >
          {{ post.summary }}
        </p>

        <!-- Footer meta -->
        <footer
          class="mt-5 flex items-center gap-2 text-xs text-gray-500 dark:text-white/70"
        >
          <time class="text-gray-600 dark:text-white/70">{{
            formatDate(post.created_at)
          }}</time>
          <span
            v-if="post.category"
            class="flex items-center gap-2 text-gray-500 dark:text-white/70"
          >
            <span aria-hidden="true" class="text-border/60">·</span>
            # {{ post.category.name }}
          </span>
        </footer>
      </article>
    </router-link>
  </motion.div>
</template>

<script setup lang="ts">
import type { Post } from '@/types';
import { formatDate } from '@/utils/formatdate';
import { motion } from 'motion-v';

defineProps<{
  post: Post;
  index?: number;
}>();
</script>
