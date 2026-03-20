<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import type { Comment } from "@/types";
import CommentForm from "./CommentForm.vue";
import CommentItem from "./CommentItem.vue";

interface Props {
  postId: string;
  comments: Comment[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const auth = useAuthStore();
const notifier = useNotificationStore();

const handleReply = async (commentId: string, body: string) => {
  try {
    const findComment = (
      commentsList: Comment[],
      id: string,
    ): Comment | undefined => {
      for (const comment of commentsList) {
        if (comment._id === id) {
          return comment;
        }
        if (comment.comments && comment.comments.length > 0) {
          const found = findComment(comment.comments, id);
          if (found) {
            return found;
          }
        }
      }
      return undefined;
    };

    const parentComment = findComment(props.comments, commentId);

    if (!parentComment) {
      notifier.error("找不到要回复的评论");
      return;
    }

    const { default: request } = await import("@/request");

    const res = await request.post("/comments", {
      post_id: props.postId,
      body: body,
      reply_to: commentId,
      reply_to_author: parentComment.author,
      author: auth.isAuthenticated && auth.user ? auth.user.username : "",
    });

    if (
      res.data.status === "success" ||
      res.status === 200 ||
      res.status === 201
    ) {
      notifier.success("评论已提交，待审核后显示");
      emit("refresh");
    } else {
      throw new Error(res.data.message || "提交评论失败");
    }
  } catch (err) {
    console.error("提交回复失败:", err);
    const errorMsg =
      err instanceof Error ? err.message : "提交评论失败，请稍后重试";
    notifier.error(errorMsg);
  }
};
</script>

<template>
  <div id="comments" class="border-t border-blue-100 p-8 dark:border-slate-700">
    <div
      class="mb-8 flex items-center gap-4 border-b border-gray-100 pb-6 dark:border-gray-700"
    >
      <h3 class="text-2xl font-bold text-gray-900 dark:text-white">评论</h3>
      <span
        v-if="comments && comments.length > 0"
        class="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
      >
        {{ comments.length }}
      </span>
    </div>

    <div v-if="comments.length > 0" class="space-y-6">
      <CommentItem
        v-for="comment in comments"
        :key="comment._id"
        :comment="comment"
        :post-id="postId"
        @reply="handleReply"
      />
    </div>

    <div
      v-else
      class="mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center dark:border-gray-700 dark:bg-gray-800/30"
    >
      <div
        class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
      >
        <svg
          class="h-8 w-8 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        暂无评论
      </h3>
      <p class="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        成为第一个评论的人吧！
      </p>
    </div>

    <CommentForm :post-id="postId" />
  </div>
</template>
