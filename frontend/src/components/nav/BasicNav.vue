<template>
  <motion.nav class="nav liquid-glass z-9999 px-7 py-1">
    <ul class="flex items-center gap-2 font-medium">
      <!-- Brand: avatar + 文字 logo -->
      <li class="ml-1 flex shrink-0 items-center gap-2 pr-2">
        <RouterLink to="/" class="shrink-0">
          <img
            v-if="auth.isAuthenticated && auth.user?.photo"
            :src="avatarUrl"
            :alt="currentUserName"
            class="h-10 w-10 rounded-full object-cover ring-2 ring-white/50 transition-transform hover:scale-105 dark:ring-gray-700/50"
          />
          <img
            v-else
            src="/images/about-thumb.webp"
            alt="Default Avatar"
            class="h-10 w-10 rounded-full object-cover ring-2 ring-white/50 transition-transform hover:scale-105 dark:ring-gray-700/50"
          />
        </RouterLink>
        <RouterLink
          to="/"
          class="nav-text font-family-averia text-xl leading-none tracking-wide whitespace-nowrap"
        >
          Kuroome <br />Blog
        </RouterLink>
      </li>
      <!-- Navigation Labels (圆中文字) -->
      <li class="relative ml-20 flex items-center gap-5 px-2">
        <!-- Indicator -->
        <motion.div
          class="bg-primary/10 pointer-events-none absolute top-1/2 left-0 z-1 h-12 w-[64px] -translate-y-1/2 rounded-full shadow-sm"
          :animate="{ x: indicatorX }"
          :transition="{ type: 'spring', stiffness: 320, damping: 30 }"
        />
        <!-- Nav Items: 英文标签 -->
        <RouterLink
          v-for="(item, index) in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-text relative z-10 flex h-12 w-[64px] items-center justify-center rounded-full font-serif text-sm leading-none transition-colors"
          :class="{
            'font-semibold': isActive(item.to),
          }"
          :aria-label="item.ariaLabel"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = activeIndex"
        >
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </motion.nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/auth/stores/auth';
import { useDebounce } from '@vueuse/core';
import { motion } from 'motion-v';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const auth = useAuthStore();
const route = useRoute();

// Navigation items config
// 英文标签 + 完整 ariaLabel 给屏幕阅读器
const navItems = [
  { to: '/', label: 'Home', ariaLabel: 'Home' },
  { to: '/blog', label: 'Blog', ariaLabel: 'Blog' },
  { to: '/moments', label: 'Moments', ariaLabel: 'Moments' },
  { to: '/bookshelf', label: 'Bookshelf', ariaLabel: 'Bookshelf' },
  { to: '/gallery', label: 'Gallery', ariaLabel: 'Gallery' },
  { to: '/version-log', label: 'Log', ariaLabel: 'Changelog' },
];

// State
const hoveredIndex = ref(0);
const activeIndex = ref(0);
const debouncedHoveredIndex = useDebounce(hoveredIndex, 40);
// 按钮宽 64 + li gap 8 = 72；li 内边距 8 (px-2)
const indicatorX = computed(() => debouncedHoveredIndex.value * 84 + 8);

// Check if route is active
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/';
  }

  return route.path === path || route.path.startsWith(`${path}/`);
};

// Update active index when route changes
watch(
  () => route.path,
  () => {
    const index = navItems.findIndex((item) => isActive(item.to));
    if (index !== -1) {
      activeIndex.value = index;
      hoveredIndex.value = index;
    }
  },
  { immediate: true },
);

// Computed
const currentUserName = computed(() => auth.user?.name || '未登录');
const avatarUrl = computed(() => {
  if (auth.user?.photo?.startsWith('http')) {
    return auth.user.photo;
  }
  if (auth.user?.photo) {
    return `/api/v3/media/${auth.user.photo}`;
  }
  return '/images/about-thumb.webp';
});
</script>

<style scoped>
.nav-text {
  color: black;
}
.dark .nav-text {
  color: white;
}

/* 液态玻璃效果：SVG 色散 + 毛玻璃 + 饱和度补偿 + 双层内阴影模拟玻璃厚度
   详见 index.html 中 #nav-liquid-glass filter 定义
   浅色模式用半透白做光雾，深色模式切到半透 paper (var(--paper)/40) 透出深色背景
   — 跟随主题自动切基色，深/浅都通透 */
.liquid-glass {
  border-radius: 999px;
  background: rgb(255 255 255 / 0.06);
  -webkit-backdrop-filter: url(#nav-liquid-glass) blur(7px) saturate(1.4);
  backdrop-filter: url(#nav-liquid-glass) blur(4px) saturate(1.4);
  border: 1px solid rgb(21 20 15 / 0.08);
  /* 内侧高光(玻璃正面反光) + 外侧散射光(玻璃壁厚) + 环境阴影(浮起) */
  box-shadow:
    inset 0 0 2px 1px rgb(255 255 255 / 0.55),
    inset 0 0 10px 4px rgb(255 255 255 / 0.22),
    0 6px 24px rgb(17 17 26 / 0.06),
    0 12px 40px rgb(17 17 26 / 0.05);
}
/* Safari 不支持 backdrop-filter: url(...) ，降级为纯毛玻璃 + 偏亮阴影 */
@supports not (backdrop-filter: url(#nav-liquid-glass)) {
  .liquid-glass {
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
    backdrop-filter: blur(12px) saturate(1.4);
  }
}

/* 深色模式：基底由"白色光雾"换成"深色玻璃"，
   边框翻转为浅色高光边，浮起阴影换成发光晕 */
.dark .liquid-glass {
  background: color-mix(in oklch, var(--color-background) 40%, transparent);
  border-color: rgb(255 255 255 / 0.08);
  box-shadow:
    inset 0 0 2px 1px rgb(255 255 255 / 0.1),
    inset 0 0 10px 4px rgb(255 255 255 / 0.04),
    0 0 24px -4px rgb(255 255 255 / 0.12),
    0 0 8px -2px rgb(255 255 255 / 0.08);
}
</style>
