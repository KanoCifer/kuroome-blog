<template>
  <div>
    <!-- Title Section with Parallax -->
    <div
      class="relative -z-5 mx-0 mt-60 flex flex-col items-center justify-center bg-transparent"
      :style="titleStyle"
    >
      <div>
        <h1 class="text-foreground max-w-6xl text-center font-serif text-7xl">
          {{ activeTab === 'messages' ? '留言管理' : '评论管理' }}
        </h1>
        <!-- Description -->
        <div
          class="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-4 text-sm"
        >
          <span
            class="bg-muted text-muted-foreground inline-block rounded-full px-3 py-1 text-xs font-medium"
          >
            Admin Only
          </span>
          <span class="text-muted-foreground">审核和管理用户内容</span>
        </div>
      </div>
    </div>

    <div class="relative mt-36">
      <div
        :style="sectionStyle"
        class="bg-muted absolute left-1/2 -z-5 h-full -translate-x-1/2 rounded-t-[40px]"
      ></div>

      <div class="mx-auto max-w-5xl space-y-6 pt-24 pb-12">
        <!-- Action Bar -->
        <div
          class="border-border/60 bg-card/80 relative z-10 flex flex-col items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row"
        >
          <!-- Tab Navigation -->
          <div class="flex gap-2">
            <button
              type="button"
              @click="activeTab = 'messages'"
              :class="[
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === 'messages'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-accent',
              ]"
            >
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              留言
            </button>
            <button
              type="button"
              @click="activeTab = 'comments'"
              :class="[
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === 'comments'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-accent',
              ]"
            >
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
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              评论
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <button
              @click="handleRefresh"
              :disabled="loading"
              class="group bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-medium shadow-md transition-all select-none hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
              {{ loading ? '刷新中...' : '刷新' }}
            </button>
            <button
              @click="goBack"
              class="group border-border bg-card text-foreground hover:bg-accent flex cursor-pointer items-center gap-2 rounded-xl border px-5 py-2.5 font-medium shadow-sm transition-all select-none hover:shadow-md"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              返回
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4"
        >
          <div class="flex items-center gap-2">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
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
        <div
          v-if="loading"
          class="squircle border-border/60 bg-card/30 overflow-hidden rounded-2xl border p-6 shadow-sm"
        >
          <div class="py-8">
            <div class="space-y-4">
              <div
                v-for="i in 5"
                :key="i"
                class="bg-muted h-16 animate-pulse rounded-xl"
              ></div>
            </div>
          </div>
        </div>

        <!-- Dynamic Tab Content -->
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

        <!-- Back to Home -->
        <div class="mt-12 text-center">
          <RouterLink
            to="/"
            class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 font-medium transition-all duration-300 hover:shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回首页
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentsTab from '@/components/message/CommentsTab.vue';
import MessagesTab from '@/components/message/MessagesTab.vue';
import { messageGateway } from '@/api/messageGateway';
import { useAuthStore } from '@/auth/stores/auth';
import type { Comment, Message } from '@/types';
import { useScroll } from '@vueuse/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

// 组件名称，用于 KeepAlive 缓存
defineOptions({
  name: 'MessageManageView',
});

dayjs.extend(relativeTime);

const auth = useAuthStore();
const router = useRouter();
const { y } = useScroll(window);

const activeTab = ref<'messages' | 'comments'>('messages');
const pendingMessages = ref<Message[]>([]);
const approvedMessages = ref<Message[]>([]);
const pendingComments = ref<Comment[]>([]);
const approvedComments = ref<Comment[]>([]);
const loading = ref(false);
const error = ref('');
const actionLoading = ref<string | null>(null);

// Parallax computed styles
const titleStyle = computed(() => ({
  transform: `translateY(${y.value * 0.4}px)`,
}));

const sectionStyle = computed(() => {
  const scale = Math.min(1, 0.95 + y.value * 0.0005);
  return {
    width: `${100 * scale}%`,
  };
});

onMounted(async () => {
  if (auth.user === null && !auth.loading) {
    await auth.fetchUser();
  }

  if (!auth.isAuthenticated || auth.user?.id !== 1) {
    router.push('/');
    return;
  }

  // 初始化时同时加载两个 tab 的数据，保持状态
  await Promise.all([fetchMessages(), fetchComments()]);
});

const fetchMessages = async () => {
  loading.value = true;
  error.value = '';
  try {
    const result = await messageGateway.getAdminMessages();
    pendingMessages.value = result.pending || [];
    approvedMessages.value = result.approved || [];
  } catch {
    error.value = '加载留言失败';
  } finally {
    loading.value = false;
  }
};

const fetchComments = async () => {
  loading.value = true;
  error.value = '';
  try {
    const result = await messageGateway.getAdminComments();
    pendingComments.value = result.pending || [];
    approvedComments.value = result.approved || [];
  } catch {
    error.value = '加载评论失败';
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (itemId: string) => {
  actionLoading.value = itemId;
  try {
    if (activeTab.value === 'messages') {
      await messageGateway.approveAdminMessage(itemId);
      await fetchMessages();
    } else {
      await messageGateway.approveAdminComment(itemId);
      await fetchComments();
    }
  } catch (err) {
    if (err instanceof Error) error.value = err.message || '操作失败';
    else error.value = '操作失败';
  } finally {
    actionLoading.value = null;
  }
};

const handleDelete = async (itemId: string) => {
  actionLoading.value = itemId;
  try {
    if (activeTab.value === 'messages') {
      await messageGateway.deleteAdminMessage(itemId);
      await fetchMessages();
    } else {
      await messageGateway.deleteAdminComment(itemId);
      await fetchComments();
    }
  } catch (err) {
    if (err instanceof Error) error.value = err.message || '操作失败';
    else error.value = '操作失败';
  } finally {
    actionLoading.value = null;
  }
};

const handleRefresh = async () => {
  if (activeTab.value === 'messages') {
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
  position: relative;
  width: 100%;
}

.tab-content[v-show='false'] {
  display: none;
}

.tab-content[v-show='true'] {
  display: block;
}
</style>
