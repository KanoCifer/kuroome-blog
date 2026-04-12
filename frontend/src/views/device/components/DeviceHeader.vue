<template>
  <header
    class="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 px-4 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85"
  >
    <div class="mx-auto w-full max-w-6xl">
      <div class="flex items-start justify-between gap-3">
        <div class="ml-12 space-y-1">
          <h1 class="mt-2 font-serif text-2xl font-semibold text-gray-900 text-shadow-lg dark:text-white">
            DeviceTracker
          </h1>
        </div>
        <button
          type="button"
          @click="handleBack"
          class="min-h-11 rounded-2xl bg-blue-900 px-6 text-sm font-medium text-white shadow-md shadow-blue-500/50 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700"
        >
          返回
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function handleBack() {
  router.back();
}
</script>
