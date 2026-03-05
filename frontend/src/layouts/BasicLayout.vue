<script setup lang="ts">
import BackToTop from "@/components/BackToTop.vue";
import BasicFooter from "@/components/basic/BasicFooter.vue";
import BasicNav from "@/components/basic/BasicNav.vue";
import BasicNotifier from "@/components/basic/BasicNotifier.vue";
import ToastContainer from "@/components/ToastContainer.vue";
import { useScroll } from "@vueuse/core";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
const route = useRoute();
const notEntryView = ref<boolean>(false);
const showFooterBg = ref<boolean>(false);

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    notEntryView.value = newPath === "/";
    showFooterBg.value =
      // 匹配 /blog/xxxx 但不包括 /blog 列表页
      (newPath.startsWith("/blog/") && newPath !== "/blog") ||
      newPath.includes("/rss");
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

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", handleResize);
});

const isMobileWarningVisible = ref(false);
const isMobileDevice = ref(false);
// 处理窗口大小变化
const handleResize = () => {
  isMobileDevice.value = window.innerWidth < 768;
  if (isMobileDevice.value && !isMobileWarningVisible.value) {
    isMobileWarningVisible.value = true;
  }
};

const closeMobileWarning = () => {
  isMobileWarningVisible.value = false;
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
        <transition
          mode="out-in"
          enter-active-class="transition-all transform-gpu duration-300 ease-in-out"
          enter-from-class="translate-y-[-100px]"
          enter-to-class="translate-y-0"
          leave-active-class="transition-all transform-gpu duration-300 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-[-100px]"
        >
          <BasicNav v-if="!notEntryView" :isHeaderVisible="isHeaderVisible" />
        </transition>
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative">
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
