<template>
  <AnimatePresence>
    <motion.div
      v-if="isVisible"
      :exit="{ width: 0, opacity: 0, transition: { duration: 0.2 } }"
      :transition="{ type: 'spring', stiffness: 500, damping: 30 }"
      layoutId="nav-card"
      class="group fixed top-4 left-4 z-50"
    >
      <nav
        class="squircle flex items-center gap-2 bg-white/80 px-1 py-2 shadow-lg backdrop-blur-sm dark:bg-gray-800/80"
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
                src="/images/about.webp"
                alt="Default Avatar"
                class="h-10 w-10 rounded-full object-cover ring-2 ring-white/50 transition-transform hover:scale-105 dark:ring-gray-700/50"
              />
            </RouterLink>
          </li>
          <!-- Navigation Icons -->
          <li class="relative flex items-center gap-4 px-2">
            <!-- Nav Items -->
            <RouterLink
              v-for="(item, index) in navItems"
              :key="item.to"
              :to="item.to"
              class="relative z-10 flex h-12 w-12 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              :class="{
                'text-blue-600 dark:text-blue-400': isActive(item.to),
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
  </AnimatePresence>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  HomeIcon,
  BlogIcon,
  BookshelfIcon,
  ChangelogIcon,
  IconTooling,
  RssIcon,
} from "@/components/icons";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const route = useRoute();

const props = defineProps<{
  isHeaderVisible?: boolean;
  isEntryView?: boolean;
  isVisible?: boolean;
}>();

const isVisible = computed(() =>
  props.isVisible !== undefined ? props.isVisible : !props.isEntryView,
);

// Navigation items config
const navItems = [
  { to: "/", icon: HomeIcon },
  { to: "/blog", icon: BlogIcon },
  { to: "/bookshelf", icon: BookshelfIcon },
  { to: "/toolbox/image-toolbox", icon: IconTooling },
  { to: "/changelog", icon: ChangelogIcon },
  { to: "/rss", icon: RssIcon },
];

// State
const hoveredIndex = ref(0);
const activeIndex = ref(0);

// Check if route is active
const isActive = (path: string) => route.path === path;

// Update active index when route changes
watch(
  () => route.path,
  (newPath) => {
    const index = navItems.findIndex((item) => item.to === newPath);
    if (index !== -1) {
      activeIndex.value = index;
      hoveredIndex.value = index;
    }
  },
  { immediate: true },
);

// Computed
const currentUserName = computed(() => auth.user?.name || "未登录");
const avatarUrl = computed(() => {
  if (auth.user?.photo?.startsWith("http")) {
    return auth.user.photo;
  }
  if (auth.user?.photo) {
    return `/api/v1/media/${auth.user.photo}`;
  }
  return "/images/about.webp";
});
</script>
