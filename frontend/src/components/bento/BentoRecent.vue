<template>
  <BentoCard class="group relative h-full overflow-hidden">
    <div
      class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10 transition-opacity group-hover:opacity-20"
    ></div>
    <div class="relative z-10 flex h-full flex-col justify-between">
      <div class="mb-4 h-32 w-full overflow-hidden rounded-xl bg-gray-200">
        <!-- Mock Thumbnail -->
        <div
          class="h-full w-full bg-gradient-to-r from-blue-400 to-indigo-500"
        ></div>
      </div>
      <div>
        <div class="mb-1 text-xs font-semibold text-indigo-600">
          {{ post.date }}
        </div>
        <h3
          class="mb-2 text-lg leading-tight font-bold text-gray-800 transition-colors group-hover:text-indigo-700"
        >
          {{ post.title }}
        </h3>
        <p class="line-clamp-2 text-sm text-gray-600">
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
