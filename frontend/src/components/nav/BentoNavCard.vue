<template>
  <BentoCard
    :layoutId="props.layoutId"
    :initial="props.initial"
    :animate="props.animate"
    :transition="props.transition"
  >
    <!-- 用户信息区 -->
    <div
      @click="openUserMenu"
      @mouseenter="openUserMenu"
      @mouseleave="closeUserMenu"
      class="mb-8 flex items-center gap-4 px-2 hover:cursor-pointer"
    >
      <!-- 用户下拉菜单 User Menu Dropdown -->
      <transition
        enter-active-class="transition-all transform-gpu duration-200 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all transform-gpu duration-150 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 -translate-y-1"
      >
        <div
          v-if="isUserMenuOpen"
          class="absolute top-16 right-0 z-9999 mt-2 w-auto rounded-3xl border border-gray-200/60 bg-gray-50 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-50/5"
        >
          <ol>
            <template v-if="auth.isAuthenticated">
              <li>
                <RouterLink
                  to="/settings"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 rounded-t-3xl px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <IconUser class="h-4 w-4" />
                  Profile
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  to="/import"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ImportIcon class="h-4 w-4" />

                  Import
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  v-if="auth.user?.is_admin"
                  to="/messages"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <MessageIcon class="h-4 w-4" />
                  Messages
                </RouterLink>
              </li>

              <li>
                <RouterLink
                  v-if="auth.user?.is_admin"
                  to="/analytics"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <IconAnalytics class="h-4 w-4" />
                  Analytics
                </RouterLink>
              </li>
              <li class="border-t border-gray-200 dark:border-gray-700">
                <button
                  @click.prevent="handleLogout"
                  :disabled="auth.loading"
                  class="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-serif font-bold text-blue-600 dark:text-blue-400"
                >
                  <LogoutIcon class="h-4 w-4" />
                  {{ auth.loading ? "Signing out..." : "Logout" }}
                </button>
              </li>
            </template>
            <template v-else>
              <li>
                <RouterLink
                  to="/login"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 dark:text-gray-300"
                >
                  <LoginIcon class="h-4 w-4" />
                  Login
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  to="/register"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 dark:text-gray-300"
                >
                  <RegisterIcon class="h-4 w-4" />
                  Register
                </RouterLink>
              </li>
            </template>
          </ol>
        </div>
      </transition>

      <img
        v-if="auth.isAuthenticated && auth.user?.photo"
        :src="avatarUrl"
        :alt="currentUserName"
        class="h-14 w-14 rounded-full object-cover shadow-sm ring-4 ring-white/50 dark:ring-gray-700/50"
      />
      <img
        v-else
        src="/images/about.webp"
        alt="Default Avatar"
        class="h-14 w-14 rounded-full object-cover shadow-sm ring-4 ring-white/50 dark:ring-gray-700/50"
      />
      <div class="flex items-baseline gap-2">
        <span
          class="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100"
        >
          {{ currentUserName }}
        </span>
        <ChevronDownIcon
          class="h-3 w-3 transform-gpu text-gray-700 transition-transform"
          :class="{ 'rotate-180': isUserMenuOpen }"
        />
      </div>
    </div>

    <!-- 导航分类 -->
    <div
      class="mb-4 px-3 text-sm font-bold tracking-wider text-gray-400 dark:text-gray-500"
    >
      GENERAL
    </div>

    <!-- 导航项列表 -->
    <div class="relative">
      <!-- 导航指示器 -->
      <Motion
        class="absolute top-0 left-0 h-14 w-full rounded-2xl bg-white shadow-sm dark:bg-gray-700"
        :animate="{ y: `${hoverNavIndex * (52 + 8)}px` }"
        :transition="{ type: 'spring', stiffness: 300, damping: 30 }"
        style="z-index: -1"
      />

      <ol class="flex flex-col gap-2">
        <li
          v-for="(item, index) in navItems"
          :key="item.path"
          @mouseenter="hoverNavIndex = index"
        >
          <RouterLink
            :to="item.path"
            class="relative z-10 flex items-center gap-4 rounded-2xl py-3.5 pr-5 pl-6 font-medium transition-all"
            :class="[
              hoverNavIndex === index
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            ]"
          >
            <component :is="item.icon" class="h-6 w-6" />
            <span class="text-[15px]">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ol>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import { type MotionProps, Motion } from "motion-v";
import { computed, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import BentoCard from "@/components/bento/BentoCard.vue";
import {
  AboutIcon,
  BlogIcon,
  BookshelfIcon,
  ChangelogIcon,
  ChevronDownIcon,
  HomeIcon,
  IconAnalytics,
  IconUser,
  ImportIcon,
  LoginIcon,
  LogoutIcon,
  MessageIcon,
  RegisterIcon,
  RssIcon,
  IconTooling,
} from "@/components/icons";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const route = useRoute();

const props = defineProps<{
  layoutId?: string;
  initial?: MotionProps["initial"];
  animate?: MotionProps["animate"];
  transition?: MotionProps["transition"];
}>();

// 导航项配置
const navItems = [
  { path: "/", label: "首页", icon: HomeIcon },
  { path: "/blog", label: "近期文章", icon: BlogIcon },
  { path: "/bookshelf", label: "我的书架", icon: BookshelfIcon },
  { path: "/changelog", label: "更新日志", icon: ChangelogIcon },
  { path: "/rss", label: "RSS 订阅", icon: RssIcon },
  { path: "/toolbox/image-toolbox", label: "图片工具", icon: IconTooling },
  { path: "/about", label: "关于网站", icon: AboutIcon },
];

// // 当前活动导航项索引
// const activeNavIndex = ref(0);
// hover 时的导航项索引
const hoverNavIndex = ref(0);

const currentUserName = computed(() => {
  return auth.isAuthenticated ? auth.user?.name || "用户" : "游客";
});

// User menu dropdown state
const isUserMenuOpen = ref(false);
let userMenuCloseTimeout: ReturnType<typeof setTimeout> | null = null;

// User menu dropdown functions
const openUserMenu = () => {
  if (userMenuCloseTimeout) {
    clearTimeout(userMenuCloseTimeout);
    userMenuCloseTimeout = null;
  }
  isUserMenuOpen.value = true;
};

const closeUserMenu = () => {
  userMenuCloseTimeout = setTimeout(() => {
    isUserMenuOpen.value = false;
  }, 150);
};

const closeUserMenuImmediately = () => {
  if (userMenuCloseTimeout) {
    clearTimeout(userMenuCloseTimeout);
    userMenuCloseTimeout = null;
  }
  isUserMenuOpen.value = false;
};

const handleLogout = () => {
  closeUserMenuImmediately();
  auth.logout();
};

const avatarUrl = computed(() => {
  if (auth.user?.photo?.startsWith("http")) {
    return auth.user.photo;
  }
  if (auth.user?.photo) {
    return `/api/v1/media/${auth.user.photo}`;
  }
  return "/api/v1/media/default.png";
});

let navIndexTimer: ReturnType<typeof setTimeout> | null = null;

// 更新活动导航项索引
const updateNavIndex = () => {
  if (navIndexTimer) {
    clearTimeout(navIndexTimer);
  }
  const index = navItems.findIndex((item) => route.path === item.path);
  navIndexTimer = setTimeout(() => {
    if (index !== -1) {
      hoverNavIndex.value = index;
    }
  }, 100);
};

onUnmounted(() => {
  if (navIndexTimer) {
    clearTimeout(navIndexTimer);
  }
  if (userMenuCloseTimeout) {
    clearTimeout(userMenuCloseTimeout);
  }
});

// 监听路由变化
watch(() => route.path, updateNavIndex, { immediate: true });
</script>
