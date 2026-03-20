<template>
  <BentoCard>
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
          class="absolute top-16 right-0 z-9999 mt-2 w-auto rounded-3xl border border-gray-200/60 bg-gray-50/70 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-50/5"
        >
          <ol>
            <template v-if="auth.isAuthenticated">
              <li>
                <RouterLink
                  to="/settings"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 dark:text-gray-300"
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
                  to="/api-docs"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <IconDocumentation class="size-4" />
                  API Docs
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
    <ol class="flex flex-col gap-2">
      <li>
        <RouterLink
          to="/"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-blue-600 shadow-sm dark:!bg-gray-700 dark:!text-blue-400"
        >
          <HomeIcon class="h-6 w-6" />
          <span class="text-[15px]">首页</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/blog"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-blue-600 shadow-sm dark:!bg-gray-700 dark:!text-blue-400"
        >
          <BlogIcon class="h-6 w-6" />
          <span class="text-[15px]">近期文章</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/bookshelf"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-blue-600 shadow-sm dark:!bg-gray-700 dark:!text-blue-400"
        >
          <BookshelfIcon class="h-6 w-6" />
          <span class="text-[15px]">我的书架</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/changelog"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-blue-600 shadow-sm dark:!bg-gray-700 dark:!text-blue-400"
        >
          <ChangelogIcon class="h-6 w-6" />
          <span class="text-[15px]">更新日志</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/rss"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-blue-600 shadow-sm dark:!bg-gray-700 dark:!text-blue-400"
        >
          <RssIcon class="h-6 w-6" />
          <span class="text-[15px]">RSS 订阅</span>
        </RouterLink>
      </li>
      <RouterLink
        to="/about"
        class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
        active-class="!bg-white !text-blue-600 shadow-sm dark:!bg-gray-700 dark:!text-blue-400"
      >
        <AboutIcon class="h-6 w-6" />
        <span class="text-[15px]">关于网站</span>
      </RouterLink>
    </ol>
  </BentoCard>
</template>

<script setup lang="ts">
import {
  AboutIcon,
  BlogIcon,
  BookshelfIcon,
  ChangelogIcon,
  ChevronDownIcon,
  HomeIcon,
  IconAnalytics,
  IconDocumentation,
  IconUser,
  ImportIcon,
  LoginIcon,
  LogoutIcon,
  MessageIcon,
  RegisterIcon,
  RssIcon,
} from "@/components/icons";
import { useAuthStore } from "@/stores/auth";
import { computed, ref } from "vue";
import BentoCard from "./BentoCard.vue";
const auth = useAuthStore();
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
</script>
