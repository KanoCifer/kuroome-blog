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
        'relative rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md',
        !comment.reviewed
          ? 'border-warning/30 bg-warning/10 ring-warning/5 gap-y-4 ring-4'
          : 'border-border bg-card',
      ]"
    >
      <div class="mb-3 flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
              'bg-primary/10 text-primary',
            ]"
          >
            {{ comment.author?.charAt(0).toUpperCase() || "?" }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-foreground font-semibold">{{
                comment.author
              }}</span>
              <span
                v-if="!comment.reviewed"
                class="bg-warning/10 text-warning ring-warning/20 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
              >
                Pending
              </span>
            </div>
            <div class="text-muted-foreground text-xs">
              {{ comment.created_at ? formatDate(comment.created_at) : "N/A" }}
            </div>
          </div>
        </div>
      </div>

      <div class="prose prose-sm dark:prose-invert text-foreground max-w-none">
        <span v-if="comment.reply_to_author" class="text-primary font-medium">
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
              class="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/10 w-full resize-none rounded-lg border px-4 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:outline-none"
              @keydown.ctrl.enter="submitReply"
            ></textarea>
            <div
              class="text-muted-foreground absolute right-2 bottom-2 text-xs"
            >
              Ctrl+Enter to submit
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors"
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
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            ]"
            @click="submitReply"
          >
            Reply
          </button>
        </div>
      </div>

      <div
        class="border-border mt-4 flex items-center justify-between border-t pt-3"
      >
        <div>
          <button
            v-if="!isReplying"
            type="button"
            class="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
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
            class="bg-success/10 text-success hover:bg-success/15 rounded-md px-2.5 py-1.5 text-xs font-medium"
          >
            Approve
          </button>
          <button
            type="button"
            class="bg-destructive/10 text-destructive hover:bg-destructive/15 rounded-md px-2.5 py-1.5 text-xs font-medium"
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
