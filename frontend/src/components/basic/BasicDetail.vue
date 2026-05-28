<template>
  <div>
    <!-- Title Section with Parallax -->
    <div
      class="relative -z-5 mx-0 mt-[40vh] flex flex-col items-center justify-center bg-transparent"
      :style="titleStyle"
    >
      <div>
        <h1 class="text-background max-w-6xl text-center font-serif text-7xl">
          {{ title }}
        </h1>
        <!-- Info -->
        <div
          class="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-4 text-sm"
        >
          <span
            class="bg-muted text-secondary-foreground dark:bg-muted dark:text-muted-foreground inline-block rounded-full px-3 py-1 text-xs font-medium"
          >
            {{ subtitle }}
          </span>
        </div>
      </div>
    </div>
    <div class="relative mt-[40vh] w-full">
      <!-- Scroll Indicator -->
      <div
        class="absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer text-white"
      >
        <a href="#main-content">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="text-background/60 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </a>
      </div>
      <div
        :style="sectionStyle"
        class="bg-background/95 absolute left-1/2 -z-5 h-full -translate-x-1/2 rounded-t-[40px] backdrop-blur-xs"
      ></div>
      <div class="mx-auto max-w-6xl">
        <div
          id="main-content"
          ref="gridRef"
          :class="[
            'staggered-grid mx-8 grid grid-cols-1 gap-6 pt-24 sm:grid-cols-2 lg:grid-cols-3',
          ]"
        >
          <!-- Content slots -->
          <slot />
        </div>
      </div>

      <div class="mt-12 text-center">
        <button
          @click="onBack === undefined ? $router.back() : onBack()"
          class="bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 mb-12 inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 font-medium transition-all duration-300 hover:shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          返回上一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, useScroll } from '@vueuse/core';
import { computed } from 'vue';

const { y } = useScroll(window);
const isSmallScreen = useMediaQuery('(max-width: 768px)');

defineProps<{
  title: string;
  subtitle: string;
  onBack?: () => void;
}>();

const titleStyle = computed(() => ({
  transform: `translateY(${y.value * 0.6}px)`,
}));

const sectionStyle = computed(() => {
  if (isSmallScreen.value) {
    return { width: '100%' };
  }
  const scale = Math.min(1, 0.85 + y.value * 0.0005);
  return {
    transform: `scaleX(${scale})`,
    transformOrigin: 'top center',
    width: '100%',
  };
});

// const gridRef = ref<HTMLElement | null>(null);
// const isVisible = ref(false);

// const onIntersectionObserver = (entries: IntersectionObserverEntry[]) => {
//   const entry = entries[0];
//   if (entry.isIntersecting) {
//     isVisible.value = true;
//     stop(); // 只触发一次，停止观察
//   }
// };

// const { stop } = useIntersectionObserver(gridRef, onIntersectionObserver, {
//   threshold: 0, // 当内容至少有10%进入视口时触发
// });
</script>
