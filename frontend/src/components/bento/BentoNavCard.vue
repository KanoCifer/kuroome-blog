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
          class="squircle absolute top-16 right-0 z-9999 mt-2 w-auto border border-gray-200/60 bg-gray-50/70 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-50/5"
        >
          <ol>
            <template v-if="auth.isAuthenticated">
              <li>
                <RouterLink
                  to="/settings"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 dark:text-gray-300"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  to="/import"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="size-4"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75"
                    />
                  </svg>

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
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
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
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
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
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2h2.828l8.586-8.586z"
                    />
                  </svg>
                  Analytics
                </RouterLink>
              </li>
              <li class="border-t border-gray-200 dark:border-gray-700">
                <button
                  @click.prevent="handleLogout"
                  :disabled="auth.loading"
                  class="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-serif font-bold text-red-600 dark:text-red-400"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
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
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Login
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  to="/register"
                  @click="closeUserMenuImmediately"
                  class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 dark:text-gray-300"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
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
        src="/images/avatar.webp"
        alt="Default Avatar"
        class="h-14 w-14 rounded-full object-cover shadow-sm ring-4 ring-white/50 dark:ring-gray-700/50"
      />
      <div class="flex items-baseline gap-2">
        <span class="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100">
          {{ currentUserName }}
        </span>
        <svg
          class="h-3 w-3 transform-gpu text-gray-700 transition-transform"
          :class="{ 'rotate-180': isUserMenuOpen }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>

    <!-- 导航分类 -->
    <div class="mb-4 px-3 text-sm font-bold tracking-wider text-gray-400 dark:text-gray-500">
      GENERAL
    </div>

    <!-- 导航项列表 -->
    <ol class="flex flex-col gap-2">
      <li>
        <RouterLink
          to="/"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-red-600 shadow-sm dark:!bg-gray-700 dark:!text-red-400"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span class="text-[15px]">首页</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/blog"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-red-600 shadow-sm dark:!bg-gray-700 dark:!text-red-400"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <span class="text-[15px]">近期文章</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/bookshelf"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-red-600 shadow-sm dark:!bg-gray-700 dark:!text-red-400"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
          <span class="text-[15px]">我的书架</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/changelog"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-red-600 shadow-sm dark:!bg-gray-700 dark:!text-red-400"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span class="text-[15px]">更新日志</span>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          to="/rss"
          class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
          active-class="!bg-white !text-red-600 shadow-sm dark:!bg-gray-700 dark:!text-red-400"
        >
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 1024 1024">
            <path
              d="M832.512 63.488q26.624 0 49.664 10.24t40.448 27.648 27.648 40.448 10.24 49.664l0 704.512q0 26.624-10.24 49.664t-27.648 40.448-40.448 27.648-49.664 10.24l-704.512 0q-26.624 0-49.664-10.24t-40.448-27.648-27.648-40.448-10.24-49.664l0-704.512q0-26.624 10.24-49.664t27.648-40.448 40.448-27.648 49.664-10.24l704.512 0zM188.416 923.648q19.456 0 36.864-7.168t30.208-19.968 19.968-30.208 7.168-36.864-7.168-36.864-19.968-30.208-30.208-19.968-36.864-7.168q-20.48 0-37.376 7.168t-30.208 19.968-20.48 30.208-7.168 36.864 7.168 36.864 20.48 30.208 30.208 19.968 37.376 7.168zM446.464 897.024l36.864 0q15.36 0 30.208 0.512t31.232 0.512 36.864-1.024q0-93.184-35.84-175.616t-97.28-143.872-143.872-96.768-175.616-35.328q-1.024 24.576-1.024 39.936l0 28.672q0 14.336 0.512 29.184t0.512 37.376q65.536 0 123.392 24.576t100.864 67.584 68.096 100.864 25.088 123.392zM707.584 894.976q36.864 0 49.152 0.512t18.432 1.536 15.872 1.024 41.472-2.048q0-145.408-55.296-272.896t-150.528-222.72-223.232-150.528-273.408-55.296q-1.024 25.6-1.024 36.864l0 16.384q0 4.096 0.512 5.632t0.512 7.168 0.512 18.432 0.512 40.448q119.808 0 224.768 45.056t183.296 123.392 123.392 183.296 45.056 223.744z"
            ></path>
          </svg>
          <span class="text-[15px]">RSS 订阅</span>
        </RouterLink>
      </li>
      <RouterLink
        to="/about"
        class="flex items-center gap-4 rounded-2xl px-5 py-3.5 font-medium text-gray-500 transition-all hover:bg-white/50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
        active-class="!bg-white !text-red-600 shadow-sm dark:!bg-gray-700 dark:!text-red-400"
      >
        <svg
          t="1772541798217"
          class="icon size-6"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          p-id="4777"
          width="32"
          height="32"
        >
          <path
            d="M618 669.9c-89.6 77.4-62.5-58.4-58.4-77.4 4.1-19 62.4-135.8 19.7-155.4-42.8-19.7-174.5 77.4-174.5 77.4s-21.7 15.6-19.7 19.7c14.3 25.1 77.4-19.7 77.4-19.7s21.7-17.6 19.7 0c-19 76.5-32 154.3-38.7 232.8 9.5 51.6 91 29.9 154.8-38.7 63.8-68.5 19.7-38.7 19.7-38.7z m0 0"
            p-id="4778"
            fill="#8a8a8a"
          ></path>
          <path
            d="M566 378c24.2 1.3 47.3-10.4 60.5-30.7 13.2-20.3 14.7-46.1 3.7-67.8-11-21.6-32.6-35.8-56.9-37.1-24.2-1.3-47.3 10.4-60.5 30.7-13.2 20.3-14.7 46.1-3.7 67.8 11 21.6 32.7 35.8 56.9 37.1z m0 0"
            p-id="4779"
            fill="#8a8a8a"
          ></path>
          <path
            d="M884.8 853.9c87.3-93.3 135.9-216.4 135.8-344.2C1020.6 228.5 792.7 0.6 511.5 0.6 230.3 0.6 2.4 228.6 2.4 509.7c0 281.2 227.9 509.1 509.1 509.1h475.2c14.3 0.1 27.1-8.7 32.1-22 5-13.4 1.1-28.4-9.7-37.7L884.8 853.9zM511.5 951C267.8 951 70.2 753.4 70.2 509.7 70.2 266 267.7 68.5 511.4 68.5S952.6 266 952.6 509.7c0.4 122.1-50.3 238.8-139.8 321.8-7.1 7-10.7 16.8-9.9 26.7 0.8 9.9 5.9 19 14 24.9l80.8 67.9H511.5z m0 0"
            p-id="4780"
            fill="#8a8a8a"
          ></path>
        </svg>
        <span class="text-[15px]">关于网站</span>
      </RouterLink>
    </ol>
  </BentoCard>
</template>

<script setup lang="ts">
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
  if (auth.user?.photo) {
    return `/api/v1/media/${auth.user.photo}`;
  }
  return "/api/v1/media/default.png";
});
</script>
