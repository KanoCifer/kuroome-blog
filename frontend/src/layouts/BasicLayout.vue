<script setup lang="ts">
import { BasicFooter } from '@/components/basic';
import { BentoNavCard } from '@/components/bento';
import BackToTop from '@/components/layout/BackToTop.vue';
import TodoModal from '@/layouts/components/TodoModal.vue';
import CookieConsent from '@/components/layout/CookieConsent.vue';
import ToastContainer from '@/components/layout/ToastContainer.vue';
import BasicNav from '@/components/nav/BasicNav.vue';
import { useCardLayout } from '@/composables/useCardLayout';
import { useBackgroundStore } from '@/stores/background';
import { useThemeStore } from '@/stores/theme';
import { AnimatePresence } from 'motion-v';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';

const bgStore = useBackgroundStore();
const themeStore = useThemeStore();

const route = useRoute();
const layoutContainer = ref<HTMLElement | null>(null);
const isEntryView = ref<boolean>(false);
const isAboutView = ref<boolean>(false);
const showBasicNav = ref<boolean>(route.path !== '/');
const isNavCompact = ref<boolean>(false);

// Card layout for BentoNavCard positioning on entry view
const { navCardPosition } = useCardLayout(layoutContainer);

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    isEntryView.value = newPath === '/';
    isAboutView.value = newPath === '/about';

    if (newPath === '/') {
      showBasicNav.value = false;
      return;
    }

    showBasicNav.value = true;
  },
  { immediate: true },
);

let scrollObserver: IntersectionObserver | null = null;
const sentinelRef = ref<HTMLElement | null>(null);

const initObserver = () => {
  scrollObserver?.disconnect();
  if (!sentinelRef.value) return;
  scrollObserver = new IntersectionObserver(
    ([entry]) => {
      isNavCompact.value = !entry.isIntersecting;
    },
    { threshold: 0 },
  );
  scrollObserver.observe(sentinelRef.value);
};

onMounted(() => initObserver());
onBeforeUnmount(() => scrollObserver?.disconnect());

watch(sentinelRef, () => initObserver());

// 导航栏滚动隐藏逻辑
// const isHeaderVisible = ref(true);
// const lastScrollY = ref(0);
// const headerThreshold = 250;
// const { y } = useScroll(window);

// TODO(human): 重构冗余的滚动监听，改用 watch(y, ...) 替代原生 addEventListener
// const handleScroll = () => {
//   const currentScrollY = y.value;
//   // 向下滚动超过阈值，隐藏导航
//   if (currentScrollY > lastScrollY.value && currentScrollY > headerThreshold) {
//     isHeaderVisible.value = false;
//   }
//   // 向上滚动，显示导航
//   else if (currentScrollY < lastScrollY.value) {
//     isHeaderVisible.value = true;
//   }

//   lastScrollY.value = currentScrollY;
// };

// onMounted(() => {
//   window.addEventListener("scroll", handleScroll, { passive: true });
//   lastScrollY.value = y.value;
// });

// // 自动回顶
// const isAutoScrolling = ref(false);
// let returnTopTimer: number | null = null;
// const scheduleReturnTop = () => {
//   // 仅在首页时启用
//   if (!isEntryView.value) return;
//   if (isAutoScrolling.value) return;
//   if (returnTopTimer) {
//     clearTimeout(returnTopTimer);
//   }
//   // 在滚动停止后 2000ms 执行回顶
//   returnTopTimer = window.setTimeout(() => {
//     isAutoScrolling.value = true;
//     window.scrollTo({ top: 0, behavior: "smooth" });
//     // 3000ms 后解除自动滚动锁，允许后续用户操作
//     setTimeout(() => {
//       isAutoScrolling.value = false;
//     }, 3000);
//   }, 2000);
// };

// onMounted(() => {
//   // 监听鼠标滚轮，结束后触发回顶
//   window.addEventListener("wheel", scheduleReturnTop, { passive: true });
// });

// onUnmounted(() => {
//   window.removeEventListener("wheel", scheduleReturnTop);
//   if (returnTopTimer) {
//     clearTimeout(returnTopTimer);
//     returnTopTimer = null;
//   }
// });

// onUnmounted(() => {
//   window.removeEventListener("scroll", handleScroll);
// });

// 使用 useHead 在 head 中预加载当前与下一张背景图
// const headPreload = computed(() => {
//   const links: Array<Record<string, string>> = [];
//   const len = bgStore.backgroundImages.length;
//   if (len === 0) return { link: [] };
//   const cur = bgStore.backgroundUrl;
//   links.push({ rel: "preload", as: "image", href: cur });
//   if (len > 1) {
//     const next = bgStore.backgroundImages[(bgStore.effectiveIndex + 1) % len];
//     links.push({ rel: "preload", as: "image", href: next });
//   }
//   return { link: links };
// });
// useHead(headPreload);
</script>

<template>
  <div
    ref="layoutContainer"
    class="relative isolate"
    :class="
      isEntryView
        ? 'flex h-dvh flex-col overflow-hidden'
        : 'grid min-h-dvh grid-rows-[auto_1fr_auto]'
    "
  >
    <!-- 背景层：img 只做位图，模糊/亮度通过独立蒙版层处理，避免 filter 翻倍占用 -->
    <div
      class="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <Transition
        enter-active-class="transition-opacity duration-500 ease-in-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-500 ease-in-out"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <img
          :key="bgStore.backgroundUrl"
          :src="bgStore.backgroundUrl"
          decoding="async"
          class="absolute inset-0 h-full w-full transform-gpu object-cover"
          :style="{ transform: `scale(${themeStore.bgScale})` }"
        />
      </Transition>

      <!-- 模糊 + 亮度蒙版层：用 backdrop-filter 作用在下方 img 上，避免 filter 在 img 自身上翻倍占用 GPU 纹理 -->
      <div
        v-if="themeStore.bgBlur > 0 || themeStore.bgBrightness !== 1"
        class="pointer-events-none absolute inset-0"
        :style="{
          backdropFilter: `blur(${themeStore.bgBlur}px) brightness(${themeStore.bgBrightness})`,
          WebkitBackdropFilter: `blur(${themeStore.bgBlur}px) brightness(${themeStore.bgBrightness})`,
        }"
      ></div>
    </div>
    <header>
      <div class="mx-auto">
        <Teleport to="body">
          <ToastContainer />
        </Teleport>
        <CookieConsent />
      </div>
    </header>

    <!-- 滚动检测哨兵（页面顶部不可见 fixed div） -->
    <div
      ref="sentinelRef"
      class="pointer-events-none absolute top-0 left-0 z-0 h-px w-px opacity-0"
      aria-hidden="true"
    />

    <!-- Main Content -->
    <main class="relative flex-1 scroll-smooth">
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
    <BasicFooter
      v-if="themeStore.showFooter === 'true' && !isEntryView"
      :isEntryView="isEntryView"
    />

    <!-- Back to Top Button -->
    <BackToTop />

    <!-- Todo Drawer: global floating button + right slide-in drawer -->
    <TodoModal />

    <!-- Navigation: cross-route layoutId morph -->
    <AnimatePresence>
      <BasicNav
        v-if="showBasicNav"
        key="basic-nav"
        layoutId="nav-card"
        :initial="{ opacity: 1 }"
        :animate="{
          opacity: 1,
          ...(isNavCompact ? { left: 200, x: 0 } : {}),
        }"
        :exit="{ opacity: 0 }"
        :transition="{ type: 'spring', bounce: 0.4, duration: 0.7 }"
        class="group fixed top-4 left-1/2 z-50 -translate-x-1/2"
      />
      <BentoNavCard
        v-else
        key="bento-nav"
        layoutId="nav-card"
        class="fixed z-50 w-68 -translate-x-1/2 -translate-y-1/2"
        :style="[navCardPosition]"
        :initial="{ scale: 0.5, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :exit="{ transition: { duration: 0.5 } }"
        :transition="{
          type: 'spring',
          bounce: 0.3,
          duration: 0.5,
        }"
      />
    </AnimatePresence>
  </div>
</template>
