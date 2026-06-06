<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { blogGateway } from '@/api/blogGateway';
import type { Comment } from '@/types';
import CommentForm from './CommentForm.vue';
import CommentItem from './CommentItem.vue';

interface Props {
  postId: string;
  comments: Comment[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'refresh'): void;
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
      notifier.error('找不到要回复的评论');
      return;
    }

    await blogGateway.postLegacyComment({
      post_id: props.postId,
      body: body,
      reply_to: commentId,
      reply_to_author: parentComment.author,
      author: auth.isAuthenticated && auth.user ? auth.user.username : '',
    });
    notifier.success('评论已提交，待审核后显示');
    emit('refresh');
  } catch (err) {
    console.error('提交回复失败:', err);
    const errorMsg =
      err instanceof Error ? err.message : '提交评论失败，请稍后重试';
    notifier.error(errorMsg);
  }
};
</script>

<template>
  <div id="comments" class="border-border border-t p-8">
    <div class="border-border mb-8 flex items-center gap-4 border-b pb-6">
      <h3 class="text-foreground text-2xl font-bold">评论</h3>
      <span
        v-if="comments && comments.length > 0"
        class="bg-primary/15 text-primary rounded-full px-3 py-1 text-sm font-semibold"
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
      class="border-border bg-muted mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center"
    >
      <div
        class="bg-card ring-border mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-sm ring-1"
      >
        <svg
          class="text-muted-foreground h-8 w-8"
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
      <h3 class="text-foreground text-lg font-semibold">暂无评论</h3>
      <p class="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
        成为第一个评论的人吧！
      </p>
    </div>

    <CommentForm :post-id="postId" />
  </div>
</template>
