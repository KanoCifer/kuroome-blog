<template>
  <div class="min-h-screen px-4 py-16">
    <div
      class="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/20 bg-white/40 p-10 shadow-2xl dark:border-gray-700/30 dark:bg-gray-900/40"
      style="animation: fadeInUp 0.6s ease-out"
    >
      <!-- Header -->
      <div class="mb-12 text-center">
        <h1
          class="bg-linear-to-r from-blue-600 to-sky-600 bg-clip-text text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-transparent dark:from-blue-400 dark:to-sky-400"
        >
          Import Your Bookshelf
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Import your books from WeRead by providing your account cookie
        </p>
      </div>

      <!-- Form Section -->
      <form @submit.prevent="submitImport" class="space-y-6">
        <!-- Cookie Input -->
        <div class="space-y-2">
          <label for="weread_cookie" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            WeRead Cookie
          </label>
          <div class="relative">
            <textarea
              id="weread_cookie"
              v-model="weread_cookie"
              class="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
              rows="8"
              placeholder="Paste your WeRead cookie here..."
            />
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Your cookie will be saved locally in your browser for future use
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-2xl bg-linear-to-r from-blue-500 to-sky-600 px-6 py-4 font-medium text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/30 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Importing Books...
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            Start Import
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import request from "@/api/request";
import { useNotificationStore } from "@/stores/notification";
import { onMounted, ref } from "vue";
const weread_cookie = ref("");
const loading = ref(false);

const notifier = useNotificationStore();
const submitImport = async () => {
  loading.value = true;
  try {
    const response = await request.post("/import", {
      weread_cookie: weread_cookie.value,
    });
    if (response.status === 200) {
      const imported_count = response.data.data.imported_count;
      notifier.success(`Successfully imported ${imported_count} books!`);

      // 保存cookie
      saveToLocalStorage();
    }
  } catch (error) {
    console.log("Error during import:", error);
    notifier.error("Cookie过期或无效，请重新获取并输入有效的 WEREAD Cookie！");
  } finally {
    loading.value = false;
  }
};

//保存数据到localStorage
const saveToLocalStorage = () => {
  localStorage.setItem("weread_cookie", weread_cookie.value);
};

//页面加载时从localStorage读取数据
const loadFromLocalStorage = () => {
  const savedCookie = localStorage.getItem("weread_cookie");
  if (savedCookie) {
    weread_cookie.value = savedCookie;
  }
};
onMounted(loadFromLocalStorage);
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
