<script setup lang="ts">
import IconClose from "@/components/icons/IconClose.vue";
import IconInfo from "@/components/icons/IconInfo.vue";
import IconWarning from "@/components/icons/IconWarning.vue";
import { useNotificationStore } from "@/stores/notification";
import { AnimatePresence, motion } from "motion-v";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Vue3Lottie } from "vue3-lottie";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const successAnimationData = ref<Record<string, any> | null>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorAnimationData = ref<Record<string, any> | null>(null);

onMounted(async () => {
  successAnimationData.value = (await import("@/assets/success.json")).default;
  errorAnimationData.value = (await import("@/assets/error.json")).default;
});
onUnmounted(() => {
  successAnimationData.value = null;
  errorAnimationData.value = null;
});
const store = useNotificationStore();
const toasts = computed(() => store.toasts);

function getIconForType(t: string) {
  switch (t) {
    case "success":
      return "success-lottie";
    case "error":
      return "error-lottie";
    case "warning":
      return IconWarning;
    default:
      return IconInfo;
  }
}

function classForType(t: string) {
  switch (t) {
    case "success":
      return "border-l-4 border-green-500";
    case "error":
      return "border-l-4 border-red-500";
    case "warning":
      return "border-l-4 border-yellow-500";
    default:
      return "border-l-4 border-blue-500";
  }
}

function iconColorForType(t: string) {
  switch (t) {
    case "success":
      return "text-green-500";
    case "error":
      return "text-red-500";
    case "warning":
      return "text-yellow-500";
    default:
      return "text-blue-500";
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
</script>

<template>
  <div
    class="fixed top-4 left-1/2 z-9999 w-full max-w-md -translate-x-1/2 sm:w-96"
    style="perspective: 1000px"
  >
    <AnimatePresence mode="popLayout">
      <motion.div
        v-for="(t, i) in toasts"
        :key="t.id"
        :initial="{ opacity: 0, y: -40, scale: 0.9 }"
        :animate="{
          opacity:
            toasts.length - 1 - i >= 3 ? 0 : 1 - (toasts.length - 1 - i) * 0.15,
          y: (toasts.length - 1 - i) * 16,
          scale: 1 - (toasts.length - 1 - i) * 0.05,
          zIndex: i,
          pointerEvents: toasts.length - 1 - i >= 3 ? 'none' : 'auto',
        }"
        :exit="{ opacity: 0, y: -40, scale: 0.9 }"
        :transition="{ type: 'spring', damping: 30, stiffness: 500 }"
        :class="[
          'squircle absolute top-0 left-0 flex w-full items-center gap-3 border border-slate-200/20 bg-white/80 text-slate-900 shadow-xl backdrop-blur-sm transition-colors duration-200 dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-100',
          classForType(t.type),
        ]"
      >
        <div class="flex w-full items-center gap-3 p-4">
          <component
            v-if="
              getIconForType(t.type) !== 'success-lottie' &&
              getIconForType(t.type) !== 'error-lottie'
            "
            :is="getIconForType(t.type)"
            :class="['mt-0.5 shrink-0', iconColorForType(t.type)]"
          />
          <Vue3Lottie
            v-else-if="
              getIconForType(t.type) === 'success-lottie' &&
              successAnimationData
            "
            :animationData="successAnimationData"
            :height="40"
            :width="40"
            :loop="true"
            :autoPlay="true"
            class="shrink-0"
          />
          <Vue3Lottie
            v-else-if="
              getIconForType(t.type) === 'error-lottie' && errorAnimationData
            "
            :animationData="errorAnimationData"
            :height="40"
            :width="40"
            :loop="false"
            :autoPlay="true"
            class="shrink-0"
          />
          <div class="flex-1 text-sm">
            <div class="font-semibold text-slate-900 dark:text-gray-100">
              {{ capitalize(t.type) }}
            </div>
            <div class="mt-0.5 leading-snug text-slate-600 dark:text-gray-100">
              {{ t.message }}
            </div>
          </div>
          <button
            class="mr-2 shrink-0 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            @click="() => store.dismiss(t.id)"
            aria-label="dismiss"
          >
            <IconClose />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
</template>
