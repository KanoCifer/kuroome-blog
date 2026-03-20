<script setup lang="ts">
import type { Message } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const props = defineProps<{
  pendingMessages: Message[];
  approvedMessages: Message[];
  loading: boolean;
  actionLoading: string | null;
}>();

const emit = defineEmits<{
  approve: [messageId: string];
  delete: [messageId: string];
}>();

const formatTime = (dateStr: string) => {
  return dayjs(dateStr).fromNow();
};

const handleApproveMessage = (messageId: string) => {
  emit("approve", messageId);
};

const handleDeleteMessage = (messageId: string) => {
  if (!confirm("Are you sure you want to delete this message?")) {
    return;
  }
  emit("delete", messageId);
};
</script>

<template>
  <div class="space-y-6">
    <!-- Pending Messages Section -->
    <div
      class="rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800/80 dark:ring-white/10"
    >
      <h2
        class="mb-6 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100"
      >
        <span
          class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs text-white"
        >
          {{ props.pendingMessages.length }}
        </span>
        Pending Review
      </h2>

      <div v-if="props.pendingMessages.length > 0" class="space-y-4">
        <div
          v-for="message in props.pendingMessages"
          :key="message.id"
          class="rounded-xl border-l-4 border-orange-400 bg-orange-50/50 p-4 dark:border-orange-500 dark:bg-orange-900/20"
        >
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                {{ message.name || "Anonymous" }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatTime(message.created_at) }}
              </p>
            </div>
            <span
              class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
            >
              Pending
            </span>
          </div>
          <p class="mb-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {{ message.message }}
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              @click="handleApproveMessage(message.id)"
              :disabled="props.actionLoading === message.id"
              class="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
            >
              <svg
                v-if="props.actionLoading === message.id"
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
              @click="handleDeleteMessage(message.id)"
              :disabled="props.actionLoading === message.id"
              class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
            >
              <svg
                v-if="props.actionLoading === message.id"
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
        class="rounded-xl bg-gray-50/80 p-8 text-center dark:bg-gray-700/50"
      >
        <p class="text-gray-500 dark:text-gray-400">
          No pending messages to review.
        </p>
      </div>
    </div>

    <!-- Approved Messages Section -->
    <div
      class="rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800/80 dark:ring-white/10"
    >
      <h2
        class="mb-6 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100"
      >
        <span
          class="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white"
        >
          {{ props.approvedMessages.length }}
        </span>
        Recently Approved
      </h2>

      <div v-if="props.approvedMessages.length > 0" class="space-y-4">
        <div
          v-for="message in props.approvedMessages"
          :key="message.id"
          class="rounded-xl border-l-4 border-green-400 bg-green-50/50 p-4 dark:border-green-500 dark:bg-green-900/20"
        >
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                {{ message.name || "Anonymous" }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatTime(message.created_at) }}
              </p>
            </div>
            <span
              class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300"
            >
              Approved
            </span>
          </div>
          <p class="mb-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {{ message.message }}
          </p>
          <button
            type="button"
            @click="handleDeleteMessage(message.id)"
            :disabled="props.actionLoading === message.id"
            class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
          >
            <svg
              v-if="props.actionLoading === message.id"
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
        class="rounded-xl bg-gray-50 p-8 text-center dark:bg-gray-700/30"
      >
        <p class="text-gray-500 dark:text-gray-400">
          No approved messages yet.
        </p>
      </div>
    </div>
  </div>
</template>
