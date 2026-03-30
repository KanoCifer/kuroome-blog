<template>
  <!-- Backdrop Overlay -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showMoreMenu"
        class="fixed inset-0 z-59 bg-black/20 backdrop-blur-[2px]"
        @click="showMoreMenu = false"
      />
    </Transition>
  </Teleport>

  <!-- More Menu Bottom Sheet -->
  <Teleport to="body">
    <Transition
      mode="out-in"
      enter-active-class="animate-bounce-in"
      enter-from-class="opacity-0 scale-95 translate-y-10"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-400 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-0 translate-y-10"
    >
      <div
        v-if="showMoreMenu"
        class="fixed right-4 bottom-22.5 left-4 z-60 max-h-[70vh] overflow-y-auto rounded-[2rem] border border-white/20 bg-white/80 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80"
      >
        <div class="grid grid-cols-3 gap-3">
          <!-- Bookshelf -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/bookshelf')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
              <svg
                class="h-6 w-6 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <span class="text-xs font-bold">Bookshelf</span>
          </button>

          <!-- Messages -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/messages')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <svg
                class="h-6 w-6 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <span class="text-xs font-bold">Messages</span>
          </button>

          <!-- Analytics -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/analytics')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
              <svg class="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <span class="text-xs font-bold">Analytics</span>
          </button>

          <!-- Import Books -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/import')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
              <svg
                class="h-6 w-6 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </div>
            <span class="text-xs font-bold">Import</span>
          </button>

          <!-- Settings -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/settings')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <svg class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span class="text-xs font-bold">Settings</span>
          </button>

          <!-- Theme -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="toggleTheme"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
              <svg
                class="h-6 w-6 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <span class="text-xs font-bold">Theme</span>
          </button>

          <!-- About -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/about')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <svg
                class="h-6 w-6 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span class="text-xs font-bold">About</span>
          </button>

          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/gallery')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
              <Image class="h-6 w-6 text-violet-500" />
            </div>
            <span class="text-xs font-bold">Gallery</span>
          </button>

          <!-- Login/Register or Logout -->
          <template v-if="!authStore.isAuthenticated">
            <!-- Login -->
            <button
              class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
              @click="handleNav('/login')"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <svg
                  class="h-6 w-6 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <span class="text-xs font-bold">Login</span>
            </button>

            <!-- Register -->
            <button
              class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
              @click="handleNav('/register')"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <svg
                  class="h-6 w-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <span class="text-xs font-bold">Register</span>
            </button>
          </template>
          <template v-else>
            <!-- Logout -->
            <button
              class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 text-red-500 transition-transform active:scale-95 dark:bg-white/5"
              @click="handleLogout"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <svg
                  class="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <span class="text-xs font-bold">Logout</span>
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <motion.nav
      id="mobile-nav"
      :initial="{ y: 10, opacity: 0 }"
      :animate="{ y: 0, opacity: 1 }"
      :exit="{ y: 10, opacity: 0 }"
      :transition="{ type: 'spring', damping: 20, stiffness: 300 }"
      class="fixed bottom-0 left-0 z-65 flex h-20 w-full items-center justify-around rounded-t-[2.5rem] bg-white/80 px-6 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:bg-slate-900/80 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]"
    >
      <!-- Home -->
      <div class="group flex flex-col items-center gap-0.5">
        <router-link
          to="/"
          active-class="rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-400/30"
          class="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:scale-110 hover:text-blue-500 active:scale-95 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <HomeIcon class="h-5 w-5" />
        </router-link>
        <span
          class="text-[10px] font-medium tracking-wide transition-colors duration-200"
          :class="route.path === '/' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'"
        >
          Home
        </span>
      </div>

      <!-- Blogs -->
      <div class="group flex flex-col items-center gap-0.5">
        <router-link
          to="/blog"
          active-class="rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-400/30"
          class="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:scale-110 hover:text-blue-500 active:scale-95 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <BlogIcon class="h-5 w-5" />
        </router-link>
        <span
          class="text-[10px] font-medium tracking-wide transition-colors duration-200"
          :class="route.path === '/blog' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'"
        >
          Blogs
        </span>
      </div>

      <!-- New Post Button -->
      <router-link
        to="/blog/new"
        class="-mt-10 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white/50 bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-xl shadow-blue-500/35 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/40 active:scale-95 dark:border-slate-800/50 dark:shadow-blue-400/30"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </router-link>

      <!-- RSS -->
      <div class="group flex flex-col items-center gap-0.5">
        <router-link
          to="/rss"
          active-class="rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-400/30"
          class="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:scale-110 hover:text-blue-500 active:scale-95 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <RssIcon class="h-5 w-5" />
        </router-link>
        <span
          class="text-[10px] font-medium tracking-wide transition-colors duration-200"
          :class="route.path === '/rss' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'"
        >
          RSS
        </span>
      </div>

      <!-- More -->
      <div class="group flex flex-col items-center gap-0.5">
        <button
          @click="showMoreMenu = !showMoreMenu"
          class="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
          :class="[
            showMoreMenu
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400',
            isMore
              ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-400/30'
              : 'bg-transparent',
          ]"
        >
          <IconMore class="h-5 w-5" />
        </button>
        <span
          class="text-[10px] font-medium tracking-wide transition-colors duration-200"
          :class="[showMoreMenu || isMore ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500']"
        >
          More
        </span>
      </div>
    </motion.nav>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { Image } from "lucide-vue-next";
import { motion } from "motion-v";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BlogIcon, HomeIcon, RssIcon } from "../icons";
import IconMore from "../icons/IconMore.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const showMoreMenu = ref<boolean>(false);
const theme = useThemeStore();

const isMore = computed(() => {
  return route.path === "/" || route.path === "/blog" || route.path === "/rss" ? false : true;
});

const handleNav = (path: string) => {
  showMoreMenu.value = false;
  router.push(path);
};

const handleLogout = () => {
  showMoreMenu.value = false;
  authStore.logout();
};

const toggleTheme = () => {
  theme.toggleTheme();
  showMoreMenu.value = false;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes bounce-in {
  0% {
    transform: scale(0.3) translateY(40px);
    opacity: 0;
  }
  50% {
    transform: scale(1.05) translateY(0);
    opacity: 1;
  }
  70% {
    transform: scale(0.95) translateY(0);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.animate-bounce-in {
  animation: bounce-in 0.5s ease-out;
}
</style>
