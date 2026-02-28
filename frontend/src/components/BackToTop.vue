<script setup lang="ts">
import { useScroll } from "@vueuse/core";
import { computed, ref } from "vue";

const isHovered = ref(false);

// useScroll 会自动监听滚动事件并暴露 x/y 值
const { y } = useScroll(window);

// 页面滚动超过 300px 才显示按钮
const isVisible = computed(() => y.value > 300);

// 计算滚动进度 (0-100)
const scrollProgress = computed(() => {
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  return docHeight > 0 ? (y.value / docHeight) * 100 : 0;
});

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};
</script>

<template>
  <transition
    enter-active-class="transition-all transform-gpu duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-10 scale-75"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all transform-gpu duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-10 scale-75"
  >
    <button
      v-show="isVisible"
      @click="scrollToTop"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
      class="animate-bounce-up fixed bottom-16 left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 transform-gpu cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-2xl focus:outline-none"
      :class="[
        isHovered
          ? 'bg-blue-600/30 text-white dark:bg-blue-500/10'
          : 'bg-gray-50/30 text-gray-700 dark:bg-gray-800/10 dark:text-gray-200',
      ]"
      aria-label="回到顶部"
    >
      <!-- 背景进度环 -->
      <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 56 56">
        <!-- 背景圆环 -->
        <circle
          cx="28"
          cy="28"
          r="26"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="text-gray-200 dark:text-gray-700"
          opacity="0.3"
        />
        <!-- 进度圆环 -->
        <circle
          cx="28"
          cy="28"
          r="26"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          :stroke-dasharray="163.36"
          :stroke-dashoffset="163.36 - (scrollProgress / 100) * 163.36"
          class="transition-all duration-100"
          :class="isHovered ? 'text-white' : 'text-blue-600 dark:text-blue-400'"
        />
      </svg>

      <!-- 箭头图标 -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 transform-gpu text-gray-600 transition-transform duration-300 dark:text-gray-300"
        :class="{ '-translate-y-1': isHovered }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>

      <!-- Tooltip -->
      <span
        class="absolute right-full mr-3 rounded-lg bg-gray-900 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 dark:bg-gray-700"
        :class="{ 'opacity-100': isHovered }"
      >
        回到顶部
        <!-- 小箭头 -->
        <span
          class="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-gray-700"
        ></span>
      </span>
    </button>
  </transition>
</template>
