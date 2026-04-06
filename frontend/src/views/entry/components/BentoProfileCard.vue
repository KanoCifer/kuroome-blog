<template>
  <!-- Profile Card -->
  <BentoCard>
    <div class="flex flex-col items-center text-center">
      <!-- Avatar with Glow + Active Badge -->
      <div class="group relative mb-4">
        <!-- 青/蓝色渐变 -->
        <div class="absolute -inset-1 rounded-full bg-linear-to-br from-cyan-300 to-blue-400 opacity-50 blur"></div>
        <img
          src="/images/about.webp"
          alt="Kuroome"
          class="relative h-32 w-32 transform transform-gpu rounded-full border-4 border-white object-cover shadow-xl transition duration-500 group-hover:scale-105 dark:border-gray-700"
        />
        <!-- Green Active Badge -->
        <div
          class="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-100 dark:border-gray-700 dark:bg-green-900"
        >
          <svg class="h-3 w-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </div>
        <RouterLink to="/about" class="absolute inset-0 rounded-full"></RouterLink>
      </div>

      <!-- Name -->
      <h2 class="mb-2 font-serif text-2xl font-bold text-gray-800 dark:text-gray-100">Kuroome</h2>

      <!-- Role/Title Badge -->
      <div class="mb-4">
        <span
          class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          Developer
        </span>
      </div>

      <!-- Admin Status Badge -->
      <div class="mt-2 flex items-center gap-2">
        <span
          class="h-2 w-2 rounded-full"
          :class="auth.adminOnline ? 'animate-pulse bg-green-500' : 'bg-red-500'"
        ></span>
        <span
          class="text-xs font-semibold tracking-widest uppercase"
          :class="auth.adminOnline ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'"
        >
          {{ auth.adminOnline ? "Admin Online" : "Offline" }}
        </span>
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
import BentoCard from "@/components/bento/BentoCard.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
</script>
