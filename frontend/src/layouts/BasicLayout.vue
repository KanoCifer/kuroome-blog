<script setup lang="ts">
import { BasicFooter, MobileNav } from "@/components/basic";
import BasicNav from "@/components/nav/BasicNav.vue";
import BackToTop from "@/components/layout/BackToTop.vue";
import ToastContainer from "@/components/layout/ToastContainer.vue";
import { useScroll, useStorage, useDebounceFn } from "@vueuse/core";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useHead } from "@vueuse/head";
import { RouterView, useRoute } from "vue-router";
import MobileHeader from "@/components/basic/MobileHeader.vue";
import { useDeviceStore } from "@/stores/device";
// 背景图列表
const backgroundImages = [
  "/background/bg-1.webp",
  "/background/bg-2.webp",
  "/background/bg-3.webp",
  "/background/bg-4.webp",
  "/background/bg-5.webp",
  "/background/bg-6.webp",
  "/background/bg-7.webp",
  "/background/bg-8.webp",
  "/background/bg-9.webp",
  "/background/bg-10.webp",
];

// 使用 localStorage 持久化当前背景图索引
const currentBgIndex = useStorage<number>("readinglist_bg_index", 0);

// 动态背景图 URL
const backgroundUrl = computed(
  () => backgroundImages[currentBgIndex.value] || backgroundImages[0],
);
const route = useRoute();
const isEntryView = ref<boolean>(false);
const isAboutView = ref<boolean>(false);
const showBasicNav = ref<boolean>(route.path !== "/");

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    isEntryView.value = newPath === "/";
    isAboutView.value = newPath === "/about";

    if (newPath === "/") {
      showBasicNav.value = false;
      return;
    }

    showBasicNav.value = true;
  },
  { immediate: true },
);
// 导航栏滚动隐藏逻辑
const isHeaderVisible = ref(true);
const lastScrollY = ref(0);
const headerThreshold = 250;
const { y } = useScroll(window);

const handleScroll = () => {
  const currentScrollY = y.value;
  // 向下滚动超过阈值，隐藏导航
  if (currentScrollY > lastScrollY.value && currentScrollY > headerThreshold) {
    isHeaderVisible.value = false;
  }
  // 向上滚动，显示导航
  else if (currentScrollY < lastScrollY.value) {
    isHeaderVisible.value = true;
  }

  lastScrollY.value = currentScrollY;
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  lastScrollY.value = y.value;
});

// 自动回顶逻辑（仅在桌面端首页生效）
const isAutoScrolling = ref(false);
let returnTopTimer: number | null = null;
const scheduleReturnTop = () => {
  // 仅在首页且非移动设备时启用
  if (!isEntryView.value || isMobileDevice) return;
  if (isAutoScrolling.value) return;
  if (returnTopTimer) {
    clearTimeout(returnTopTimer);
  }
  // 在滚动停止后 500ms 执行回顶
  returnTopTimer = window.setTimeout(() => {
    isAutoScrolling.value = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
    // 1000ms 后解除自动滚动锁，允许后续用户操作
    setTimeout(() => {
      isAutoScrolling.value = false;
    }, 1000);
  }, 500);
};

onMounted(() => {
  // 监听鼠标滚轮，结束后触发回顶（移动端被 isMobileDevice 拦截）
  window.addEventListener("wheel", scheduleReturnTop, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("wheel", scheduleReturnTop);
  if (returnTopTimer) {
    clearTimeout(returnTopTimer);
    returnTopTimer = null;
  }
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});

const isMobileDevice = useDeviceStore().isMobile;

// 切换背景（带防抖）
const switchBackground = () => {
  currentBgIndex.value = (currentBgIndex.value + 1) % backgroundImages.length;
};

const debouncedSwitchBackground = useDebounceFn(switchBackground, 400);

onUnmounted(() => {
  // 如果防抖函数支持 cancel，则在卸载时取消
  const maybe = debouncedSwitchBackground as unknown as { cancel?: () => void };
  maybe.cancel?.();
});

// 使用 useHead 在 head 中预加载当前与下一张背景图（移动端禁用）
const headPreload = computed(() => {
  if (isMobileDevice) return { link: [] };
  const links: Array<Record<string, string>> = [];
  const len = backgroundImages.length;
  if (len === 0) return { link: [] };
  const cur = backgroundImages[currentBgIndex.value] || backgroundImages[0];
  links.push({ rel: "preload", as: "image", href: cur });
  if (len > 1) {
    const next = backgroundImages[(currentBgIndex.value + 1) % len];
    links.push({ rel: "preload", as: "image", href: next });
  }
  return { link: links };
});
useHead(headPreload);

// 自动轮播背景图（仅桌面端）
const BACKGROUND_ROTATE_INTERVAL = 60000; // 毫秒，60s
let bgRotateTimer: number | null = null;

const stopBackgroundRotation = () => {
  if (bgRotateTimer) {
    clearInterval(bgRotateTimer);
    bgRotateTimer = null;
  }
};

const startBackgroundRotation = () => {
  // 如果是移动设备或只有一张图则不启动
  if (isMobileDevice || backgroundImages.length <= 1) return;
  stopBackgroundRotation();
  bgRotateTimer = window.setInterval(() => {
    currentBgIndex.value = (currentBgIndex.value + 1) % backgroundImages.length;
  }, BACKGROUND_ROTATE_INTERVAL);
};

onMounted(() => {
  startBackgroundRotation();
});

// 设备类型变化时启动或停止轮播
watch(
  () => useDeviceStore().isMobile,
  (mobile) => {
    if (mobile) stopBackgroundRotation();
    else startBackgroundRotation();
  },
);

onUnmounted(() => {
  stopBackgroundRotation();
});
</script>

<template>
  <div class="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto]">
    <!-- 背景图 -->
    <div
      class="pointer-events-none fixed inset-0 -z-10 transform-gpu bg-cover bg-fixed blur-md transition-all duration-800"
      :style="{ backgroundImage: `url('${backgroundUrl}')` }"
    ></div>
    <MobileHeader
      v-if="isMobileDevice"
      @switchBackground="debouncedSwitchBackground"
    />
    <MobileNav v-if="isMobileDevice" />
    <header>
      <div class="mx-auto mt-6">
        <Teleport to="body">
          <ToastContainer />
        </Teleport>
        <BasicNav
          :isEntryView="isEntryView"
          :isVisible="showBasicNav"
          v-if="!isMobileDevice"
        />
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative scroll-smooth">
      <RouterView v-slot="{ Component }">
        <transition
          mode="out-in"
          enter-active-class="transition-all transform-gpu duration-300 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition-all transform-gpu duration-300 ease-out"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <component :is="Component" :key="$route.path" />
        </transition>
        <!-- 路由出口 -->
      </RouterView>
    </main>

    <!-- Footer -->
    <BasicFooter :isEntryView="isEntryView" :isAboutView="isAboutView" />

    <!-- Back to Top Button -->
    <BackToTop />

    <!-- 移动端适配警告弹窗 -->
  </div>
</template>
