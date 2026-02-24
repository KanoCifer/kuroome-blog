<script setup lang="ts">
import { formatDate } from "@/utils/formatdate";
import { ref } from "vue";
import type { Comment } from "@/types";

interface Props {
  comment: Comment;
  postId: string;
  depth?: number; // 评论嵌套深度，用于样式调整
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
});

const { comment, depth } = props;

// 回复功能状态
const isReplying = ref(false);
const replyBody = ref("");

const emit = defineEmits<{
  (e: "reply", commentId: string, body: string): void;
}>();

const startReply = () => {
  isReplying.value = true;
};

const cancelReply = () => {
  isReplying.value = false;
  replyBody.value = "";
};

const submitReply = () => {
  if (!replyBody.value.trim()) return;
  emit("reply", comment._id || "", replyBody.value.trim());
  isReplying.value = false;
  replyBody.value = "";
};
</script>

<template>
  <div
    :id="`comment-${comment._id}`"
    class="group transition-all duration-200 first:mt-0"
    :style="{ marginLeft: `${depth * 1.5}rem` }"
  >
    <div
      :class="[
        'mb-2',
        !comment.reviewed
          ? 'gap-y-4 border-yellow-300 bg-yellow-50 ring-4 ring-yellow-50/50 dark:border-yellow-700/50 dark:bg-yellow-900/20 dark:ring-yellow-900/30'
          : 'bg-white dark:bg-gray-800',
      ]"
      class="relative rounded-2xl border border-gray-100 p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700"
    >
      <div class="mb-3 flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
              'bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 dark:from-sky-900 dark:to-blue-900 dark:text-blue-300',
            ]"
          >
            {{ comment.author?.charAt(0).toUpperCase() || "?" }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                comment.author
              }}</span>
              <span
                v-if="!comment.reviewed"
                class="inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-yellow-600/20 ring-inset dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-300/20"
              >
                Pending
              </span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ comment.created_at ? formatDate(comment.created_at) : "N/A" }}
            </div>
          </div>
        </div>
      </div>

      <div
        class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
      >
        <span
          v-if="comment.reply_to_author"
          class="font-medium text-blue-600 dark:text-blue-400"
        >
          @{{ comment.reply_to_author }}
        </span>
        <span v-if="comment.reply_to_author">&nbsp;</span>
        {{ comment.body }}
      </div>

      <!-- Reply Input Form -->
      <div v-if="isReplying" class="mt-4 space-y-3">
        <div class="flex gap-3">
          <div class="relative flex-1">
            <textarea
              v-model="replyBody"
              :placeholder="`Reply to @${comment.author}...`"
              rows="3"
              class="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
              @keydown.ctrl.enter="submitReply"
            ></textarea>
            <div
              class="absolute right-2 bottom-2 text-xs text-gray-400 dark:text-gray-500"
            >
              Ctrl+Enter to submit
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            @click="cancelReply"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!replyBody.trim()"
            :class="[
              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              replyBody.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-600'
                : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
            ]"
            @click="submitReply"
          >
            Reply
          </button>
        </div>
      </div>

      <div
        class="mt-4 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-gray-700"
      >
        <div>
          <button
            v-if="!isReplying"
            type="button"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            @click="startReply"
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
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              ></path>
            </svg>
            Reply
          </button>
        </div>

        <div v-if="!comment.reviewed" class="flex gap-2">
          <button
            type="button"
            class="rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
          >
            Approve
          </button>
          <button
            type="button"
            class="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- 递归显示子评论 -->
    <div v-if="comment.comments && comment.comments.length > 0" class="mt-4">
      <CommentItem
        v-for="subComment in comment.comments"
        :key="subComment._id"
        :comment="subComment"
        :post-id="props.postId"
        :depth="depth + 1"
        @reply="(commentId, body) => emit('reply', commentId, body)"
      />
    </div>
  </div>
</template>
