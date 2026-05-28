<template>
  <!-- Profile Card -->
  <BentoCard class="flex items-center justify-center">
    <div class="flex flex-col items-center justify-center text-center">
      <!-- Avatar with Glow + Active Badge -->
      <div class="group relative mb-4">
        <!-- 青/蓝色渐变 -->
        <div
          class="absolute -inset-1 rounded-full bg-linear-to-br from-cyan-300 to-blue-400 opacity-50 blur"
        ></div>
        <img
          src="/images/about.webp"
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
      <h2 class="text-foreground font-family-averia white- mb-2 text-2xl">
        I'm <span class="text-primary text-3xl font-bold">Kuroome</span>.
      </h2>
      <p class="font-family-averia white- mb-2 text-2xl">Welcome to my site!</p>

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

      <!-- Bio/Bullet Points -->
      <!-- <div
            class="mt-2 w-full space-y-3 text-left text-sm text-gray-600 dark:text-gray-300"
          >
            <div class="flex items-start gap-3">
              <span
                class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"
              ></span>
              <span>国际政治专业在读学生</span>
            </div>
            <div class="flex items-start gap-3">
              <span
                class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400"
              ></span>
              <span>正在自学编程与开发</span>
            </div>
            <div class="flex items-start gap-3">
              <span
                class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400"
              ></span>
              <span>爱好编程、阅读、钓鱼等</span>
            </div>
          </div> -->
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import { useVisitorCountStore } from '@/stores/visitorCount';
const visitorCount = useVisitorCountStore();
</script>
