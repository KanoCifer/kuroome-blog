<template>
  <AnimatePresence>
    <motion.div
      v-if="isVisible"
      :initial="{ y: 100, opacity: 0 }"
      :animate="{ y: 0, opacity: 1 }"
      :exit="{ y: 100, opacity: 0 }"
      :transition="{ type: 'spring', stiffness: 400, damping: 30 }"
      class="fixed right-0 bottom-0 left-0 z-[9999] md:hidden"
    >
      <nav
        class="pb-safe flex w-full items-center justify-around rounded-t-[3rem] bg-white/80 px-8 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-2xl dark:bg-gray-800/80"
      >
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group flex flex-col items-center gap-1"
        >
          <!-- Active State -->
          <div
            v-if="isActive(item.to)"
            class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/80 to-blue-700/80 text-white shadow-lg shadow-blue-500/30 transition-all active:scale-90"
          >
            <span
              class="material-symbols-outlined"
              style="font-variation-settings: &quot;FILL&quot; 1"
              >{{ item.icon }}</span
            >
          </div>
          <!-- Inactive State -->
          <div
            v-else
            class="flex h-12 w-12 items-center justify-center text-slate-600 transition-all hover:scale-110 active:scale-90 dark:text-slate-300"
          >
            <span class="material-symbols-outlined">{{ item.icon }}</span>
          </div>
          <span
            class="font-['Inter'] text-[10px] font-medium"
            :class="
              isActive(item.to)
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            "
            >{{ item.label }}</span
          >
        </RouterLink>
      </nav>
    </motion.div>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { AnimatePresence, motion } from "motion-v";

const props = defineProps<{
  isEntryView?: boolean;
  isVisible?: boolean;
}>();

const isVisible = computed(() =>
  props.isVisible !== undefined ? props.isVisible : !props.isEntryView,
);

const route = useRoute();

// Mapping logic to proper routes
const navItems = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/messages", label: "Chats", icon: "chat_bubble" },
  { to: "/changelog", label: "Logs", icon: "auto_stories" },
  { to: "/toolbox/image-toolbox", label: "More", icon: "more_horiz" },
];

const isActive = (path: string) => {
  if (path === "/") {
    return route.path === "/";
  }
  return route.path.startsWith(path);
};
</script>
