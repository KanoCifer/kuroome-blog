<script setup lang="ts">
import { onMounted, ref } from "vue";

import IconMemo from "@/components/icons/IconMemo.vue";

const memoText = ref("");
const STORAGE_KEY = "readinglist_memo_sidebar";

const saveMemo = () => {
  localStorage.setItem(STORAGE_KEY, memoText.value);
};

const clearMemo = () => {
  if (memoText.value && confirm("确定要清空备忘录吗？")) {
    memoText.value = "";
    localStorage.removeItem(STORAGE_KEY);
  }
};

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    memoText.value = saved;
  }
});
</script>

<template>
  <div
    class="rounded-3xl border border-gray-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80"
  >
    <div class="mb-3 flex items-center gap-2">
      <IconMemo class="h-4 w-4 text-gray-600 dark:text-gray-300" />
      <h3 class="text-xs font-bold tracking-wider text-gray-400 uppercase">
        备忘录
      </h3>
    </div>
    <textarea
      v-model="memoText"
      @input="saveMemo"
      placeholder="在这里写下你的想法..."
      class="mb-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
      rows="6"
    ></textarea>
    <div class="flex items-center justify-between">
      <span class="text-[10px] text-gray-500 dark:text-gray-400">
        自动保存
        <span v-if="memoText" class="ml-1">{{ memoText.length }} 字</span>
      </span>
      <button
        @click="clearMemo"
        class="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 0 00-1-1h-4a1 0 00-1 1v3M4 7h16"
          />
        </svg>
        清空
      </button>
    </div>
  </div>
</template>
