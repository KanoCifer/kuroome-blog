<template>
  <div class="mx-auto max-w-5xl space-y-8">
    <!-- Header -->
    <div
      class="mb-8 flex items-center justify-between rounded-3xl bg-gray-50/50 px-4 py-6 backdrop-blur-sm dark:bg-gray-900/30"
    >
      <h1
        class="mr-4 flex items-center gap-3 text-3xl font-bold text-gray-800 dark:text-gray-100"
      >
        {{
          activeTab === "messages" ? "Message Management" : "Comment Management"
        }}
        <span
          class="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
        >
          Admin Only
        </span>
      </h1>
      <div class="flex gap-4">
        <button
          type="button"
          @click="activeTab = 'messages'"
          :class="[
            activeTab === 'messages'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'border-b-2 px-1 py-4 text-sm font-medium transition-colors',
          ]"
        >
          💬 Messages
        </button>
        <button
          type="button"
          @click="activeTab = 'comments'"
          :class="[
            activeTab === 'comments'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'border-b-2 px-1 py-4 text-sm font-medium transition-colors',
          ]"
        >
          📝 Comments
        </button>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="handleRefresh"
          :disabled="loading"
          class="group flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-semibold text-white shadow-md transition-all select-none hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            :class="[
              loading ? 'animate-spin' : 'group-hover:rotate-180',
              'h-4 w-4 transition-transform',
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {{ loading ? "Refreshing..." : "Refresh" }}
        </button>
        <button
          @click="goBack"
          class="group flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-md transition-all select-none hover:bg-blue-700 hover:shadow-lg"
        >
          <svg
            class="h-4 w-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          返回
        </button>
      </div>
      <!-- Tab Navigation -->
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200"
    >
      <div class="flex items-center">
        <svg class="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        {{ error }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-12 text-center">
      <div
        class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
      ></div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Loading {{ activeTab === "messages" ? "messages" : "comments" }}...
      </p>
    </div>

    <!-- Dynamic Tab Content with KeepAlive -->
    <div v-else class="relative">
      <div v-show="activeTab === 'messages'" class="tab-content">
        <MessagesTab
          :pending-messages="pendingMessages"
          :approved-messages="approvedMessages"
          :loading="loading"
          :action-loading="actionLoading"
          @approve="handleApprove"
          @delete="handleDelete"
        />
      </div>
      <div v-show="activeTab === 'comments'" class="tab-content">
        <CommentsTab
          :pending-comments="pendingComments"
          :approved-comments="approvedComments"
          :loading="loading"
          :action-loading="actionLoading"
          @approve="handleApprove"
          @delete="handleDelete"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentsTab from "@/components/CommentsTab.vue";
import MessagesTab from "@/components/MessagesTab.vue";
import request from "@/request";
import { useAuthStore } from "@/stores/auth";
import type { Comment, Message } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

// 组件名称，用于 KeepAlive 缓存
defineOptions({
  name: "MessageManageView",
});

dayjs.extend(relativeTime);

const auth = useAuthStore();
const router = useRouter();

const activeTab = ref<"messages" | "comments">("messages");
const pendingMessages = ref<Message[]>([]);
const approvedMessages = ref<Message[]>([]);
const pendingComments = ref<Comment[]>([]);
const approvedComments = ref<Comment[]>([]);
const loading = ref(false);
const error = ref("");
const actionLoading = ref<string | null>(null);

// // Computed property to get active component
// const activeComponent = computed(() => {
//   return activeTab.value === "messages" ? MessagesTab : CommentsTab;
// });

onMounted(async () => {
  if (auth.user === null && !auth.loading) {
    await auth.fetchUser();
  }

  if (!auth.isAuthenticated || auth.user?.id !== 1) {
    router.push("/");
    return;
  }

  // 初始化时同时加载两个 tab 的数据，保持状态
  await Promise.all([fetchMessages(), fetchComments()]);
});

// 移除对 activeTab 的 watch，因为我们现在同时加载所有数据
// watch(activeTab, () => {
//   fetchData();
// });

// 保留 fetchData 函数，但不自动调用，只在需要刷新时手动调用
// const fetchData = async () => {
//   if (activeTab.value === "messages") {
//     await fetchMessages();
//   } else {
//     await fetchComments();
//   }
// };

const fetchMessages = async () => {
  loading.value = true;
  error.value = "";
  try {
    console.log("[MessageManage] Fetching messages...");
    const response = await request.get("/messages/admin/messages");

    const result = response.data;
    if (response.status === 200) {
      const pending = result.data?.pending ? result.data.pending : [];
      const approved = result.data?.approved ? result.data.approved : [];

      pendingMessages.value = pending as Message[];
      approvedMessages.value = approved as Message[];
    } else {
      error.value =
        result.error?.message ||
        result.description ||
        "Failed to load messages";
    }
  } catch {
    error.value = "Network error occurred";
  } finally {
    loading.value = false;
  }
};

const fetchComments = async () => {
  loading.value = true;
  error.value = "";
  try {
    console.log("[CommentManage] Fetching comments...");
    const response = await request.get("/admin/comments");

    const result = response.data;
    if (response.status === 200) {
      const pending = result.data?.pending ? result.data.pending : [];
      const approved = result.data?.approved ? result.data.approved : [];

      pendingComments.value = pending as Comment[];
      approvedComments.value = approved as Comment[];
    } else {
      error.value =
        result.error?.message ||
        result.description ||
        "Failed to load comments";
    }
  } catch {
    error.value = "Network error occurred";
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (itemId: string) => {
  actionLoading.value = itemId;
  try {
    if (activeTab.value === "messages") {
      await request.post(`/messages/admin/messages/${itemId}/approve`);
      await fetchMessages();
    } else {
      await request.post(`/admin/comments/${itemId}/approve`);
      await fetchComments();
    }
  } catch (err) {
    if (err instanceof Error)
      error.value = err.message || "Network error occurred";
    else error.value = "Network error occurred";
  } finally {
    actionLoading.value = null;
  }
};

const handleDelete = async (itemId: string) => {
  actionLoading.value = itemId;
  try {
    if (activeTab.value === "messages") {
      await request.delete(`/messages/admin/messages/${itemId}/delete`);
      await fetchMessages();
    } else {
      await request.delete(`/admin/comments/${itemId}/delete`);
      await fetchComments();
    }
  } catch (err) {
    if (err instanceof Error)
      error.value = err.message || "Network error occurred";
    else error.value = "Network error occurred";
  } finally {
    actionLoading.value = null;
  }
};

const handleRefresh = async () => {
  if (activeTab.value === "messages") {
    await fetchMessages();
  } else {
    await fetchComments();
  }
};

const goBack = () => {
  router.back();
};
</script>

<style scoped>
/* Tab transition animation for v-show */
.tab-content {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
  will-change: opacity, transform;
}

.tab-content[v-show="false"] {
  opacity: 0;
  filter: blur(2px);
  pointer-events: none;
}

.tab-content[v-show="true"] {
  opacity: 1;
  filter: blur(0);
  pointer-events: auto;
}
</style>
