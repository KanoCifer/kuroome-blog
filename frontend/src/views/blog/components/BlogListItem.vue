<template>
  <router-link :to="`/blog/${post._id}`" class="group mb-4 block">
    <article
      class="bg-card border-border/60 group-hover:border-primary rounded-3xl border p-4 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
    >
      <!-- 置顶徽章 -->
      <span v-if="post.is_pinned" class="text-primary mb-3 inline-block text-xs tracking-wider uppercase">
        ﹡ 置顶
      </span>

      <!-- 标题 -->
      <h2
        class="text-primary group-hover:text-primary mb-4 font-serif text-2xl leading-tight transition-colors duration-300"
      >
        {{ post.title }}
      </h2>

      <!-- Summary -->
      <p v-if="post.summary" class="text-primary mb-5 line-clamp-3 text-base leading-relaxed">
        {{ post.summary }}
      </p>

      <!-- 元数据 -->
      <footer class="text-foreground/80 flex items-center gap-3 text-xs">
        <time class="text-foreground/80">{{ formatDate(post.created_at) }}</time>
        <span v-if="post.category" class="text-foreground/80 inline-flex items-center gap-1">
          <span class="opacity-40">·</span>
          {{ post.category.name }}
        </span>
      </footer>
    </article>
  </router-link>
</template>

<script setup lang="ts">
import type { Post } from "@/types";
import { formatDate } from "@/utils/formatdate";

defineProps<{
  post: Post;
}>();
</script>
