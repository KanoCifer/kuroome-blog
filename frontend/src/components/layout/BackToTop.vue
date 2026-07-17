<script setup lang="ts">
import { useScroll, useWindowSize } from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
const isHovered = ref(false);

// useScroll 会自动监听滚动事件并暴露 x/y 值
const { y } = useScroll(window);
// 响应式窗口高度，用于在窗口尺寸变化时重新计算 maxScroll
const { height } = useWindowSize();

// 页面滚动超过 300px 才显示按钮
const isVisible = computed(() => y.value > 300);

// 最大可滚动距离（可被动态更新）
const maxScroll = ref(
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
);

// 使用 watchEffect 在响应式的 window height 变化时重新计算 maxScroll
watchEffect(() => {
  maxScroll.value = Math.max(
    0,
    document.documentElement.scrollHeight - height.value,
  );
});

let mo: MutationObserver | null = null;
onMounted(() => {
  mo = new MutationObserver(() => {
    maxScroll.value = Math.max(
      0,
      document.documentElement.scrollHeight - height.value,
    );
  });
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
});
onBeforeUnmount(() => {
  if (mo) mo.disconnect();
});

// 计算滚动进度 (0-100)
const scrollProgress = computed(() =>
  maxScroll.value > 0 ? (y.value / maxScroll.value) * 100 : 0,
);

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};
</script>

<template>
  <transition
    enter-active-class="transition-[transform,opacity] transform-gpu duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-10 scale-75"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all transform-gpu duration-200 ease-out"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-10 scale-75"
  >
    <button
      v-show="isVisible"
      @click="scrollToTop"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
      class="fixed z-50 flex h-14 w-14 -translate-x-1/2 transform-gpu cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-lg backdrop-blur-sm transition-[transform,box-shadow,background-color,color] duration-300 hover:scale-110 hover:shadow-2xl focus:outline-none"
      :class="[
        isHovered
          ? 'bg-primary/30 dark:bg-primary/10 text-white'
          : 'bg-background/30 text-foreground dark:bg-background/10 dark:text-foreground',
        'right-0 bottom-16',
      ]"
      aria-label="回到顶部"
    >
      <!-- 背景进度环 -->
      <svg
        class="absolute inset-0 h-full w-full -rotate-90"
        viewBox="0 0 56 56"
      >
        <!-- 背景圆环 -->
        <circle
          cx="28"
          cy="28"
          r="26"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="text-muted-foreground dark:text-muted-foreground"
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
          class="transition-[stroke-dashoffset,color] duration-100"
          :class="isHovered ? 'text-white' : 'text-primary dark:text-primary'"
        />
      </svg>

      <!-- 箭头图标 -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="text-secondary-foreground dark:text-foreground h-6 w-6 transform-gpu transition-transform duration-300"
        :class="{ '-translate-y-1': isHovered }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>

      <!-- Tooltip -->
      <span
        class="bg-primary text-primary-foreground dark:bg-primary absolute right-full mr-3 rounded-lg px-3 py-1 text-sm whitespace-nowrap opacity-0 transition-opacity duration-200"
        :class="{ 'opacity-100': isHovered }"
      >
        回到顶部
        <!-- 小箭头 -->
        <span
          class="border-l-primary dark:border-l-primary absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 border-4 border-transparent"
        ></span>
      </span>
    </button>
  </transition>
</template>
