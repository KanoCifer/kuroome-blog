<script setup lang="ts">
import { onMounted, ref } from 'vue';

import IconMemo from '@/components/icons/IconMemo.vue';

const memoText = ref('');
const STORAGE_KEY = 'readinglist_memo_sidebar';

const saveMemo = () => {
  localStorage.setItem(STORAGE_KEY, memoText.value);
};

const clearMemo = () => {
  if (memoText.value && confirm('确定要清空备忘录吗？')) {
    memoText.value = '';
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
    class="border-border bg-card/80 dark:border-border dark:bg-card/80 rounded-3xl border p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md"
  >
    <div class="mb-3 flex items-center gap-2">
      <IconMemo
        class="text-secondary-foreground dark:text-foreground h-4 w-4"
      />
      <h3
        class="text-muted-foreground text-xs font-bold tracking-wider uppercase"
      >
        备忘录
      </h3>
    </div>
    <textarea
      v-model="memoText"
      @input="saveMemo"
      placeholder="在这里写下你的想法..."
      class="border-border bg-muted text-foreground placeholder-muted-foreground focus:border-ring focus:ring-ring dark:border-border dark:bg-card dark:text-foreground dark:placeholder-muted-foreground mb-3 w-full resize-none rounded-xl border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
      rows="6"
    ></textarea>
    <div class="flex items-center justify-between">
      <span
        class="text-muted-foreground dark:text-muted-foreground text-[10px]"
      >
        自动保存
        <span v-if="memoText" class="ml-1">{{ memoText.length }} 字</span>
      </span>
      <button
        @click="clearMemo"
        class="border-border bg-muted text-secondary-foreground hover:bg-accent hover:text-foreground dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors"
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
