<script setup lang="ts">
import { blogService } from '@/service/blogService';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { computed, ref } from 'vue';

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

const author = ref('');
const email = ref('');
const site = ref('');
const body = ref('');
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
    console.log('Submitting comment:', {
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
    notifier.success('评论已提交，等待审核');

    // Reset form
    body.value = '';
    author.value = '';
    email.value = '';
    site.value = '';
  } catch (error) {
    console.error('Error submitting comment:', error);
    notifier.error('评论提交失败，请稍后重试');
  } finally {
    isSubmitting.value = false;
  }
};

// Quick emoji reactions
const emojis = ['👍', '❤️', '😊', '🎉', '🤔', '👀'];

const addEmoji = (emoji: string) => {
  body.value += emoji;
};
</script>

<template>
  <div
    :class="[
      isReply
        ? 'bg-muted ring-border mt-4 rounded-xl p-4 ring-1'
        : 'border-border bg-card mt-8 rounded-2xl border p-5 shadow-sm',
    ]"
  >
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <h4 v-if="!isReply" class="text-foreground gap-2 text-lg font-semibold">
        发表评论
        <span
          class="border-primary/20 bg-primary/10 text-primary/70 ml-2 rounded-full border px-4 py-2 text-xs font-medium"
          >*评论发布后请等待管理员审核</span
        >
      </h4>
      <h4 v-else class="text-muted-foreground text-sm font-medium">
        回复 @{{ replyToAuthor }}
      </h4>

      <!-- Cancel reply button -->
      <button
        v-if="isReply && replyTo"
        class="text-muted-foreground hover:text-foreground text-sm transition-colors"
        @click="$emit('cancelReply')"
      >
        取消
      </button>
    </div>

    <!-- User info for unauthenticated users -->
    <template v-if="!auth.isAuthenticated">
      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="relative">
          <label class="text-muted-foreground mb-1.5 block text-xs font-medium">
            昵称 *
          </label>
          <input
            v-model="author"
            type="text"
            placeholder="你的名字"
            class="border-border bg-muted focus:border-primary focus:bg-card focus:ring-primary/20 w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
          />
        </div>
        <div class="relative">
          <label class="text-muted-foreground mb-1.5 block text-xs font-medium">
            邮箱 *
          </label>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="border-border bg-muted focus:border-primary focus:bg-card focus:ring-primary/20 w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
          />
        </div>
      </div>
      <div class="mb-4">
        <label class="text-muted-foreground mb-1.5 block text-xs font-medium">
          网站
        </label>
        <input
          v-model="site"
          type="url"
          placeholder="https://yourwebsite.com"
          class="border-border bg-muted focus:border-primary focus:bg-card focus:ring-primary/20 w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
        />
      </div>
    </template>

    <!-- Comment input area -->
    <div
      :class="[
        'relative rounded-xl border transition-all duration-200',
        isFocused
          ? 'border-primary bg-card ring-primary/20 ring-2'
          : 'border-border bg-muted',
      ]"
    >
      <textarea
        v-model="body"
        rows="4"
        :placeholder="isReply ? '写下你的回复...' : '写下你的评论...'"
        :maxlength="maxChars"
        class="text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border-0 bg-transparent px-4 py-3 text-sm focus:ring-0 focus:outline-none"
        @focus="isFocused = true"
        @blur="isFocused = false"
      ></textarea>

      <!-- Toolbar -->
      <div
        class="border-border flex items-center justify-between border-t px-3 py-2"
      >
        <!-- Quick emojis -->
        <div class="flex items-center gap-1">
          <button
            v-for="emoji in emojis"
            :key="emoji"
            type="button"
            class="hover:bg-accent rounded-lg p-1.5 text-lg transition-all hover:scale-110"
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
              ? 'text-destructive'
              : charCount > maxChars * 0.9
                ? 'text-orange-500'
                : 'text-muted-foreground',
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
        class="text-muted-foreground mr-auto text-xs"
      >
        * 为必填项，邮箱不会被公开显示
      </p>

      <button
        type="submit"
        :disabled="!isValid || isSubmitting"
        :class="[
          'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200',
          isValid && !isSubmitting
            ? 'bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 shadow-lg'
            : 'bg-muted text-muted-foreground cursor-not-allowed',
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

        {{ isSubmitting ? '提交中...' : '发表评论' }}
      </button>
    </div>
  </div>
</template>
