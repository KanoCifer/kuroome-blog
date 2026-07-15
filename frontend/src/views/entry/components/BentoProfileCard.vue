<template>
  <!-- Profile Card -->
  <BentoCard
    class="group relative flex items-center justify-center overflow-hidden"
  >
    <!-- 背景水波纹效果 -->
    <div
      class="from-primary/70 via-secondary to-secondary absolute inset-0 bg-linear-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    />
    <div class="relative flex flex-col items-center justify-center text-center">
      <!-- Avatar with Glow + Active Badge -->
      <div class="group relative mb-4">
        <!-- 青/蓝色渐变 -->
        <div
          class="from-primary to-secondary absolute -inset-1 rounded-full bg-linear-to-br opacity-50 blur"
        ></div>
        <img
          src="/images/about-thumb.webp"
          alt="Kuroome"
          class="relative h-32 w-32 transform transform-gpu rounded-full border-4 border-white object-cover shadow-xl transition duration-500 group-hover:scale-105"
        />
        <!-- Green Active Badge -->
        <div
          class="border-card bg-success/25 absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2"
        >
          <svg
            class="text-success h-3 w-3"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
            />
          </svg>
        </div>
        <RouterLink
          to="/about"
          class="absolute inset-0 rounded-full"
        ></RouterLink>
      </div>

      <!-- Name -->
      <h2 class="text-foreground font-family-averia mb-2 text-2xl">
        I'm <span class="text-primary text-3xl font-bold">Kuroome</span>.
      </h2>
      <p class="font-family-averia text-foreground mb-2 text-2xl">
        Welcome to my site!
      </p>

      <!-- Visitor Count -->
      <div class="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <span>{{ visitorCount.count }} 人在线</span>
      </div>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import { useVisitorCountStore } from '@/stores/visitorCount';
const visitorCount = useVisitorCountStore();
</script>
