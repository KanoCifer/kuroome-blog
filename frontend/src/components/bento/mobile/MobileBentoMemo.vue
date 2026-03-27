<script setup lang="ts">
import { ref } from "vue";

import IconMemo from "@/components/icons/IconMemo.vue";
import { useStorage } from "@vueuse/core";
import { motion } from "motion-v";
const isMemoOpen = ref(false);

const STORAGE_KEY = "readinglist_memo";

const memoText = useStorage(STORAGE_KEY, "");
const toggleMemo = () => {
  isMemoOpen.value = !isMemoOpen.value;
};

const closeMemo = () => {
  isMemoOpen.value = false;
};

const clearMemo = () => {
  if (memoText.value && confirm("确定要清空备忘录吗？")) {
    memoText.value = null;
  }
};
</script>

<template>
  <motion.div
    :whileHover="{ scale: 1.02 }"
    :whilePress="{ scale: 0.98 }"
    class="glass-card squircle flex aspect-square cursor-pointer flex-col justify-between border border-white/40 bg-white/50 p-6 shadow-[0_20px_40px_rgba(21,28,39,0.06)] max-sm:aspect-auto max-sm:h-40 dark:border-white/10 dark:bg-slate-800/40 dark:shadow-none"
    @click="toggleMemo"
  >
    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
      <IconMemo class="size-6 text-amber-600 dark:text-amber-400" />
    </div>
    <div>
      <h5 class="text-sm font-bold text-slate-800 dark:text-slate-100">Quick Memo</h5>
      <p class="mt-1 line-clamp-2 text-[11px] leading-tight text-slate-600 dark:text-slate-400">
        {{ memoText ? memoText : "Tap to write down your thoughts..." }}
      </p>
    </div>

    <!-- Memo Modal -->
    <Teleport to="body">
      <transition
        enter-active-class="transition-all transition-gpu transition-discrete duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all transition-gpu transition-discrete duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isMemoOpen"
          class="fixed inset-0 z-9999 flex items-center justify-center"
          @click.stop="closeMemo"
        >
          <!-- Background overlay -->
          <div
            class="background-overlay absolute inset-0 bg-black/60 backdrop-blur-sm transition-all"
          ></div>

          <!-- Modal content -->
          <div
            class="relative z-10 w-11/12 max-w-lg transform-gpu rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            @click.stop
          >
            <!-- Close button -->
            <button
              @click="closeMemo"
              class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <!-- Header -->
            <h3
              class="mb-4 flex items-center gap-2 font-serif text-xl font-bold text-gray-800 dark:text-white"
            >
              <IconMemo class="size-5" />
              Quick Memo
            </h3>

            <!-- Textarea -->
            <textarea
              v-model="memoText"
              placeholder="在这里写下你的想法..."
              class="mb-4 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
              rows="10"
            ></textarea>

            <!-- Footer -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 dark:text-gray-400">
                自动保存
                <span v-if="memoText" class="ml-2">{{ memoText.length }} 字</span>
              </span>
              <button
                @click="clearMemo"
                class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                清空
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </motion.div>
</template>

<style scoped>
.glass-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
</style>
