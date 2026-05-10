<template>
  <div>
    <!-- Title Section with Parallax -->
    <div
      class="relative -z-5 mx-0 mt-60 flex flex-col items-center justify-center bg-transparent"
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
            class="bg-muted text-secondary-foreground dark:bg-muted dark:text-muted-foreground inline-block rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {{ subtitle }}
          </span>
        </div>
      </div>
    </div>
    <div class="relative mt-36 w-full">
      <div
        :style="sectionStyle"
        class="bg-background absolute left-1/2 -z-5 h-full -translate-x-1/2 rounded-t-[40px] dark:bg-slate-900"
      ></div>
      <div class="mx-auto max-w-6xl">
        <div
          class="mx-8 grid grid-cols-1 gap-6 pt-24 sm:grid-cols-2 lg:grid-cols-3"
        >
          <!-- Content slots -->
          <slot />
        </div>
      </div>

      <div class="mt-12 text-center">
        <button
          @click="$router.back()"
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
import { useMediaQuery, useScroll } from "@vueuse/core";
import { computed, onMounted } from "vue";
const { y } = useScroll(window);

defineProps<{
  title: string;
  subtitle: string;
}>();

// 计算标题的平移效果
const titleStyle = computed(() => ({
  transform: `translateY(${y.value * 0.6}px)`,
}));

// 计算内容区的缩放效果
const sectionStyle = computed(() => {
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  if (isSmallScreen.value) {
    return {
      width: "100%",
    };
  }
  const scale = Math.min(1, 0.95 + y.value * 0.0005);
  return {
    width: `${100 * scale}%`,
  };
});

onMounted(() => {});
</script>
