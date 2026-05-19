<template>
  <div class="min-h-screen px-4 py-16">
    <div
      class="border-border/20 bg-card/40 mx-auto mt-8 max-w-2xl rounded-3xl border p-10 shadow-2xl"
      style="animation: fadeInUp 0.6s ease-out"
    >
      <!-- Header -->
      <div class="mb-12 text-center">
        <h1
          class="from-gradient-primary-from to-gradient-primary-to bg-linear-to-r bg-clip-text text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-transparent"
        >
          Import Your Bookshelf
        </h1>
        <p class="text-muted-foreground mt-2 text-sm">
          Import your books from WeRead by providing your account cookie
        </p>
      </div>

      <!-- Form Section -->
      <form @submit.prevent="submitImport" class="space-y-6">
        <!-- Cookie Input -->
        <div class="space-y-2">
          <label
            for="weread_cookie"
            class="text-foreground block text-sm font-medium"
          >
            WeRead Cookie
          </label>
          <div class="relative">
            <textarea
              id="weread_cookie"
              v-model="weread_cookie"
              class="border-border bg-card/70 focus:border-primary focus:ring-primary/20 w-full rounded-2xl border px-4 py-3 text-sm transition-all duration-200 focus:ring-2 focus:outline-none"
              rows="8"
              placeholder="Paste your WeRead cookie here..."
            />
          </div>
          <p class="text-muted-foreground mt-1 text-xs">
            Your cookie will be saved locally in your browser for future use
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/30 focus:ring-primary w-full rounded-2xl px-6 py-4 font-medium shadow-lg transition-all duration-300 hover:scale-[1.02] focus:ring-2 focus:ring-offset-2 focus:outline-none active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <span
              class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            ></span>
            Importing Books...
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
import { bookService } from "@/service/bookService";
import { useNotificationStore } from "@/stores/notification";
import { onMounted, ref } from "vue";
const weread_cookie = ref("");
const loading = ref(false);

const notifier = useNotificationStore();
const submitImport = async () => {
  loading.value = true;
  try {
    const response = await bookService.importBooks({
      weread_cookie: weread_cookie.value,
    });
    if (response.status === "success") {
      const imported_count = response.data?.imported_count ?? 0;
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
