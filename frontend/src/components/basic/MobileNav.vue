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
              <IconBookshelf class="h-6 w-6 text-orange-500" />
            </div>
            <span class="text-xs font-bold">Bookshelf</span>
          </button>

          <!-- Messages -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/messages')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <IconMessages class="h-6 w-6 text-emerald-500" />
            </div>
            <span class="text-xs font-bold">Messages</span>
          </button>

          <!-- Analytics -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/analytics')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
              <IconAnalytics class="h-6 w-6 text-cyan-500" />
            </div>
            <span class="text-xs font-bold">Analytics</span>
          </button>

          <!-- Import Books -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/import')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
              <IconImport class="h-6 w-6 text-indigo-500" />
            </div>
            <span class="text-xs font-bold">Import</span>
          </button>

          <!-- Settings -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/settings')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <IconSettings class="h-6 w-6 text-blue-500" />
            </div>
            <span class="text-xs font-bold">Settings</span>
          </button>

          <!-- Theme -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="toggleTheme"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
              <IconTheme class="h-6 w-6 text-purple-500" />
            </div>
            <span class="text-xs font-bold">Theme</span>
          </button>

          <!-- About -->
          <button
            class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
            @click="handleNav('/about')"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <IconAbout class="h-6 w-6 text-amber-500" />
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
                <IconLogin class="h-6 w-6 text-green-500" />
              </div>
              <span class="text-xs font-bold">Login</span>
            </button>

            <!-- Register -->
            <button
              class="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
              @click="handleNav('/register')"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <IconRegister class="h-6 w-6 text-blue-500" />
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
                <IconLogout class="h-6 w-6 text-red-500" />
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
        <IconPlus class="h-6 w-6" />
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
import IconBookshelf from "./icon/IconBookshelf.vue";
import IconMessages from "./icon/IconMessages.vue";
import IconAnalytics from "./icon/IconAnalytics.vue";
import IconImport from "./icon/IconImport.vue";
import IconSettings from "./icon/IconSettings.vue";
import IconTheme from "./icon/IconTheme.vue";
import IconAbout from "./icon/IconAbout.vue";
import IconLogin from "./icon/IconLogin.vue";
import IconRegister from "./icon/IconRegister.vue";
import IconLogout from "./icon/IconLogout.vue";
import IconPlus from "./icon/IconPlus.vue";

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
