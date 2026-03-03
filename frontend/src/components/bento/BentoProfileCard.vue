<template>
  <!-- Profile Card -->
  <BentoCard>
    <div class="flex flex-col items-center text-center">
      <!-- Avatar with Glow -->
      <div class="group relative mb-4">
        <!-- 青/蓝色渐变 -->
        <div
          class="absolute -inset-1 rounded-full bg-linear-to-br from-cyan-300 to-blue-400 opacity-50 blur"
        ></div>
        <img
          src="/images/about.webp"
          alt="Kuroome"
          class="relative h-32 w-32 transform transform-gpu rounded-full border-4 border-white object-cover shadow-xl transition duration-500 group-hover:scale-105 dark:border-gray-700"
        />
        <RouterLink to="/about" class="absolute inset-0 rounded-full"></RouterLink>
      </div>

      <!-- Name -->
      <h2 class="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-100">Kuroome</h2>

      <!-- Role/Title Badge -->
      <div class="mb-4">
        <span
          class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          Developer
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
import BentoCard from "./BentoCard.vue";
</script>

<style scoped></style>
