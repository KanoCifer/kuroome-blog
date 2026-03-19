<template>
  <!-- Navigation -->
  <AnimatePresence>
    <motion.div
      v-if="!isEntryView"
      v-show="isHeaderVisible"
      :initial="{ opacity: 0, y: -100, scale: 0.95 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :exit="{ opacity: 0, y: -100, scale: 0.95 }"
      :transition="{ type: 'spring' }"
      class="group fixed right-4 left-4 z-50 mt-2"
    >
      <nav class="squircle mx-auto max-w-4xl transform-gpu transition-transform hover:scale-[1.01]">
        <ul class="squircle flex items-center justify-end-safe font-medium">
          <!-- Navigation Dropdown on Blog Title -->
          <li
            ref="dropdownRef"
            class="relative mr-auto ml-8"
            @mouseenter="openDropdown"
            @mouseleave="closeDropdown"
          >
            <button @click="toggleDropdown" class="flex cursor-pointer items-center gap-1">
              <span
                class="shrink-0 font-serif text-2xl font-bold text-gray-700 text-shadow-lg hover:text-blue-600 max-sm:hidden dark:text-gray-300 dark:text-shadow-lg"
              >
                Kuroome's Blog
              </span>
              <svg
                class="h-3 w-3 transform-gpu text-gray-700 transition-transform"
                :class="{ 'rotate-180': isDropdownOpen }"
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
            </button>

            <!-- Dropdown Menu -->
            <transition
              enter-active-class="transition-all transform-gpu duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              enter-from-class="opacity-0 scale-95 -translate-y-4"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition-all transform-gpu duration-200 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-4"
            >
              <div
                v-if="isDropdownOpen"
                class="squircle absolute top-full left-0 z-9999 mt-4 w-72 rounded-[40px] border border-white/50 bg-white/80 p-6 shadow-xl dark:border-gray-700/50 dark:bg-gray-800/80"
              >
                <!-- 用户信息区 -->
                <div class="mb-8 flex items-center gap-4 px-2">
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
                    <span class="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100">
                      {{ currentUserName }}
                    </span>
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
                      @click="closeDropdown"
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
                      @click="closeDropdown"
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
                      @click="closeDropdown"
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
                      @click="closeDropdown"
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
                      @click="closeDropdown"
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
                </ol>
              </div>
            </transition>
          </li>
          <li>
            <MemoModal />
          </li>
          <!-- 用户下拉菜单 User Menu Dropdown -->
          <li
            ref="userMenuRef"
            class="relative"
            @mouseenter="openUserMenu"
            @mouseleave="closeUserMenu"
          >
            <button
              class="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 font-serif text-lg font-bold text-gray-600 no-underline transition-colors text-shadow-xs hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              @click="toggleUserMenu"
            >
              <!-- 已登录显示头像，未登录显示默认图标 -->
              <img
                v-if="auth.isAuthenticated && auth.user?.photo"
                :src="avatarUrl"
                :alt="currentUserName"
                class="h-6 w-6 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
              />
              <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span class="shrink-0 overflow-hidden max-sm:hidden">{{ currentUserName }}</span>
              <svg
                class="h-3 w-3 transform-gpu transition-transform"
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
            </button>

            <!-- User Menu Dropdown -->
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
                class="absolute top-full right-0 z-9999 mt-2 w-auto rounded-xl border border-gray-200/60 bg-gray-50 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-50/5"
              >
                <ol>
                  <template v-if="auth.isAuthenticated">
                    <li>
                      <RouterLink
                        to="/settings"
                        @click="closeUserMenuImmediately"
                        class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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
                        class="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-serif font-bold text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
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
                        class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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
                        class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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
          </li>
          <li>
            <RouterLink to="/about">About</RouterLink>
          </li>

          <li class="relative flex items-center">
            <ThemeToggle />
          </li>
        </ul>
      </nav>
    </motion.div>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import ThemeToggle from "@/components/layout/ThemeToggle.vue";
import MemoModal from "@/components/memo/MemoModal.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

const props = defineProps<{
  isHeaderVisible: boolean;
  isVideoEnabled?: boolean;
  isEntryView?: boolean;
}>();

watch(
  () => props.isHeaderVisible,
  (visible) => {
    if (!visible) {
      isDropdownOpen.value = false;
      isUserMenuOpen.value = false;
    }
  },
);

// Dropdown state - internal ref for self-contained behavior
const isDropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
let closeTimeout: ReturnType<typeof setTimeout> | null = null;

// User menu dropdown state
const isUserMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
let userMenuCloseTimeout: ReturnType<typeof setTimeout> | null = null;

// Open dropdown
const openDropdown = () => {
  // 清除关闭延迟，避免快速移动时闪烁
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  isDropdownOpen.value = true;
};

// Close dropdown with delay
const closeDropdown = () => {
  // 延迟关闭，给用户时间移动到菜单上
  closeTimeout = setTimeout(() => {
    isDropdownOpen.value = false;
  }, 150);
};

// Toggle dropdown (for click)
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

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

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
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

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && dropdownRef.value.contains(event.target as Node)) {
    return;
  }
  if (userMenuRef.value && userMenuRef.value.contains(event.target as Node)) {
    return;
  }
  isDropdownOpen.value = false;
  isUserMenuOpen.value = false;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    isDropdownOpen.value = false;
    isUserMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
  if (closeTimeout) {
    clearTimeout(closeTimeout);
  }
  if (userMenuCloseTimeout) {
    clearTimeout(userMenuCloseTimeout);
  }
});

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
