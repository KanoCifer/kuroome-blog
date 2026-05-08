<script setup lang="ts">
import { blogService } from "@/service/blogService";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import { computed, ref } from "vue";

interface Props {
  postId: string | number;
  isReply?: boolean;
  replyTo?: string;
  replyToAuthor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isReply: false,
  replyTo: undefined,
  replyToAuthor: undefined,
});

const auth = useAuthStore();
const notifier = useNotificationStore();

const author = ref("");
const email = ref("");
const site = ref("");
const body = ref("");
const isSubmitting = ref(false);
const isFocused = ref(false);
const charCount = computed(() => body.value.length);
const maxChars = 1000;

const isValid = computed(() => {
  if (auth.isAuthenticated) {
    return body.value.trim().length > 0 && body.value.length <= maxChars;
  }
  return (
    author.value.trim().length > 0 &&
    body.value.trim().length > 0 &&
    body.value.length <= maxChars
  );
});

const handleSubmit = async () => {
  if (!isValid.value || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    console.log("Submitting comment:", {
      post_id: String(props.postId),
      body: body.value,
    });
    await blogService.postLegacyComment({
      post_id: String(props.postId),
      body: body.value,
      author:
        auth.isAuthenticated && auth.user ? auth.user.username : author.value,
      reply_to: props.isReply ? props.replyTo : undefined,
      reply_to_author: props.isReply ? props.replyToAuthor : undefined,
    });
    notifier.success("评论已提交，等待审核");

    // Reset form
    body.value = "";
    author.value = "";
    email.value = "";
    site.value = "";
  } catch (error) {
    console.error("Error submitting comment:", error);
    notifier.error("评论提交失败，请稍后重试");
  } finally {
    isSubmitting.value = false;
  }
};

// Quick emoji reactions
const emojis = ["👍", "❤️", "😊", "🎉", "🤔", "👀"];

const addEmoji = (emoji: string) => {
  body.value += emoji;
};
</script>

<template>
  <div
    :class="[
      isReply
        ? 'mt-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200 dark:bg-gray-800/50 dark:ring-gray-700'
        : 'mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/30 dark:shadow-none',
    ]"
  >
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <h4
        v-if="!isReply"
        class="gap-2 text-lg font-semibold text-gray-900 dark:text-white"
      >
        发表评论
        <span
          class="ml-2 rounded-full border border-blue-200 bg-blue-200/30 px-4 py-2 text-xs font-medium text-blue-400"
          >*评论发布后请等待管理员审核</span
        >
      </h4>
      <h4 v-else class="text-sm font-medium text-gray-600 dark:text-gray-400">
        回复 @{{ replyToAuthor }}
      </h4>

      <!-- Cancel reply button -->
      <button
        v-if="isReply && replyTo"
        class="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        @click="$emit('cancelReply')"
      >
        取消
      </button>
    </div>

    <!-- User info for unauthenticated users -->
    <template v-if="!auth.isAuthenticated">
      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="relative">
          <label
            class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            昵称 *
          </label>
          <input
            v-model="author"
            type="text"
            placeholder="你的名字"
            class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400"
          />
        </div>
        <div class="relative">
          <label
            class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            邮箱 *
          </label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400"
          />
        </div>
      </div>
      <div class="mb-4">
        <label
          class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
        >
          网站
        </label>
        <input
          v-model="site"
          type="url"
          placeholder="https://yourwebsite.com"
          class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400"
        />
      </div>
    </template>

    <!-- Comment input area -->
    <div
      :class="[
        'relative rounded-xl border transition-all duration-200',
        isFocused
          ? 'border-blue-500 bg-white ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-gray-800/50'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30',
      ]"
    >
      <textarea
        v-model="body"
        rows="4"
        :placeholder="isReply ? '写下你的回复...' : '写下你的评论...'"
        :maxlength="maxChars"
        class="w-full resize-none rounded-xl border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-500"
        @focus="isFocused = true"
        @blur="isFocused = false"
      ></textarea>

      <!-- Toolbar -->
      <div
        class="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-gray-700"
      >
        <!-- Quick emojis -->
        <div class="flex items-center gap-1">
          <button
            v-for="emoji in emojis"
            :key="emoji"
            type="button"
            class="rounded-lg p-1.5 text-lg transition-all hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-700"
            :title="emoji"
            @click="addEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>

        <!-- Character count -->
        <div
          :class="[
            'text-xs',
            charCount > maxChars
              ? 'text-red-500'
              : charCount > maxChars * 0.9
                ? 'text-orange-500'
                : 'text-gray-400 dark:text-gray-500',
          ]"
        >
          {{ charCount }} / {{ maxChars }}
        </div>
      </div>
    </div>

    <!-- Submit button -->
    <div class="mt-4 flex items-center justify-end gap-3">
      <p
        v-if="!auth.isAuthenticated"
        class="mr-auto text-xs text-gray-500 dark:text-gray-400"
      >
        * 为必填项，邮箱不会被公开显示
      </p>

      <button
        type="submit"
        :disabled="!isValid || isSubmitting"
        :class="[
          'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200',
          isValid && !isSubmitting
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 dark:bg-blue-500 dark:hover:bg-blue-600'
            : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
        ]"
        @click="handleSubmit"
      >
        <!-- Loading spinner -->
        <svg
          v-if="isSubmitting"
          class="h-4 w-4 animate-spin"
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

        <!-- Send icon -->
        <svg
          v-else
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>

        {{ isSubmitting ? "提交中..." : "发表评论" }}
      </button>
    </div>
  </div>
</template>
