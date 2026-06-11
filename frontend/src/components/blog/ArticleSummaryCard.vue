<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification';
import { useArticleChat } from '@/composables/useArticleChat';
import { useArticleSummary } from '@/composables/useArticleSummary';
import { useShimmerTips } from '@/composables/useShimmerTips';
import { AnimatePresence, motion } from 'motion-v';
import { computed, onMounted, ref, watch } from 'vue';

enum CardMode {
  SUMMARY = 'summary',
  CHAT = 'chat',
}

const props = defineProps<{
  title?: string;
  content: string;
}>();

const notifier = useNotificationStore();
const apiBase = import.meta.env.VITE_API_BASE || '/api';

const articleCtx = { title: props.title, content: props.content };
const {
  loading: summaryLoading,
  summary,
  hasGenerated: summaryHasGenerated,
  errorMessage: summaryError,
  canSummarize,
  checkCachedSummary,
  generate,
} = useArticleSummary(articleCtx, apiBase);
const {
  messages,
  chatInput,
  loading: chatLoading,
  errorMessage: chatError,
  canChat,
  bindContainer,
  enterChat,
  clearChat,
  send,
  onInputKeydown,
} = useArticleChat(articleCtx, apiBase);
const { tips: textShimmer, active: shimmerActive } = useShimmerTips();

const cardMode = ref<CardMode>(CardMode.SUMMARY);

const loading = computed(() => summaryLoading.value || chatLoading.value);
const hasGenerated = computed(
  () => summaryHasGenerated.value || messages.value.length > 0,
);
const errorMessage = computed(
  () => summaryError.value || chatError.value,
);

watch(loading, (on) => {
  shimmerActive.value = on;
});

onMounted(async () => {
  await checkCachedSummary();
});

async function onGenerate() {
  await generate((msg) => notifier.error(msg));
}

async function onSendChat() {
  await send((msg) => notifier.error(msg));
}

function onChatKeydown(e: KeyboardEvent) {
  onInputKeydown(e, onSendChat);
}

async function switchToChat() {
  cardMode.value = CardMode.CHAT;
  await enterChat();
}
</script>

<template>
  <section
    class="summary-card shadow-glow border-primary/20 bg-primary/10 dark:border-border dark:bg-card/70 mb-6 overflow-hidden rounded-2xl border p-5 transition-all"
    :class="{ 'is-loading': loading }"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <h3
        class="text-primary dark:text-primary flex items-center gap-2 text-base font-semibold"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-bot-icon lucide-bot"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
        <template v-if="cardMode === CardMode.SUMMARY"> AI 文章总结 </template>
        <template v-else> AI 对话 </template>
        <AnimatePresence mode="wait">
          <motion.span
            v-if="loading"
            :key="textShimmer[0]"
            :initial="{ opacity: 0, y: 10 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -10 }"
            :transition="{ duration: 0.3 }"
            class="animate-shimmer pl-2 text-xs"
          >
            {{ textShimmer[0] }}</motion.span
          >
        </AnimatePresence>
      </h3>
      <div class="flex items-center gap-2">
        <button
          class="cursor-pointer rounded-md px-2 py-1 text-xs"
          :class="
            cardMode === CardMode.SUMMARY
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/20 text-primary dark:bg-card dark:text-foreground'
          "
          :disabled="loading"
          @click="cardMode = CardMode.SUMMARY"
        >
          总结
        </button>
        <button
          class="cursor-pointer rounded-md px-2 py-1 text-xs"
          :class="
            cardMode === CardMode.CHAT
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/20 text-primary dark:bg-card dark:text-foreground'
          "
          :disabled="loading"
          @click="switchToChat"
        >
          对话
        </button>
        <button
          v-if="cardMode === CardMode.SUMMARY"
          class="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/30 dark:disabled:bg-primary/30 inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed"
          :disabled="!canSummarize"
          @click="onGenerate"
        >
          <svg
            v-if="loading"
            class="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {{ loading ? '总结中...' : summaryHasGenerated ? '重新总结' : '生成总结' }}
        </button>
        <button
          v-if="cardMode === CardMode.CHAT && messages.length > 0"
          class="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground cursor-pointer rounded-md px-2 py-1 text-xs"
          :disabled="loading"
          @click="clearChat"
        >
          清空
        </button>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="text-destructive dark:text-destructive text-sm"
    >
      {{ errorMessage }}
    </p>

    <template v-if="cardMode === CardMode.SUMMARY">
      <Transition name="summary-fade" mode="out-in">
        <p
          v-if="summary"
          key="result"
          class="text-foreground dark:text-foreground text-sm leading-7 whitespace-pre-line"
        >
          {{ summary
          }}<span v-if="loading" class="animate-breathe ml-0.5">|</span>
        </p>
        <p
          v-else
          key="placeholder"
          class="text-muted-foreground dark:text-muted-foreground text-sm"
        >
          点击"生成总结"，快速提炼当前文章重点。
        </p>
      </Transition>
    </template>

    <template v-else>
      <div
        v-if="!hasGenerated"
        class="text-muted-foreground dark:text-muted-foreground text-sm"
      ></div>
      <template v-else>
        <div
          :ref="bindContainer"
          class="mb-1 max-h-80 space-y-3 overflow-y-auto pr-1"
        >
          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-6 whitespace-pre-line"
              :class="
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground dark:bg-card dark:text-foreground shadow-sm'
              "
            >
              <template v-if="msg.content">
                {{ msg.content
                }}<span
                  v-if="
                    loading &&
                    idx === messages.length - 1 &&
                    msg.role === 'assistant'
                  "
                  class="animate-breathe ml-0.5"
                  >|</span
                >
              </template>
              <template v-else-if="loading && idx === messages.length - 1">
                <span class="text-muted-foreground animate-pulse"
                  >思考中...</span
                >
              </template>
            </div>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <input
            v-model="chatInput"
            type="text"
            placeholder="继续提问..."
            class="border-border bg-card text-foreground placeholder-muted-foreground focus:border-ring focus:ring-ring dark:border-border dark:bg-card dark:text-foreground dark:placeholder-muted-foreground dark:focus:border-ring dark:focus:ring-ring flex-1 rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            :disabled="loading"
            @keydown="onChatKeydown"
          />
          <button
            class="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/30 dark:disabled:bg-primary/30 inline-flex cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed"
            :disabled="!canChat"
            @click="onSendChat"
          >
            <svg
              v-if="loading"
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <svg
              v-else
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.summary-card {
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;
}
.shadow-glow {
  box-shadow: 0 1px 20px rgba(105, 163, 255, 0.253);
}

.summary-card:hover {
  transform: translateY(-3px);
}

.summary-card.is-loading {
  animation: card-breathe 1.6s ease-in-out infinite;
}

.summary-fade-enter-active,
.summary-fade-leave-active {
  transition: all 260ms ease;
}

.summary-fade-enter-from,
.summary-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes card-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(59, 130, 246, 0);
    border-color: rgb(191 219 254);
  }
  50% {
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.16);
    border-color: rgb(147 197 253);
  }
}
</style>
