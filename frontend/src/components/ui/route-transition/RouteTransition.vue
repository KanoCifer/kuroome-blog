<template>
  <RouterView v-slot="{ Component }">
    <template v-if="isEntryView">
      <component :is="Component" :key="route.path" />
    </template>
    <Transition v-else :name="transitionName" mode="out-in">
      <div :key="route.path">
        <component :is="Component" />
      </div>
    </Transition>
  </RouterView>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';

defineOptions({ name: 'RouteTransition' });

const props = withDefaults(
  defineProps<{
    /** 首页路由路径 — 该路径下不做路由过渡动画 */
    entryPath?: string;
  }>(),
  { entryPath: '/' },
);

const route = useRoute();

const isEntryView = computed(() => route.path === props.entryPath);

// 路由过渡动画：从 meta.transition 读取，未定义时用默认 slide-up
const transitionName = computed(
  () => (route.meta.transition as string) ?? 'slide-up',
);
</script>

<style>
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
