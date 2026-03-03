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
    :initial="{ scale: 0 }"
    :animate="{ scale: 1 }"
    :transition="{ type: 'spring', duration: 0.8 }"
    :while-hover="{ scale: 1.05 }"
    :while-press="{ scale: 0.9 }"
    class="w-auto"
  >
    <button
      @click="toggleMemo"
      class="squircle flex w-auto items-center justify-center border border-white/60 bg-gray-50/50 px-6 py-4 text-gray-700 shadow-sm ring ring-gray-50 backdrop-blur-sm transition-colors dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-50 dark:ring-gray-600"
      title="备忘录"
    >
      <IconMemo class="mr-2 size-8" />
      备忘录
    </button>

    <!-- Memo Modal -->
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
          v-if="isMemoOpen"
          class="fixed inset-0 z-9999 flex items-center justify-center"
          @click.self="closeMemo"
        >
          <!-- Background overlay -->
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

          <!-- Modal content -->
          <div
            class="relative z-10 w-11/12 max-w-lg transform-gpu rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-800"
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
              备忘录
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
