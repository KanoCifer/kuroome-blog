<script setup lang="ts">
import type { Comment } from '@/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const props = defineProps<{
  pendingComments: Comment[];
  approvedComments: Comment[];
  loading: boolean;
  actionLoading: string | null;
}>();

const emit = defineEmits<{
  approve: [commentId: string];
  delete: [commentId: string];
}>();

const formatTime = (dateStr: string) => {
  return dayjs(dateStr).fromNow();
};

const handleApproveComment = (commentId: string) => {
  emit('approve', commentId);
};

const handleDeleteComment = (commentId: string) => {
  if (!confirm('Are you sure you want to delete this comment?')) {
    return;
  }
  emit('delete', commentId);
};
</script>

<template>
  <div class="space-y-6">
    <!-- Pending Comments Section -->
    <div
      class="bg-card/80 ring-border dark:ring-border rounded-3xl p-6 shadow-xl ring-1 dark:bg-gray-800/80"
    >
      <h2
        class="text-foreground dark:text-foreground mb-6 flex items-center gap-2 text-xl font-bold"
      >
        <span
          class="bg-warning text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs"
        >
          {{ props.pendingComments.length }}
        </span>
        Pending Review
      </h2>

      <div v-if="props.pendingComments.length > 0" class="space-y-4">
        <div
          v-for="comment in props.pendingComments"
          :key="comment._id"
          class="border-warning bg-warning/10 rounded-3xl border-l-4 p-4 dark:border-orange-500 dark:bg-orange-900/20"
        >
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h3 class="text-foreground dark:text-foreground font-semibold">
                {{ comment.author || 'Anonymous' }}
              </h3>
              <p
                class="text-muted-foreground dark:text-muted-foreground text-xs"
              >
                On: {{ comment.post_title }}
              </p>
              <p
                class="text-muted-foreground dark:text-muted-foreground text-sm"
              >
                {{ formatTime(comment.created_at) }}
              </p>
            </div>
            <span
              class="bg-warning/20 text-warning rounded-full px-2 py-1 text-xs font-medium dark:bg-orange-900/50 dark:text-orange-300"
            >
              Pending
            </span>
          </div>
          <p
            class="text-foreground dark:text-foreground mb-4 whitespace-pre-wrap"
          >
            {{ comment.body }}
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              @click="handleApproveComment(comment._id)"
              :disabled="props.actionLoading === comment._id"
              class="bg-success text-primary-foreground hover:bg-success/90 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
            >
              <svg
                v-if="props.actionLoading === comment._id"
                class="h-4 w-4 animate-spin"
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
              <svg
                v-else
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Approve
            </button>
            <button
              type="button"
              @click="handleDeleteComment(comment._id)"
              :disabled="props.actionLoading === comment._id"
              class="bg-destructive text-primary-foreground hover:bg-destructive/90 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
            >
              <svg
                v-if="props.actionLoading === comment._id"
                class="h-4 w-4 animate-spin"
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
              <svg
                v-else
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      <div
        v-else
        class="bg-muted/80 rounded-xl p-8 text-center dark:bg-gray-700/50"
      >
        <p class="text-muted-foreground dark:text-muted-foreground">
          No pending comments to review.
        </p>
      </div>
    </div>

    <!-- Approved Comments Section -->
    <div
      class="bg-card/80 ring-border dark:ring-border rounded-3xl p-6 shadow-xl ring-1 dark:bg-gray-800/80"
    >
      <h2
        class="text-foreground dark:text-foreground mb-6 flex items-center gap-2 text-xl font-bold"
      >
        <span
          class="text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs"
        >
          {{ props.approvedComments.length }}
        </span>
        Recently Approved
      </h2>

      <div v-if="props.approvedComments.length > 0" class="space-y-4">
        <div
          v-for="comment in props.approvedComments"
          :key="comment._id"
          class="rounded-xl border-l-4 border-green-400 bg-green-50/50 p-4 dark:border-green-500 dark:bg-green-900/20"
        >
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h3 class="text-foreground dark:text-foreground font-semibold">
                {{ comment.author || 'Anonymous' }}
              </h3>
              <p
                class="text-muted-foreground dark:text-muted-foreground text-xs"
              >
                On: {{ comment.post_title }}
              </p>
              <p
                class="text-muted-foreground dark:text-muted-foreground text-sm"
              >
                {{ formatTime(comment.created_at) }}
              </p>
            </div>
            <span
              class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300"
            >
              Approved
            </span>
          </div>
          <p
            class="text-foreground dark:text-foreground mb-4 whitespace-pre-wrap"
          >
            {{ comment.body }}
          </p>
          <button
            type="button"
            @click="handleDeleteComment(comment._id)"
            :disabled="props.actionLoading === comment._id"
            class="bg-destructive text-primary-foreground hover:bg-destructive/90 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
          >
            <svg
              v-if="props.actionLoading === comment._id"
              class="h-4 w-4 animate-spin"
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
            <svg
              v-else
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      </div>

      <div
        v-else
        class="bg-muted rounded-xl p-8 text-center dark:bg-gray-700/30"
      >
        <p class="text-muted-foreground dark:text-muted-foreground">
          No approved comments yet.
        </p>
      </div>
    </div>
  </div>
</template>
