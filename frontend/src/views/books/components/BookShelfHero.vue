<template>
  <div class="relative h-[40vh] flex-shrink-0 overflow-hidden md:h-[45vh]">
    <img src="/card/card-1.jpeg" alt="" class="h-full w-full object-cover" />
    <div
      class="from-background/40 via-background/5 to-background/40 pointer-events-none absolute inset-0 bg-gradient-to-b"
    />

    <!-- Back Button -->
    <div
      class="absolute top-0 right-0 left-0 z-10 flex items-center px-4 py-4 md:px-6"
    >
      <button
        type="button"
        class="border-border bg-card/60 hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors"
        @click="handleBack"
        aria-label="返回"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="text-foreground h-5 w-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
      </button>
    </div>

    <!-- Sync Button -->
    <div
      class="absolute top-0 right-0 z-10 flex items-center px-4 py-4 md:px-6"
    >
      <button
        type="button"
        class="border-border bg-card/60 hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors disabled:opacity-50"
        :disabled="isSyncing"
        @click="$emit('sync')"
        aria-label="同步书架"
      >
        <CloudSync
          class="text-foreground h-5 w-5"
          :class="{ 'animate-breathe': isSyncing }"
        />
      </button>
    </div>

    <!-- Title Overlay(标题区:给 ribbon 让出底部 56px 空间) -->
    <div
      class="absolute right-0 bottom-14 left-0 z-10 px-6 md:bottom-16 md:px-10"
    >
      <h1
        class="font-serif text-3xl font-bold text-white drop-shadow-lg md:text-5xl"
      >
        我的书架
      </h1>
      <div class="mt-2 flex items-center gap-3">
        <span class="text-sm text-white/75 md:text-base">微信读书</span>
        <span class="h-1 w-1 rounded-full bg-white/40" />
        <span
          v-if="bookCount !== null"
          class="text-sm text-white/75 md:text-base"
          >{{ bookCount }} 本书</span
        >
      </div>
    </div>

    <!-- Ribbon slot(贴 hero 底部) -->
    <div class="absolute right-0 bottom-0 left-0 z-10">
      <slot name="ribbon" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CloudSync } from '@lucide/vue';
import { useRouter } from 'vue-router';

defineProps<{
  bookCount: number | null;
  isSyncing: boolean;
}>();

defineEmits<{
  (e: 'sync'): void;
}>();

const router = useRouter();

const handleBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
};
</script>
