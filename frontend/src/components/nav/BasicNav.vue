<template>
  <motion.div>
    <nav
      class="nav squircle bg-card/90 dark:shadow-primary/10 z-9999 flex items-center gap-2 px-1 py-2 shadow-md backdrop-blur-sm"
    >
      <ul class="flex items-center gap-2 font-medium">
        <!-- Avatar -->
        <li class="ml-2 shrink-0">
          <RouterLink to="/">
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
        </li>
        <!-- Navigation Icons -->
        <li class="relative flex items-center gap-4 px-2">
          <!-- Indicator -->
          <motion.div
            class="bg-primary/20 pointer-events-none absolute top-0 left-0 z-1 h-12 w-12 rounded-full shadow-sm"
            :animate="{ x: indicatorX }"
            :transition="{ type: 'spring', stiffness: 320, damping: 30 }"
          />
          <!-- Nav Items -->
          <RouterLink
            v-for="(item, index) in navItems"
            :key="item.to"
            :to="item.to"
            class="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground relative z-10 flex h-12 w-12 items-center justify-center rounded-full transition-colors"
            :class="{
              'text-primary dark:text-primary': isActive(item.to),
            }"
            @mouseenter="hoveredIndex = index"
            @mouseleave="hoveredIndex = activeIndex"
          >
            <component :is="item.icon" class="h-6 w-6" />
          </RouterLink>
        </li>
      </ul>
    </nav>
  </motion.div>
</template>

<script setup lang="ts">
import {
  BlogIcon,
  BookshelfIcon,
  ChangelogIcon,
  HomeIcon,
} from '@/components/icons';
import { useAuthStore } from '@/auth/stores/auth';
import { useDebounce } from '@vueuse/core';
import { Image } from '@lucide/vue';
import { motion } from 'motion-v';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const auth = useAuthStore();
const route = useRoute();

// Navigation items config
const navItems = [
  { to: '/', icon: HomeIcon },
  { to: '/blog', icon: BlogIcon },
  { to: '/bookshelf', icon: BookshelfIcon },
  { to: '/gallery', icon: Image },
  { to: '/version-log', icon: ChangelogIcon },
];

// State
const hoveredIndex = ref(0);
const activeIndex = ref(0);
const debouncedHoveredIndex = useDebounce(hoveredIndex, 40);
const indicatorX = computed(() => debouncedHoveredIndex.value * 64 + 8);

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
    return `/api/v1/media/${auth.user.photo}`;
  }
  return '/images/about-thumb.webp';
});
</script>

<style scoped>
.nav {
  box-shadow: rgba(255, 255, 255, 0.35) 0px 0px 20px 0px inset;
}
</style>
