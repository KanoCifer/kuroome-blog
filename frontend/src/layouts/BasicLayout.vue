<script setup lang="ts">
import { BasicFooter } from "@/components/basic";
import BackToTop from "@/components/layout/BackToTop.vue";
import CookieConsent from "@/components/layout/CookieConsent.vue";
import ToastContainer from "@/components/layout/ToastContainer.vue";
import BasicNav from "@/components/nav/BasicNav.vue";
import { useBackgroundStore } from "@/stores/background";
import { useThemeStore } from "@/stores/theme";
import { useScroll } from "@vueuse/core";
import { useHead } from "@vueuse/head";
import { AnimatePresence } from "motion-v";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterView, useRoute } from "vue-router";

const bgStore = useBackgroundStore();
const themeStore = useThemeStore();
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
    bgStore.reroll();

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

// 自动回顶
const isAutoScrolling = ref(false);
let returnTopTimer: number | null = null;
const scheduleReturnTop = () => {
  // 仅在首页时启用
  if (!isEntryView.value) return;
  if (isAutoScrolling.value) return;
  if (returnTopTimer) {
    clearTimeout(returnTopTimer);
  }
  // 在滚动停止后 2000ms 执行回顶
  returnTopTimer = window.setTimeout(() => {
    isAutoScrolling.value = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
    // 3000ms 后解除自动滚动锁，允许后续用户操作
    setTimeout(() => {
      isAutoScrolling.value = false;
    }, 3000);
  }, 2000);
};

onMounted(() => {
  // 监听鼠标滚轮，结束后触发回顶
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

// 使用 useHead 在 head 中预加载当前与下一张背景图
const headPreload = computed(() => {
  const links: Array<Record<string, string>> = [];
  const len = bgStore.backgroundImages.length;
  if (len === 0) return { link: [] };
  const cur = bgStore.backgroundUrl;
  links.push({ rel: "preload", as: "image", href: cur });
  if (len > 1) {
    const next = bgStore.backgroundImages[(bgStore.effectiveIndex + 1) % len];
    links.push({ rel: "preload", as: "image", href: next });
  }
  return { link: links };
});
useHead(headPreload);
</script>

<template>
  <div class="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto]">
    <!-- 背景图 -->
    <div
      class="pointer-events-none fixed inset-0 -z-10 transform-gpu bg-cover bg-fixed blur-3xl transition-all duration-800"
      :style="{ backgroundImage: `url('${bgStore.backgroundUrl}')` }"
    ></div>
    <header>
      <div class="mx-auto">
        <Teleport to="body">
          <ToastContainer />
        </Teleport>
        <CookieConsent />
        <AnimatePresence>
          <BasicNav :isEntryView="isEntryView" :isVisible="showBasicNav" />
        </AnimatePresence>
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative scroll-smooth">
      <!-- 路由出口 -->

      <RouterView v-slot="{ Component }">
        <template v-if="isEntryView">
          <component :is="Component" :key="$route.path" />
        </template>
        <transition
          v-else
          mode="out-in"
          enter-active-class="transition-all transform-gpu duration-300 ease-out"
          enter-from-class="translate-y-20 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition-all transform-gpu duration-200 ease-out"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-20 opacity-0"
        >
          <component :is="Component" :key="$route.path" />
        </transition>
      </RouterView>
    </main>

    <!-- Footer -->
    <BasicFooter v-if="themeStore.showFooter === 'true'" :isEntryView="isEntryView" :isAboutView="isAboutView" />

    <!-- Back to Top Button -->
    <BackToTop />
  </div>
</template>
