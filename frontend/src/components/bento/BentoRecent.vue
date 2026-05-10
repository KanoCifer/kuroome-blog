<template>
  <BentoCard class="group relative h-full overflow-hidden">
    <div
      class="from-gradient-decorative-from to-gradient-decorative-to absolute inset-0 bg-linear-to-br opacity-10 transition-opacity group-hover:opacity-20"
    ></div>
    <div class="relative z-10 flex h-full flex-col justify-between">
      <div class="bg-muted mb-4 h-32 w-full overflow-hidden rounded-xl">
        <!-- Mock Thumbnail -->
        <div
          class="from-gradient-primary-from to-gradient-primary-to h-full w-full bg-linear-to-r"
        ></div>
      </div>
      <div>
        <div class="text-primary mb-1 text-xs font-semibold">
          {{ post.date }}
        </div>
        <h3
          class="text-foreground group-hover:text-primary mb-2 text-lg leading-tight font-bold transition-colors"
        >
          {{ post.title }}
        </h3>
        <p class="text-muted-foreground line-clamp-2 text-sm">
          {{ post.excerpt }}
        </p>
      </div>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "./BentoCard.vue";

const post = {
  title: "The Future of Web Development with Vue 3",
  date: "Oct 24, 2023",
  excerpt:
    "Discover how the Composition API and new features in Vue 3 are revolutionizing the way we build modern web applications.",
};
</script>
