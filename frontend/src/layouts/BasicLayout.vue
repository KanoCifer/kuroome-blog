<script setup lang="ts">
import { BasicFooter, BasicNav, BasicNotifier } from "@/components/basic";
import BackToTop from "@/components/layout/BackToTop.vue";
import ToastContainer from "@/components/layout/ToastContainer.vue";
import { useScroll } from "@vueuse/core";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
const route = useRoute();
const isEntryView = ref<boolean>(false);
const showFooterBg = ref<boolean>(false);

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    isEntryView.value = newPath === "/";
    showFooterBg.value =
      // 匹配 /blog/xxxx 但不包括 /blog 列表页
      (newPath.startsWith("/blog/") && newPath !== "/blog") ||
      newPath.includes("/rss") ||
      newPath.includes("/websites") ||
      newPath.includes("/analytics") ||
      newPath.includes("/messages") ||
      newPath.includes("/todos");
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
  window.addEventListener("resize", handleResize);
  // 初始化时检查窗口大小
  handleResize();
  lastScrollY.value = y.value;
});

// 自动回顶逻辑（仅在桌面端首页生效）
const isAutoScrolling = ref(false);
let returnTopTimer: number | null = null;
const scheduleReturnTop = () => {
  // 仅在首页且非移动设备时启用
  if (!isEntryView.value || isMobileDevice.value) return;
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
  window.removeEventListener("resize", handleResize);
});

const isMobileWarningVisible = ref<boolean>(false);
const accpetedMobileWarning = ref<boolean>(false);
const isMobileDevice = ref<boolean>(false);
// 处理窗口大小变化
const handleResize = () => {
  isMobileDevice.value = window.innerWidth < 768;
  if (
    isMobileDevice.value &&
    !isMobileWarningVisible.value &&
    !accpetedMobileWarning.value
  ) {
    isMobileWarningVisible.value = true;
  }
};

const closeMobileWarning = () => {
  isMobileWarningVisible.value = false;
  accpetedMobileWarning.value = true;
};
</script>

<template>
  <div class="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto]">
    <!-- 背景图 -->
    <div
      class="pointer-events-none fixed inset-0 -z-10 bg-[url('/bg.jpg')] bg-cover blur-md"
    ></div>
    <header>
      <div class="mx-auto mt-6">
        <Teleport to="body">
          <ToastContainer />
        </Teleport>
        <BasicNav
          :isEntryView="isEntryView"
          :isHeaderVisible="isHeaderVisible"
        />
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative snap-y snap-mandatory overflow-y-auto scroll-smooth">
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="['MessageManageView']">
          <transition
            mode="out-in"
            enter-active-class="transition-all transform-gpu duration-500 ease-in-out"
            enter-from-class="-translate-y-20 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition-all transform-gpu duration-500 ease-in-out"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-20 opacity-0 scale-95"
          >
            <component :is="Component" :key="$route.fullPath" />
          </transition>
        </KeepAlive>
        <!-- 路由出口 -->
      </RouterView>
    </main>

    <!-- Footer -->
    <BasicFooter :showFooterBg="showFooterBg" />

    <!-- Back to Top Button -->
    <BackToTop />

    <!-- 移动端适配警告弹窗 -->
    <Teleport to="body">
      <BasicNotifier
        :isMobileWarningVisible="isMobileWarningVisible"
        @update:isMobileWarningVisible="closeMobileWarning"
      />
    </Teleport>
  </div>
</template>
