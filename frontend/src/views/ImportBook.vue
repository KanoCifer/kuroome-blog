<template>
  <div id="ImportBook">
    <div
      class="m-4 mx-auto max-w-xl rounded-[40px] bg-white/80 p-8 shadow-xl backdrop-blur-xs dark:bg-gray-800/80"
    >
      <p class="font-serif text-2xl font-bold dark:text-white">
        Import Your Bookshelf!
      </p>
      <p class="mb-4 text-gray-500 italic dark:text-gray-400">
        Import your bookshelf from WEREAD here.
      </p>
      <div class="flex items-center justify-center">
        <form method="POST">
          <div class="mb-4">
            <label
              for="weread_cookie"
              class="mb-2 block text-center text-gray-700 dark:text-gray-300"
              >WEREAD Cookie:</label
            >
            <textarea
              id="weread_cookie"
              v-model="weread_cookie"
              class="h-40 w-md rounded-3xl border-2 border-gray-500 p-2 transition-transform focus:scale-[1.01] dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div class="mb-4 flex justify-center">
            <button
              @click="submitImport"
              :disabled="loading"
              class="flex w-full items-center justify-center rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-blue-600 dark:ring-offset-gray-800"
            >
              <svg
                v-if="loading"
                class="h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{{ loading ? "Importing..." : "Submit" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import request from "@/request";
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
