<script setup lang="ts">
import { BasicFooter } from '@/components/basic';
import BackToTop from '@/components/layout/BackToTop.vue';
import CookieConsent from '@/components/layout/CookieConsent.vue';
import ToastContainer from '@/components/layout/ToastContainer.vue';
import { RouteTransition } from '@/components/ui/route-transition';
import BasicNav from '@/components/nav/BasicNav.vue';
import TodoModal from '@/layouts/components/TodoModal.vue';
import DynamicIsland from '@/layouts/components/DynamicIsland.vue';
import { AnimatePresence } from 'motion-v';
import { useBackgroundStore } from '@/stores/background';
import { useThemeStore } from '@/stores/theme';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const bgStore = useBackgroundStore();
const themeStore = useThemeStore();

const route = useRoute();
const isEntryView = ref<boolean>(false);
const isAboutView = ref<boolean>(false);

const showBasicNav = ref<boolean | null>(null);

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
</script>

<template>
  <div
    ref="layoutContainer"
    class="relative isolate"
    :class="
      isEntryView
        ? 'flex min-h-dvh flex-col'
        : 'grid min-h-dvh grid-rows-[auto_1fr_auto]'
    "
  >
    <div
      class="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <Transition
        enter-active-class="transition-opacity duration-1000 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200 ease-out"
        leave-from-class="opacity-100"
        leave-to-class="opacity-90"
      >
        <div
          :key="bgStore.backgroundClass"
          :class="bgStore.backgroundClass"
          class="absolute inset-0 h-full w-full transform-gpu"
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

    <!-- 滚动检测哨兵（页面顶部不可见 fixed div）-->
    <!-- Main Content -->
    <main class="relative flex-1 scroll-smooth">
      <!-- 路由出口 -->
      <RouteTransition />
    </main>

    <!-- Footer -->
    <BasicFooter
      v-if="themeStore.showFooter === 'true' && !isEntryView"
      :isEntryView="isEntryView"
    />

    <!-- Back to Top Button -->
    <BackToTop />

    <!-- Navigation -->
    <AnimatePresence>
      <BasicNav
        v-if="showBasicNav === true"
        :animate="{ opacity: 1, y: 0, left: '50%' }"
        :initial="{ opacity: 0, y: -40, left: '50%' }"
        :exit="{ opacity: 0, y: -40 }"
        :transition="{ type: 'spring', bounce: 0.3, duration: 0.5 }"
        class="group fixed top-12 z-9999 -translate-x-1/2 -translate-y-1/2"
      />
    </AnimatePresence>

    <!-- 灵动岛：底部悬浮实时状态 -->
    <DynamicIsland />

    <!-- 全局开发任务悬浮抽屉 -->
    <TodoModal />
  </div>
</template>
