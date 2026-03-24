<template>
  <div>
    <!-- Title Section with Parallax -->
    <div
      class="relative -z-5 mx-0 mt-60 flex flex-col items-center justify-center bg-transparent"
      :style="titleStyle"
    >
      <div>
        <h1
          class="max-w-6xl text-center font-serif text-7xl text-gray-50 max-sm:text-3xl"
        >
          {{ title }}
        </h1>
        <!-- Info -->
        <div
          class="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400"
        >
          <span
            class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {{ subtitle }}
          </span>
        </div>
      </div>
    </div>
    <div class="relative mt-36">
      <div
        :style="sectionStyle"
        class="absolute left-1/2 -z-5 h-full -translate-x-1/2 rounded-t-[40px] bg-blue-50 dark:bg-slate-900"
      ></div>
      <div
        class="mx-auto grid max-w-6xl grid-cols-1 gap-6 pt-24 sm:grid-cols-2 lg:grid-cols-3"
      >
        <!-- Content slots -->
        <slot />
      </div>

      <div class="mt-12 text-center">
        <button
          @click="$router.back()"
          class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
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
import { useScroll } from "@vueuse/core";
import { computed, onMounted } from "vue";

const { y } = useScroll(window);

defineProps<{
  title: string;
  subtitle: string;
}>();

// 计算标题的平移效果
const titleStyle = computed(() => ({
  transform: `translateY(${y.value * 0.4}px)`,
}));

// 计算内容区的缩放效果
const sectionStyle = computed(() => {
  const scale = Math.min(1, 0.95 + y.value * 0.0005);
  return {
    width: `${100 * scale}%`,
  };
});

onMounted(() => {});
</script>
