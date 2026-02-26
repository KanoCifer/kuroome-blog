<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink, RouterView } from "vue-router";

// Static assets from public directory
const githubLogo = "/images/github.webp";

import BackToTop from "@/components/BackToTop.vue";
import MemoModal from "@/components/MemoModal.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import ToastContainer from "@/components/ToastContainer.vue";
import { useAuthStore } from "@/stores/auth";

// Route and authentication state

const auth = useAuthStore();

// Dropdown state
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

// Navigation scroll behavior
const isHeaderVisible = ref(true);
const lastScrollY = ref(0);
const headerThreshold = 800; // 滚动超过这个值后隐藏

const handleScroll = () => {
  const currentScrollY = window.scrollY;

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
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleResize);
  // 初始化时检查窗口大小
  handleResize();
  lastScrollY.value = window.scrollY;
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", handleResize);
});

const currentUserName = computed(() => auth.user?.name || "未登录");
const avatarUrl = computed(() => {
  if (auth.user?.photo) {
    return `/api/v1/media/${auth.user.photo}`;
  }
  return "/api/v1/media/default.png";
});

// 移动端适配弹窗状态
const isMobileWarningVisible = ref(false);

// 检测移动设备宽度的响应式状态
const isMobileDevice = ref(false);

// 处理窗口大小变化
const handleResize = () => {
  isMobileDevice.value = window.innerWidth < 768;
  // 在移动设备上显示弹窗
  if (isMobileDevice.value && !isMobileWarningVisible.value) {
    isMobileWarningVisible.value = true;
    isVideoEnabled.value = false; // 移动设备默认不播放视频
  }
};

// 关闭移动设备警告
const closeMobileWarning = () => {
  isMobileWarningVisible.value = false;
};

// 1. 用 ref 获取视频 DOM 元素的引用
const videoRef = ref<HTMLVideoElement | null>(null);

// 视频播放状态：true 表示允许播放（包括自动和手动），false 表示用户手动暂停/移动设备不播放
const isVideoEnabled = ref(true);

// IntersectionObserverEntry 类型接口
interface MyIntersectionObserverEntry {
  isIntersecting: boolean;
}

// IntersectionObserverCallback 类型接口
interface MyIntersectionObserverCallback {
  (
    entries: MyIntersectionObserverEntry[],
    observer: IntersectionObserver,
  ): void;
}

// 存储 IntersectionObserver 实例，用于后续销毁
let observer: IntersectionObserver | null = null;

// 2. 处理页面可见性切换的回调
const handleVisibilityChange = (): void => {
  if (!videoRef.value) return;
  // 只有在用户允许播放的情况下才自动控制
  if (isVideoEnabled.value) {
    if (document.hidden) {
      // 页面不可见时暂停
      videoRef.value.pause();
    } else {
      // 页面可见时恢复播放（静默捕获自动播放异常）
      videoRef.value.play().catch(() => {});
    }
  }
};

// 手动切换视频播放/暂停
const toggleVideoPlayback = (): void => {
  if (!videoRef.value) return;

  isVideoEnabled.value = !isVideoEnabled.value;

  if (isVideoEnabled.value) {
    // 用户开启播放：如果页面可见则播放
    if (!document.hidden) {
      videoRef.value.play().catch(() => {});
    }
  } else {
    // 用户暂停播放：直接暂停
    videoRef.value.pause();
  }
};

// 3. 处理元素进入/离开视口的回调
const handleIntersection: MyIntersectionObserverCallback = (entries) => {
  if (!videoRef.value) return;
  // 只有在用户允许播放的情况下才自动控制
  if (isVideoEnabled.value) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // 进入视口时播放
        videoRef.value?.play().catch(() => {});
      } else {
        // 离开视口时暂停
        videoRef.value?.pause();
      }
    });
  }
};

// 4. 组件挂载时初始化监听
onMounted((): void => {
  // 确保视频元素已挂载
  if (!videoRef.value) return;

  // 监听页面可见性变化
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // 初始化 IntersectionObserver，监听元素是否在视口内
  // threshold: 0.1 表示元素露出 10% 时触发回调
  observer = new IntersectionObserver(handleIntersection, { threshold: 0.1 });
  observer.observe(videoRef.value);
});

// 5. 组件卸载时清理监听，避免内存泄漏
onUnmounted((): void => {
  // 移除页面可见性监听
  document.removeEventListener("visibilitychange", handleVisibilityChange);

  // 销毁 IntersectionObserver
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<template>
  <div
    class="grid min-h-svh grid-rows-[auto_1fr_auto] text-gray-800 dark:text-gray-200"
  >
    <!-- Video Background with fallback image -->
    <div class="fixed inset-0 -z-50">
      <video
        ref="videoRef"
        class="bg-video -z-9999 h-full w-full transform-gpu object-cover"
        autoplay
        muted
        playsinline
        poster="/poster.png"
        loading="lazy"
        preload="metadata"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      >
        <source src="/bg_av1.mp4" type="video/mp4" />
      </video>
    </div>
    <!-- Header -->
    <header>
      <div class="mx-auto mt-6">
        <Teleport to="body">
          <!-- Toasts -->
          <ToastContainer />
        </Teleport>

        <!-- Navigation -->
        <div
          class="group fixed right-4 left-4 z-50 mt-2 transform-gpu transition-transform duration-300"
          :class="{ '-translate-y-[calc(100%+2rem)]': !isHeaderVisible }"
        >
          <nav
            class="mx-auto max-w-7xl transform-gpu backdrop-blur-sm transition-transform hover:scale-[1.01]"
          >
            <ul class="flex items-center justify-end-safe font-medium">
              <!-- Navigation Dropdown on Blog Title -->
              <li
                ref="dropdownRef"
                class="relative mr-auto ml-8"
                @mouseenter="openDropdown"
                @mouseleave="closeDropdown"
              >
                <button
                  @click="toggleDropdown"
                  class="flex cursor-pointer items-center gap-1"
                >
                  <span
                    class="shrink-0 font-serif text-2xl font-bold text-gray-700 text-shadow-lg hover:text-blue-600 dark:text-gray-300 dark:text-shadow-lg"
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
                  enter-active-class="transition-all transform-gpu duration-200 ease-out"
                  enter-from-class="opacity-0 scale-95 -translate-y-1"
                  enter-to-class="opacity-100 scale-100 translate-y-0"
                  leave-active-class="transition-all transform-gpu duration-150 ease-in"
                  leave-from-class="opacity-100 scale-100 translate-y-0"
                  leave-to-class="opacity-0 scale-95 -translate-y-1"
                >
                  <div
                    v-if="isDropdownOpen"
                    class="absolute top-full z-9999 mt-2 w-fit rounded-xl border border-gray-200/60 bg-gray-50 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-50/5"
                  >
                    <ol class="flex justify-center gap-6 px-4 py-2">
                      <li>
                        <RouterLink
                          to="/"
                          @click="closeDropdown"
                          class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <!-- Home Icon -->
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                          </svg>
                          Home
                        </RouterLink>
                      </li>
                      <li>
                        <RouterLink
                          to="/blog"
                          @click="closeDropdown"
                          class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <!-- Blog Icon -->
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                            />
                          </svg>
                          Blog
                        </RouterLink>
                      </li>
                      <li>
                        <RouterLink
                          to="/bookshelf"
                          @click="closeDropdown"
                          class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <!-- Projects Icon -->
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="size-6"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                            />
                          </svg>

                          Bookshelf
                        </RouterLink>
                      </li>
                      <li>
                        <RouterLink
                          to="/changelog"
                          @click="closeDropdown"
                          class="flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <!-- Changelog Icon -->
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Changelog
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
                  <svg
                    v-else
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span class="shrink-0 overflow-hidden">{{
                    currentUserName
                  }}</span>
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
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
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
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
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
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
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
                        <li
                          class="border-t border-gray-200 dark:border-gray-700"
                        >
                          <button
                            @click.prevent="handleLogout"
                            :disabled="auth.loading"
                            class="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-serif font-bold text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                          >
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
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
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
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
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
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
              <li class="relative ml-2 flex items-center">
                <button
                  @click="toggleVideoPlayback"
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100/50 text-gray-700 transition-colors hover:bg-gray-200/70 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700/70"
                  :title="isVideoEnabled ? '暂停背景视频' : '播放背景视频'"
                >
                  <!-- 播放图标 -->
                  <svg
                    v-if="!isVideoEnabled"
                    class="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <!-- 暂停图标 -->
                  <svg
                    v-else
                    class="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="mx-auto mt-25 w-full max-w-7xl rounded-3xl p-4">
      <RouterView v-slot="{ Component }">
        <transition
          mode="out-in"
          enter-active-class="transition-all transform-gpu duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-20"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all transform-gpu duration-300 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-20"
        >
          <KeepAlive :include="['MessageManageView']">
            <component :is="Component" :key="$route.fullPath" />
          </KeepAlive>
        </transition>

        <!-- 路由出口 -->
      </RouterView>
    </main>

    <!-- Footer -->
    <footer>
      <p>Copyright &copy; 2026 All Rights Reserved.</p>
      <div class="flex items-end justify-center">
        <a
          href="https://github.com/KanoCifer/Flask-Example"
          aria-label="Kuroome on GitHub"
          class="hover:opacity-90"
          target="_blank"
        >
          <img
            alt="Powered by Flask"
            :src="githubLogo"
            class="cover aspect-square w-6 object-cover align-bottom"
          />
        </a>
        <a
          class="text-gray-400 hover:underline"
          href="https://github.com/KanoCifer/Flask-Example "
          target="_blank"
          >&nbsp;Github: KanoCifer</a
        >
        <a
          class="text-gray-400 hover:underline"
          href="https://beian.miit.gov.cn/#/Integrated/index"
          target="_blank"
          >&nbsp;粤ICP备2026018113号</a
        >
      </div>
    </footer>

    <!-- Back to Top Button -->
    <BackToTop />

    <!-- 移动端适配警告弹窗 -->
    <Teleport to="body">
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isMobileWarningVisible"
          class="fixed inset-0 z-9999 flex items-center justify-center"
        >
          <!-- 背景遮罩 -->
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            @click="closeMobileWarning"
          ></div>

          <!-- 弹窗内容 -->
          <div
            class="relative z-10 w-11/12 max-w-md transform-gpu rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-800"
          >
            <!-- 警告图标 -->
            <div class="mb-6 flex justify-center">
              <div
                class="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              >
                <svg
                  class="h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <!-- 标题 -->
            <h2
              class="mb-4 text-center font-serif text-2xl font-bold text-gray-800 dark:text-gray-200"
            >
              暂未适配移动端
            </h2>

            <!-- 说明文字 -->
            <p class="mb-8 text-center text-gray-600 dark:text-gray-400">
              为了获得最佳体验，请使用桌面设备访问本网站。
              移动端功能正在开发中，敬请期待！
            </p>

            <!-- 确认按钮 -->
            <button
              @click="closeMobileWarning"
              class="w-full transform-gpu rounded-xl bg-blue-600 py-4 font-serif text-lg font-bold text-white transition-all hover:scale-[1.02] hover:bg-blue-700 active:scale-[0.98] dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              知道了
            </button>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
