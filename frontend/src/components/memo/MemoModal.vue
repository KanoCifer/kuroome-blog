<script setup lang="ts">
import { ref } from 'vue';

import IconMemo from '@/components/icons/IconMemo.vue';
import { useStorage } from '@vueuse/core';

const isMemoOpen = ref(false);

const STORAGE_KEY = 'readinglist_memo';

const memoText = useStorage(STORAGE_KEY, '');
const toggleMemo = () => {
  isMemoOpen.value = !isMemoOpen.value;
};

const closeMemo = () => {
  isMemoOpen.value = false;
};

const clearMemo = () => {
  if (memoText.value && confirm('确定要清空备忘录吗？')) {
    memoText.value = null;
  }
};
</script>

<template>
  <button
    @click="toggleMemo"
    class="bg-muted/50 text-foreground hover:bg-muted/70 dark:bg-background/50 dark:text-foreground dark:hover:bg-muted/70 flex h-9 w-9 items-center justify-center rounded-full transition-colors"
    title="备忘录"
  >
    <IconMemo class="h-4 w-4" />
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
          class="bg-background dark:bg-background relative z-10 w-11/12 max-w-lg transform-gpu rounded-3xl p-6 shadow-2xl"
        >
          <!-- Close button -->
          <button
            @click="closeMemo"
            class="text-muted-foreground hover:bg-muted hover:text-secondary-foreground dark:hover:bg-muted dark:hover:text-foreground absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
            class="text-foreground dark:text-foreground mb-4 flex items-center gap-2 font-serif text-xl font-bold"
          >
            <IconMemo class="h-5 w-5" />
            备忘录
          </h3>

          <!-- Textarea -->
          <textarea
            v-model="memoText"
            placeholder="在这里写下你的想法..."
            class="border-border bg-muted text-foreground placeholder-muted-foreground focus:border-ring focus:ring-ring dark:border-border dark:bg-background dark:text-foreground dark:placeholder-muted-foreground mb-4 w-full resize-none rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
            rows="10"
          ></textarea>

          <!-- Footer -->
          <div class="flex items-center justify-between">
            <span
              class="text-muted-foreground dark:text-muted-foreground text-xs"
            >
              自动保存
              <span v-if="memoText" class="ml-2">{{ memoText.length }} 字</span>
            </span>
            <button
              @click="clearMemo"
              class="border-border bg-muted text-secondary-foreground hover:bg-muted hover:text-foreground dark:border-border dark:bg-background dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
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
</template>
