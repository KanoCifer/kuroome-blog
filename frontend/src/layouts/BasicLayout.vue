<script setup lang="ts">
import { BasicFooter } from '@/components/basic';
import BackToTop from '@/components/layout/BackToTop.vue';
import TodoModal from '@/layouts/components/TodoModal.vue';
import CookieConsent from '@/components/layout/CookieConsent.vue';
import ToastContainer from '@/components/layout/ToastContainer.vue';
import BasicNav from '@/components/nav/BasicNav.vue';
import { useBackgroundStore } from '@/stores/background';
import { useThemeStore } from '@/stores/theme';
import { AnimatePresence } from 'motion-v';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';

const bgStore = useBackgroundStore();
const themeStore = useThemeStore();

const route = useRoute();
const layoutContainer = ref<HTMLElement | null>(null);
const isEntryView = ref<boolean>(false);
const isAboutView = ref<boolean>(false);
// 延迟初始值：首次 watch immediate 执行前不渲染任何导航组件，
// 避免刷新时 BentoNavCard 先闪现再消失
const showBasicNav = ref<boolean | null>(null);
const isNavCompact = ref<boolean>(false);

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

// 路由过渡动画：从 meta.transition 读取，未定义时用默认 slide-up
const transitionName = computed(
  () => (route.meta.transition as string) ?? 'slide-up',
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
        <Transition v-else :name="transitionName" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </Transition>
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
        v-if="showBasicNav === true"
        :animate="{
          opacity: 1,
          y: 0,
          ...(isNavCompact ? { left: 240 } : { left: '50%' }),
        }"
        :initial="{ opacity: 0, y: -40, left: '50%' }"
        :exit="{ opacity: 0, y: -40 }"
        :transition="{ type: 'spring', bounce: 0.3, duration: 0.5 }"
        class="group fixed top-12 z-50 -translate-x-1/2 -translate-y-1/2"
      />
    </AnimatePresence>
  </div>
</template>

<style scoped>
/* fade — login */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* slide-up — register / default */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}
.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* slide-left — settings */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease-out;
}
.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

/* scale — bookshelf */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.35s ease-out;
}
.scale-enter-from {
  transform: scale(0.95);
  opacity: 0;
}
.scale-leave-to {
  transform: scale(1.02);
  opacity: 0;
}
</style>
