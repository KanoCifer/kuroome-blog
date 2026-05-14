<template>
  <div>
    <div class="relative min-h-dvh w-full snap-start space-y-2" :style="containerStyle" ref="parentContainer">
      <button
        @click="openSettings"
        class="group bg-secondary hover:bg-primary absolute top-4 right-4 z-50 flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-500 ease-out"
        title="偏好设置"
      >
        <SettingIcon class="text-primary h-5 w-5 shrink-0 transition-colors duration-500 group-hover:text-white" />
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-500 ease-out group-hover:max-w-20 group-hover:opacity-100"
        >
          偏好设置
        </span>
      </button>
      <button
        @click="goToFriendLinks"
        class="group bg-secondary hover:bg-primary absolute top-16 right-4 z-50 flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-500 ease-out"
        title="友情链接"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-500 group-hover:text-white"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-500 ease-out group-hover:max-w-20 group-hover:opacity-100"
        >
          友链
        </span>
      </button>
      <BentoGreeting
        v-if="show.BentoGreeting"
        :initial="{ scale: 0 }"
        :animate="{ scale: 1 }"
        :style="[greetingPosition]"
        class="absolute w-md min-w-fit -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      />
      <BentoProfileCard
        v-if="show.BentoProfileCard"
        :initial="{ scale: 0.5, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        ref="boxRef"
        :style="[profilePosition]"
        class="absolute w-md min-w-fit -translate-x-1/2 -translate-y-1/2"
      />
      <AnimatePresence>
        <BentoNavCard
          v-if="show.BentoNavCard"
          layoutId="nav-card"
          :initial="{ scale: 0.5, opacity: 0.8 }"
          :animate="{ scale: 1, opacity: 1 }"
          :exit="{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }"
          :transition="{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }"
          class="absolute w-68 -translate-x-1/2 -translate-y-1/2"
          :style="[navCardPosition]"
        />
      </AnimatePresence>
      <BentoClock
        v-if="show.BentoClock"
        :initial="{ scale: 0 }"
        :animate="{ scale: 1 }"
        ref="clockRef"
        :style="[clockCardPosition]"
        class="absolute w-auto -translate-x-1/2 -translate-y-1/2"
      />
      <BentoCalendar
        v-if="show.BentoCalendar"
        :initial="{ scale: 0 }"
        :animate="{ scale: 1 }"
        ref="calRef"
        :style="[calendarPosition]"
        class="absolute w-auto -translate-x-1/2 -translate-y-1/2"
      />
      <BentoMemo
        v-if="show.BentoMemo"
        :style="[memoCardPosition]"
        class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      />
      <BentoNewPost
        v-if="show.BentoNewPost"
        :style="[newCardPosition]"
        class="absolute w-auto -translate-x-1/2 -translate-y-1/2"
      />
      <BentoTech
        v-if="show.BentoTech"
        :initial="{ scale: 0.5 }"
        :animate="{ scale: 1 }"
        class="h-2xs absolute w-68 -translate-x-1/2 -translate-y-1/2 p-0!"
        :style="[techPosition]"
      />
      <BentoWebsites
        v-if="show.BentoWebsites"
        :initial="{ scale: 0.5 }"
        :animate="{ scale: 1 }"
        class="absolute w-68 -translate-x-1/2 -translate-y-1/2 p-0!"
        :style="[websitesPosition]"
      />
      <BentoReadingList
        v-if="show.BentoReadingList"
        :initial="{ scale: 0 }"
        :animate="{ scale: 1 }"
        :style="[listCardPosition]"
        class="absolute w-auto -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      />
      <BentoCat v-if="show.BentoCat" :style="[catPosition]" class="absolute w-2xs -translate-x-1/2 -translate-y-1/2" />
      <div
        v-if="show.TodoCard && showTodoCard"
        class="absolute top-1/2 -right-20 w-70 min-w-3xs -translate-x-1/2 -translate-y-1/2"
      >
        <TodoCard title="MyTasks" hideable @hide="showTodoCard = false" />
      </div>
      <!-- 显示 TodoCard 的按钮，隐藏时显示 -->
      <button
        v-if="show.TodoCard && !showTodoCard"
        @click="showTodoCard = true"
        class="squircle bg-secondary ring-border/30 fixed top-1/2 right-4 z-50 -translate-y-1/2 rounded-2xl p-3 shadow-sm ring transition-all hover:scale-110"
        title="显示待办卡片"
      >
        <svg class="text-primary h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </button>
      <BentoLike
        v-if="show.BentoLike"
        :style="[likePosition]"
        class="absolute w-fit -translate-x-1/2 -translate-y-1/2"
      />
      <BentoMap
        v-if="show.BentoMap"
        :style="[mapPosition]"
        class="absolute w-fit -translate-x-1/2 -translate-y-1/2 select-none"
      />

      <!-- Settings Modal -->
      <Teleport to="body">
        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="isSettingsOpen"
            class="fixed inset-0 z-9999 flex items-center justify-center"
            @click.self="closeSettings"
          >
            <!-- Background overlay -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

            <!-- Modal content -->
            <div class="bg-card dark:bg-card relative z-10 w-11/12 max-w-sm transform-gpu rounded-3xl p-6 shadow-2xl">
              <!-- Close button -->
              <button
                @click="closeSettings"
                class="text-muted-foreground hover:bg-accent hover:text-secondary-foreground dark:hover:bg-accent dark:hover:text-foreground absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <!-- Header -->
              <h3
                class="text-foreground dark:text-foreground mb-6 flex items-center gap-2 font-serif text-xl font-bold"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  />
                </svg>
                偏好设置
              </h3>

              <!-- Theme Toggle -->
              <div class="mb-5">
                <label class="text-muted-foreground dark:text-muted-foreground mb-2 block text-sm font-medium">
                  主题与配色
                </label>
                <ThemeToggle />
              </div>

              <!-- Background Switcher -->
              <div>
                <label class="text-muted-foreground dark:text-muted-foreground mb-2 block text-sm font-medium">
                  背景图片
                </label>
                <BackgroundSwitcher />
              </div>
            </div>
          </div>
        </transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BentoCalendar,
  BentoCat,
  BentoClock,
  BentoGreeting,
  BentoLike,
  BentoMap,
  BentoMemo,
  BentoNavCard,
  BentoNewPost,
  BentoProfileCard,
  BentoReadingList,
  BentoTech,
  BentoWebsites,
  TodoCard,
} from "@/components/bento";
import BackgroundSwitcher from "@/components/layout/BackgroundSwitcher.vue";
import ThemeToggle from "@/components/layout/ThemeToggle.vue";
import carddelay from "@/data/carddelay.json";
import { useDebounceFn, useStorage } from "@vueuse/core";
import { AnimatePresence } from "motion-v";
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type ComponentPublicInstance } from "vue";
import { useRouter } from "vue-router";
import SettingIcon from "./icon/SettingIcon.vue";

const router = useRouter();

const goToFriendLinks = () => {
  closeSettings();
  router.push({ name: "friend-links" });
};

// const { x: mouseX, y: mouseY } = useMouse({
//   touch: false,
// });
// const moveStyle = computed(() => {
//   // const centerX = mouseX.value - window.innerWidth / 2;
//   // const centerY = mouseY.value - window.innerHeight / 2;
//   // const dist = Math.sqrt(centerX * centerX + centerY * centerY);
//   // const maxDist = Math.sqrt((window.innerWidth / 2) ** 2 + (window.innerHeight / 2) ** 2);
//   // const ratio = dist / maxDist;
//   // return {
//   //   filter: `drop-shadow(0 ${ratio * 8}px ${ratio * 4}px rgba(0,0,0,0.2)) brightness(${1 + ratio * 0.15})`,
//   // };
// });
// const moveStyleFast = computed(() => {
//   // const centerX = mouseX.value - window.innerWidth / 2;
//   // const centerY = mouseY.value - window.innerHeight / 2;
//   // const dist = Math.sqrt(centerX * centerX + centerY * centerY);
//   // const maxDist = Math.sqrt((window.innerWidth / 2) ** 2 + (window.innerHeight / 2) ** 2);
//   // const ratio = dist / maxDist;
//   // return {
//   //   filter: `drop-shadow(0 ${ratio * 12}px ${ratio * 4}px rgba(0,0,0,0.2)) brightness(${1 + ratio * 0.2})`,
//   // };
// });

const clockRef = ref<ComponentPublicInstance | null>(null);
// 卡片边距
const cardMargin = ref<number>(24);
// 父容器引用
const parentContainer = ref<HTMLElement | null>(null);
// 元素宽度
const navoffsetWidth = ref<number>(272); // BentoNavCard has fixed width w-68 = 272px
const clockoffsetWidth = ref<number>(0);
const parentWidth = ref<number>(0);
// 视口高度（布局基准），用 window.innerHeight 而非容器高度
// 这样在小屏时容器会撑高，卡片不会被压缩重叠
const viewportHeight = ref<number>(0);

// TodoCard 显示状态，持久化到 localStorage
const showTodoCard = useStorage<boolean>("readinglist_show_todo_card", true);

// 布局设计基准高度：使用视口高度，但不低于 820px，保证卡片间距不被压缩
const layoutHeight = computed<number>(() => Math.max(viewportHeight.value, 820));

// 容器高度：至少撑满布局高度（让绝对定位的卡片不被裁剪）
const containerStyle = computed(() => ({
  minHeight: `${layoutHeight.value}px`,
}));

// 宽度的一半
const halfWidth = computed<number>(() => {
  return parentWidth.value / 2;
});

// 左侧卡片公共偏移量（导航、备忘录、技术栈用，从屏幕中线向左偏移）
const leftTotal = computed<number>(() => halfWidth.value - navoffsetWidth.value / 2 - cardMargin.value - 224);

// 右侧卡片公共偏移量（时钟、日历、网站、阅读列表用，从屏幕中线向右偏移）
const rightTotal = computed<number>(() => halfWidth.value + clockoffsetWidth.value / 2 + cardMargin.value + 224);

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
  return {
    left: `${leftTotal.value}px`,
    top: `${layoutHeight.value * 0.38}px`,
  };
});

// 对应 BentoMemo (top-[9%])
const memoCardPosition = computed(() => {
  return {
    left: `${leftTotal.value + 220}px`,
    top: `${layoutHeight.value * 0.09}px`,
  };
});

// 对应 BentoClock (top-3/9)
const clockCardPosition = computed(() => {
  return {
    left: `${rightTotal.value + 24}px`,
    top: `${(layoutHeight.value * 3) / 7.5}px`,
  };
});

// 对应 BentoCalendar (top-5/8)
const calendarPosition = computed(() => {
  return {
    left: `${rightTotal.value + 24}px`,
    top: `${layoutHeight.value * 0.625 + 48}px`,
  };
});

// 对应 BentoNewPost (top-40 即 160px，固定值)
const newCardPosition = computed(() => {
  return {
    left: `${rightTotal.value - 180}px`,
    top: `${layoutHeight.value / 11}px`,
  };
});

// 对应 BentoTech (top-[81%])
const techPosition = computed(() => {
  return {
    left: `${leftTotal.value}px`,
    top: `${layoutHeight.value * 0.85}px`,
  };
});

// 对应 BentoWebsites
const websitesPosition = computed(() => {
  return {
    left: `${rightTotal.value + 24}px`,
    top: `${layoutHeight.value * 0.2}px`,
  };
});

// 对应 BentoReadingList (top-6/8)
const listCardPosition = computed(() => {
  return {
    left: `${rightTotal.value - 240}px`,
    top: `${(layoutHeight.value * 6) / 8}px`,
  };
});

// BentoLike
const likePosition = computed(() => {
  return {
    left: `${rightTotal.value - 80}px`,
    top: `${layoutHeight.value * -0.12}px`,
  };
});

// 对应 BentoCalendar (top-5/8)
// 对应 BentoCat (top-10/12 left-[45%])
const catPosition = computed(() => {
  return {
    left: `${parentWidth.value * 0.43}px`,
    top: `${(layoutHeight.value * 10) / 12}px`,
  };
});

// 对应 BentoMap (top-11/12)
const mapPosition = computed(() => {
  return {
    left: `${parentWidth.value / 2 + 120}px`,
    top: `${layoutHeight.value * 0.89}px`,
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
  if (clockRef.value) {
    clockoffsetWidth.value = (clockRef.value.$el || clockRef.value).offsetWidth;
  }
};

const debouncedFn = useDebounceFn(() => {
  updateDimensions();
}, 100);

let clockResizeObserver: ResizeObserver | null = null;

// Update dimensions when clock component is mounted and available
watch(clockRef, (newVal) => {
  if (newVal) {
    nextTick(() => {
      updateDimensions();
      // Observe clock width changes (e.g. longer weekday names)
      const clockEl = (newVal.$el || newVal) as HTMLElement;
      if (clockResizeObserver) {
        clockResizeObserver.disconnect();
      }
      clockResizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      clockResizeObserver.observe(clockEl);
    });
  }
});

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

// 为每个卡片维护独立的显示状态
const isSettingsOpen = ref(false);
const openSettings = () => {
  isSettingsOpen.value = true;
};
const closeSettings = () => {
  isSettingsOpen.value = false;
};

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
  BentoMap: false,
});

const ANIMATION_DELAY = 0.1; // 基础延迟时间（秒）

// 卡片名称列表（与 carddelay.json 保持一致）
const cardNames = [
  "BentoProfileCard",
  "BentoNavCard",
  "BentoGreeting",
  "BentoNewPost",
  "BentoMemo",
  "BentoClock",
  "BentoCalendar",
  "BentoReadingList",
  "BentoCat",
  "BentoLike",
  "TodoCard",
  "BentoTech",
  "BentoWebsites",
  "BentoMap",
] as const;

onMounted(async () => {
  await nextTick(); // 确保 DOM 已更新，能正确获取元素尺寸
  // 根据每个卡片的 order 计算延迟时间，触发显示
  cardNames.forEach((cardName) => {
    const order = carddelay?.[cardName]?.order || 0;
    const delay = order * ANIMATION_DELAY * 1000;
    setTimeout(() => {
      show.value[cardName] = true;
    }, delay);
  });

  // Update dimensions after all cards have been rendered
  const maxOrder = Math.max(...Object.values(carddelay).map((item) => item.order));
  setTimeout(
    () => {
      updateDimensions();
    },
    maxOrder * ANIMATION_DELAY * 1000,
  );
});

window.scrollTo(0, 0); // 入口页加载时滚动到顶部

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (clockResizeObserver) {
    clockResizeObserver.disconnect();
    clockResizeObserver = null;
  }
  window.removeEventListener("resize", debouncedFn);
});
</script>
