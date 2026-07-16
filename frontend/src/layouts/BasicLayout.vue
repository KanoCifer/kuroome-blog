<script setup lang="ts">
import { BasicFooter } from '@/components/basic';
import BackToTop from '@/components/layout/BackToTop.vue';
import CookieConsent from '@/components/layout/CookieConsent.vue';
import ToastContainer from '@/components/layout/ToastContainer.vue';
import BasicNav from '@/components/nav/BasicNav.vue';
import TodoModal from '@/layouts/components/TodoModal.vue';
import { connectionDelay } from '@/plugins/visitorWs';
import { useBackgroundStore } from '@/stores/background';
import { useThemeStore } from '@/stores/theme';
import { useVisitorCountStore } from '@/stores/visitorCount';
import { AnimatePresence, motion } from 'motion-v';
import { computed, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';

const bgStore = useBackgroundStore();
const themeStore = useThemeStore();
const visitorCount = useVisitorCountStore();
const islandExpanded = ref(false);

const delayStatus = computed(() => {
  const ms = connectionDelay?.value ?? 0;
  if (!ms) return { label: '-- ms', dotClass: 'bg-white/40' };
  const label = `${Math.round(ms)} ms`;
  if (ms < 200)
    return { label, dotClass: 'bg-emerald-400', textClass: 'text-emerald-400' };
  if (ms < 2000)
    return { label, dotClass: 'bg-yellow-400', textClass: 'text-yellow-400' };
  return { label, dotClass: 'bg-red-400', textClass: 'text-red-400' };
});

const route = useRoute();
const isEntryView = ref<boolean>(false);
const isAboutView = ref<boolean>(false);
// 延迟初始值：首次 watch immediate 执行前不渲染任何导航组件，
// 避免刷新时 BentoNavCard 先闪现再消失
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
        enter-active-class="transition-opacity duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300 ease-in"
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

    <!-- 滚动检测哨兵（页面顶部不可见 fixed div）-->
    <!-- Main Content -->
    <main class="relative flex-1 scroll-smooth">
      <!-- 路由出口 -->
      <RouterView v-slot="{ Component }">
        <template v-if="isEntryView">
          <component :is="Component" :key="$route.path" />
        </template>
        <Transition v-else :name="transitionName" mode="out-in">
          <div :key="$route.path">
            <component :is="Component" />
          </div>
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

    <!-- Navigation: 始终居中，无 compact/居中切换 -->
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
    <motion.div
      :animate="{
        height: islandExpanded ? 96 : 28,
        borderRadius: islandExpanded ? 24 : 14,
      }"
      :transition="{ type: 'spring', stiffness: 400, damping: 30, bounce: 0 }"
      class="fixed bottom-6 left-1/2 z-40 w-[220px] -translate-x-1/2 cursor-pointer overflow-hidden bg-black text-white shadow-lg shadow-black/20"
      @click="islandExpanded = !islandExpanded"
      role="button"
      :aria-expanded="islandExpanded"
      aria-label="实时状态面板"
    >
      <motion.div
        :initial="{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }"
        :animate="{ opacity: islandExpanded ? 0 : 1, scale: islandExpanded ? 0.25 : 1, filter: islandExpanded ? 'blur(4px)' : 'blur(0px)' }"
        :exit="{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }"
        :transition="{ type: 'spring', duration: 0.3, bounce: 0 }"
        class="flex h-7 items-center justify-center gap-2 px-3"
        :class="{ 'pointer-events-none': islandExpanded }"
      >
        <span class="relative flex h-1.5 w-1.5">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            :class="delayStatus.dotClass"
          />
          <span
            class="relative inline-flex h-1.5 w-1.5 rounded-full"
            :class="delayStatus.dotClass"
          />
        </span>
        <span class="font-mono text-[10px] tracking-[0.05em] tabular-nums"
          >{{ delayStatus.label }}</span
        >
        <span class="text-white/30">·</span>
        <span class="relative flex h-1.5 w-1.5">
          <span
            class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          />
          <span
            class="bg-success relative inline-flex h-1.5 w-1.5 rounded-full"
          />
        </span>
        <span class="font-mono text-[10px] tracking-[0.05em] tabular-nums"
          >{{ visitorCount.count }} 在线</span
        >
      </motion.div>

      <motion.div
        :initial="{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }"
        :animate="{ opacity: islandExpanded ? 1 : 0, scale: islandExpanded ? 1 : 0.92, filter: islandExpanded ? 'blur(0px)' : 'blur(4px)' }"
        :exit="{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }"
        :transition="{ type: 'spring', duration: 0.3, bounce: 0 }"
        class="absolute inset-0 flex flex-col justify-between px-4 py-3"
        :class="{ 'pointer-events-none': !islandExpanded }"
      >
        <router-link
          to="/status"
          class="flex items-center justify-between"
          @click.stop
        >
          <span class="text-[11px] font-medium tracking-wide opacity-90"
            >Service Status</span
          >
          <svg
            class="h-3.5 w-3.5 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </router-link>
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="text-[9px] uppercase tracking-[0.15em] opacity-50"
              >Latency</span
            >
            <span
              class="font-mono text-sm font-semibold tabular-nums"
              :class="delayStatus.textClass"
              >{{ delayStatus.label }}</span
            >
          </div>
          <div class="flex flex-col items-end gap-0.5">
            <span class="text-[9px] uppercase tracking-[0.15em] opacity-50"
              >Online</span
            >
            <span class="font-mono text-sm font-semibold tabular-nums"
              >{{ visitorCount.count }}</span
            >
          </div>
        </div>
      </motion.div>
    </motion.div>

    <!-- 全局开发任务悬浮抽屉 -->
    <TodoModal />
  </div>
</template>

<style scoped>
/* 页面切换动画: 精确属性 + 统一缓动 + 进出对称 + GPU 提示 + 减动守卫 */

/* fade — login: 纯淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s cubic-bezier(0.32, 0.72, 0, 1);
  will-change: opacity;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* slide-up — register / default: jg-tab-in 缓动 (snap in, soft out) */
@keyframes tab-in {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
@keyframes tab-out {
  0% {
    opacity: 1;
    transform: none;
  }
  100% {
    opacity: 0;
    transform: translateY(-4px);
  }
}
.slide-up-enter-active {
  animation: tab-in 0.28s cubic-bezier(0.32, 0.72, 0, 1) both;
  will-change: transform, opacity;
}
.slide-up-leave-active {
  animation: tab-out 0.28s cubic-bezier(0.32, 0.72, 0, 1) both;
  will-change: transform, opacity;
}

/* 减动偏好: 用户要求减少动画时禁用所有过渡和动画 */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none !important;
  }
  .slide-up-enter-active,
  .slide-up-leave-active {
    animation: none !important;
  }
  .fade-enter-from,
  .fade-leave-to,
  .slide-up-enter-from,
  .slide-up-leave-to {
    opacity: 1 !important;
    transform: none !important;
  }
}

</style>
