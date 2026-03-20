<template>
  <div
    class="relative min-h-dvh w-full snap-start space-y-2 max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:gap-4 max-sm:overflow-x-hidden max-sm:p-4 max-sm:pt-14"
    :style="containerStyle"
    ref="parentContainer"
  >
    <!-- Theme Toggle - 只在入口页面显示 -->
    <div
      class="squircle absolute top-4 right-4 z-50 rounded-2xl bg-amber-50 shadow-sm ring ring-amber-50/70 dark:bg-amber-900/80 dark:ring-amber-600"
    >
      <ThemeToggle />
    </div>
    <BentoGreeting
      v-if="show.BentoGreeting"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      :style="greetingPosition"
      class="absolute w-md min-w-fit -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:w-full! max-sm:min-w-0 max-sm:translate-0!"
    />
    <BentoProfileCard
      v-if="show.BentoProfileCard"
      :initial="{ scale: 0.5, opacity: 0 }"
      :animate="{ scale: 1, opacity: 1 }"
      ref="boxRef"
      :style="profilePosition"
      class="absolute w-md min-w-fit -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:w-full! max-sm:min-w-0 max-sm:translate-0!"
    />
    <BentoNavCard
      v-if="show.BentoNavCard"
      :initial="{ scale: 0.5, opacity: 0 }"
      :animate="{ scale: 1, opacity: 1 }"
      ref="navBox"
      class="absolute w-68 -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:left-auto! max-sm:w-full! max-sm:translate-0!"
      :style="navCardPosition"
    />
    <BentoClock
      v-if="show.BentoClock"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      ref="clockRef"
      :style="clockCardPosition"
      class="absolute w-auto -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:left-auto! max-sm:w-full! max-sm:translate-0!"
    />
    <BentoCalendar
      v-if="show.BentoCalendar"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      ref="calRef"
      :style="calendarPosition"
      class="absolute w-2xs -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:left-auto! max-sm:w-full! max-sm:translate-0!"
    />
    <BentoMemo
      v-if="show.BentoMemo"
      :style="memoCardPosition"
      class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer max-sm:static! max-sm:left-auto! max-sm:w-full! max-sm:translate-0!"
    />
    <BentoNewPost
      v-if="show.BentoNewPost"
      :style="newCardPosition"
      class="absolute w-auto -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:left-auto! max-sm:w-full! max-sm:translate-0!"
    />
    <BentoTech
      v-if="show.BentoTech"
      :initial="{ scale: 0.5 }"
      :animate="{ scale: 1 }"
      class="h-2xs absolute w-70 -translate-x-1/2 -translate-y-1/2 p-0! max-sm:static! max-sm:left-auto! max-sm:h-auto! max-sm:w-full! max-sm:translate-0!"
      :style="techPosition"
    />
    <BentoWebsites
      v-if="show.BentoWebsites"
      :initial="{ scale: 0.5 }"
      :animate="{ scale: 1 }"
      class="absolute w-68 -translate-x-1/2 -translate-y-1/2 p-0! max-sm:static! max-sm:left-auto! max-sm:w-full! max-sm:translate-0!"
      :style="websitesPosition"
    />
    <BentoReadingList
      v-if="show.BentoReadingList"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      :style="listCardPosition"
      class="absolute w-auto -translate-x-1/2 -translate-y-1/2 cursor-pointer max-sm:static! max-sm:left-auto! max-sm:w-full! max-sm:translate-0!"
    />
    <BentoCat
      v-if="show.BentoCat"
      :style="catPosition"
      class="absolute w-2xs -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:left-auto! max-sm:w-full! max-sm:translate-0!"
    />
    <div
      v-if="show.TodoCard"
      class="absolute top-40 right-5 w-70 min-w-3xs -translate-x-1/2 -translate-y-1/2 max-sm:static!"
    >
      <TodoCard title="MyTasks" />
    </div>
    <BentoLike
      v-if="show.BentoLike"
      :style="likePosition"
      class="absolute w-fit -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:left-auto!"
    />
  </div>
</template>

<script setup lang="ts">
import {
  BentoCalendar,
  BentoCat,
  BentoClock,
  BentoGreeting,
  BentoLike,
  BentoMemo,
  BentoNavCard,
  BentoNewPost,
  BentoProfileCard,
  BentoReadingList,
  BentoTech,
  BentoWebsites,
  TodoCard,
} from "@/components/bento";
import ThemeToggle from "@/components/layout/ThemeToggle.vue";
import carddelay from "@/data/carddelay.json";
import { useDebounceFn, useMediaQuery } from "@vueuse/core";
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  type ComponentPublicInstance,
} from "vue";

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
// 视口高度（布局基准），用 window.innerHeight 而非容器高度
// 这样在小屏时容器会撑高，卡片不会被压缩重叠
const viewportHeight = ref<number>(0);

// 布局设计基准高度：使用视口高度，但不低于 820px，保证卡片间距不被压缩
const layoutHeight = computed<number>(() =>
  Math.max(viewportHeight.value, 820),
);

// 容器高度：至少撑满布局高度（让绝对定位的卡片不被裁剪）
const containerStyle = computed(() => ({
  minHeight: `${layoutHeight.value}px`,
}));

// 宽度的一半
const halfWidth = computed<number>(() => {
  return parentWidth.value / 2;
});

// 计算所有卡片的动态位置，包含 left 和 top，以 layoutHeight 为基准
// layoutHeight = max(视口高度, 820px)，保证小屏时卡片不重叠

// 对应 BentoGreeting (top-2/9 left-1/2)
const greetingPosition = computed(() => ({
  top: `${(layoutHeight.value * 2) / 9}px`,
  left: `${parentWidth.value / 2}px`,
}));

// 对应 BentoProfileCard (top-1/2 left-1/2)
const profilePosition = computed(() => ({
  top: `${layoutHeight.value / 2}px`,
  left: `${parentWidth.value / 2}px`,
}));

// 对应 BentoNavCard (top-[38%])
const navCardPosition = computed(() => {
  const totalLeft =
    halfWidth.value - navoffsetWidth.value / 2 - cardMargin.value - 224;
  return {
    left: `${totalLeft}px`,
    top: `${layoutHeight.value * 0.38}px`,
  };
});

// 对应 BentoMemo (top-[9%])
const memoCardPosition = computed(() => {
  const totalLeft =
    halfWidth.value - navoffsetWidth.value / 2 - cardMargin.value - 224;
  return {
    left: `${totalLeft + 220}px`,
    top: `${layoutHeight.value * 0.09}px`,
  };
});

// 对应 BentoClock (top-3/9)
const clockCardPosition = computed(() => {
  const totalLeft =
    halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224;
  return {
    left: `${totalLeft + 24}px`,
    top: `${(layoutHeight.value * 3) / 7.5}px`,
  };
});

// 对应 BentoCalendar (top-5/8)
const calendarPosition = computed(() => {
  const totalLeft =
    halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224;
  return {
    left: `${totalLeft + 24}px`,
    top: `${(layoutHeight.value * 4) / 6}px`,
  };
});

// 对应 BentoNewPost (top-40 即 160px，固定值)
const newCardPosition = computed(() => {
  const totalLeft =
    halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224;
  return {
    left: `${totalLeft - 36}px`,
    top: `160px`,
  };
});

// 对应 BentoTech (top-[81%])
const techPosition = computed(() => {
  const totalLeft =
    halfWidth.value - navoffsetWidth.value / 2 - cardMargin.value - 224;
  return {
    left: `${totalLeft}px`,
    top: `${layoutHeight.value * 0.81}px`,
  };
});

// 对应 BentoWebsites
const websitesPosition = computed(() => {
  const totalLeft =
    halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224;
  return {
    left: `${totalLeft + 24}px`,
    top: `${layoutHeight.value * 0.2}px`,
  };
});

// 对应 BentoReadingList (top-6/8)
const listCardPosition = computed(() => {
  const totalLeft =
    halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224;
  return {
    left: `${totalLeft - 240}px`,
    top: `${(layoutHeight.value * 6) / 8}px`,
  };
});

// 对应 BentoCat (top-10/12 left-[45%])
const catPosition = computed(() => {
  return {
    left: `${parentWidth.value * 0.45}px`,
    top: `${(layoutHeight.value * 10) / 12}px`,
  };
});

// BentoLike
const likePosition = computed(() => {
  return {
    left: `${parentWidth.value * 0.55}px`,
    top: `${(layoutHeight.value * 10) / 15}px`,
  };
});

const updateDimensions = () => {
  // 视口高度作为布局基准
  viewportHeight.value = window.innerHeight;

  // 更新父容器宽度
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

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  // 初始获取尺寸
  updateDimensions();
  // ResizeObserver 监听容器宽度变化（左右布局响应式）
  if (parentContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      debouncedFn();
    });
    resizeObserver.observe(parentContainer.value);
  }
  // window resize 监听视口高度变化
  window.addEventListener("resize", debouncedFn);
});

// 响应式判断：是否为移动端（max-width: 640px）
const isMobile = useMediaQuery("(max-width: 640px)");

// 为每个卡片维护独立的显示状态
const show = ref<Record<string, boolean>>({
  BentoGreeting: false,
  BentoProfileCard: false,
  BentoNavCard: false,
  BentoClock: false,
  BentoCalendar: false,
  BentoMemo: false,
  BentoNewPost: false,
  BentoTech: false,
  BentoWebsites: false,
  BentoReadingList: false,
  BentoCat: false,
  BentoLike: false,
  TodoCard: false,
});

const ANIMATION_DELAY = 0.1; // 基础延迟时间（秒）

// 卡片名称列表（与 carddelay.json 保持一致）
const cardNames = [
  "BentoProfileCard",
  "BentoNavCard",
  "BentoGreeting",
  "BentoMemo",
  "BentoClock",
  "BentoCalendar",
  "BentoReadingList",
  "BentoCat",
  "BentoLike",
  "TodoCard",
  "BentoTech",
  "BentoWebsites",
] as const;

onMounted(async () => {
  await nextTick(); // 确保 DOM 已更新，能正确获取元素尺寸
  // 移动端直接显示所有卡片，跳过延迟
  if (isMobile.value) {
    Object.keys(show.value).forEach((key) => {
      show.value[key] = true;
    });
    return;
  }
  // 根据每个卡片的 order 计算延迟时间，触发显示
  cardNames.forEach((cardName) => {
    const order = carddelay?.[cardName]?.order || 0;
    const delay = order * ANIMATION_DELAY * 1000;
    setTimeout(() => {
      show.value[cardName] = true;
    }, delay);
  });
});

window.scrollTo(0, 0); // 入口页加载时滚动到顶部

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener("resize", debouncedFn);
});
</script>
