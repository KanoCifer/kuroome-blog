<template>
  <div class="relative min-h-dvh w-full" ref="parentContainer">
    <BentoNavCard
      :initial="{ scale: 0.5 }"
      :animate="{ scale: 1 }"
      :transition="{ type: 'spring', duration: 0.5 }"
      ref="navBox"
      class="absolute top-[38%] w-68 -translate-x-1/2 -translate-y-1/2"
      :style="navCardLeft"
    />
    <BentoTech
      :initial="{ scale: 0.5 }"
      :animate="{ scale: 1 }"
      :transition="{ type: 'spring', duration: 0.5 }"
      class="h-2xs absolute top-[81%] w-70 -translate-x-1/2 -translate-y-1/2 p-0!"
      :style="navCardLeft"
    />
    <BentoProfileCard
      :initial="{ scale: 0.9 }"
      :animate="{ scale: 1 }"
      :transition="{ type: 'spring', duration: 0.5 }"
      ref="boxRef"
      class="absolute top-1/2 left-1/2 w-md min-w-fit -translate-x-1/2 -translate-y-1/2"
    />
    <BentoCalendar
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      :transition="{ type: 'spring', duration: 2.5 }"
      ref="calRef"
      :style="clockCardLeft"
      class="absolute top-5/8 w-2xs -translate-x-1/2 -translate-y-1/2"
    />
    <BentoClock
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      :transition="{ type: 'spring', duration: 2 }"
      ref="clockRef"
      :style="clockCardLeft"
      class="absolute top-3/9 w-auto -translate-x-1/2 -translate-y-1/2"
    />
    <BentoGreeting
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      :transition="{ type: 'spring', duration: 1.5 }"
      class="absolute top-2/9 left-1/2 w-md min-w-fit -translate-x-1/2 -translate-y-1/2"
    />
    <BentoNewPost
      :style="newCardLeft"
      class="absolute top-40 w-auto -translate-x-1/2 -translate-y-1/2"
    />
    <BentoReadingList
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      :transition="{ type: 'spring', duration: 2.5 }"
      :style="listCardLeft"
      class="absolute top-6/8 w-auto -translate-x-1/2 -translate-y-1/2"
    />
    <BentoMemo :style="memoCardLeft" class="absolute top-[9%] -translate-x-1/2 -translate-y-1/2" />
    <BentoCat class="absolute top-10/12 left-[45%] w-2xs -translate-x-1/2 -translate-y-1/2" />
    <!-- Theme Toggle - 只在入口页面显示 -->
    <div class="absolute top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  </div>
</template>

<script setup lang="ts">
import BentoCalendar from "@/components/bento/BentoCalendar.vue";
import BentoCat from "@/components/bento/BentoCat.vue";
import BentoClock from "@/components/bento/BentoClock.vue";
import BentoGreeting from "@/components/bento/BentoGreeting.vue";
import BentoMemo from "@/components/bento/BentoMemo.vue";
import BentoNavCard from "@/components/bento/BentoNavCard.vue";
import BentoNewPost from "@/components/bento/BentoNewPost.vue";
import BentoProfileCard from "@/components/bento/BentoProfileCard.vue";
import BentoReadingList from "@/components/bento/BentoReadingList.vue";
import BentoTech from "@/components/bento/BentoTech.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import { useDebounceFn, useEventListener } from "@vueuse/core";
import { computed, onMounted, ref, type ComponentPublicInstance } from "vue";

const clockRef = ref<ComponentPublicInstance | null>(null);
const navBox = ref<ComponentPublicInstance | null>(null);
// 卡片边距
const cardMargin = ref<number>(24);
// 父容器引用
const parentContainer = ref<HTMLElement | null>(null);
// 元素宽度
const navoffsetWidth = ref<number>(0);
const clockoffsetWidth = ref<number>(0);
const parentWidth = ref<number>(0);
// 宽度的一半
const halfWidth = computed<number>(() => {
  return parentWidth.value / 2;
});

const navCardLeft = computed(() => {
  const totalLeft = halfWidth.value - navoffsetWidth.value / 2 - cardMargin.value - 224;
  return {
    left: `${totalLeft}px`,
  };
});
const memoCardLeft = computed(() => {
  const totalLeft = halfWidth.value - navoffsetWidth.value / 2 - cardMargin.value - 224;
  return {
    left: `${totalLeft + 220}px`,
  };
});

const clockCardLeft = computed(() => {
  const totalLeft = halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224;
  return {
    left: `${totalLeft + 24}px`,
  };
});
const newCardLeft = computed(() => {
  const totalLeft = halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224;
  return {
    left: `${totalLeft - 36}px`,
  };
});
const listCardLeft = computed(() => {
  const totalLeft = halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224;
  return {
    left: `${totalLeft - 240}px`,
  };
});

const updateDimensions = () => {
  // 手动重新获取并更新父容器宽度
  if (parentContainer.value) {
    parentWidth.value = parentContainer.value.clientWidth;
  }

  // 手动重新获取并更新元素宽度
  if (navBox.value) {
    navoffsetWidth.value = (navBox.value.$el || navBox.value).offsetWidth;
  }
  if (clockRef.value) {
    clockoffsetWidth.value = (clockRef.value.$el || clockRef.value).offsetWidth;
  }
};

const debouncedFn = useDebounceFn(() => {
  updateDimensions();
}, 10);

onMounted(() => {
  // 初始获取元素宽度
  updateDimensions();
  // 监听窗口尺寸变化
  useEventListener(window, "resize", debouncedFn);
});
</script>
