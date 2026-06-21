<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification';
import { useArticleChat } from '@/composables/article';
import { useArticleSummary } from '@/composables/article';
import { useShimmerTips } from '@/composables/shared';
import { AnimatePresence, motion } from 'motion-v';
import { computed, onMounted, ref, watch } from 'vue';
import { Marked } from 'marked';
import dompurify from 'dompurify';

const marked = new Marked();
function renderMarkdown(text: string): string {
  return dompurify.sanitize(marked.parse(text) as string);
}

const renderedSummary = computed(() =>
  summary.value ? renderMarkdown(summary.value) : '',
);

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
  selectedModel,
  modelOptions,
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
const errorMessage = computed(() => summaryError.value || chatError.value);

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
    class="summary-card bg-background/60 dark:bg-background/50 border-border/60 mb-6 overflow-hidden rounded-2xl border shadow-sm transition-all"
    :class="{ 'is-loading': loading }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <div class="flex items-center gap-2.5">
        <div
          class="bg-primary/10 dark:bg-primary/15 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-primary"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </div>
        <h3 class="text-foreground text-base font-semibold tracking-tight">
          <template v-if="cardMode === CardMode.SUMMARY"> AI 总结 </template>
          <template v-else> AI 对话 </template>
        </h3>
        <AnimatePresence mode="wait">
          <motion.span
            v-if="loading"
            :key="textShimmer[0]"
            :initial="{ opacity: 0, y: 6 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -6 }"
            :transition="{ duration: 0.25 }"
            class="text-muted-foreground text-sm"
          >
            {{ textShimmer[0] }}
          </motion.span>
        </AnimatePresence>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- Mode tabs — segmented control -->
        <div class="bg-muted/60 dark:bg-muted/40 inline-flex rounded-lg p-0.5">
          <button
            class="relative cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-all"
            :class="
              cardMode === CardMode.SUMMARY
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="loading"
            @click="cardMode = CardMode.SUMMARY"
          >
            总结
          </button>
          <button
            class="relative cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-all"
            :class="
              cardMode === CardMode.CHAT
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="loading"
            @click="switchToChat"
          >
            对话
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar: model selector + action button -->
    <div class="flex items-center gap-2 px-5 pb-3">
      <template v-if="cardMode === CardMode.SUMMARY">
        <select
          v-model="selectedModel"
          class="border-border/70 bg-muted/40 text-foreground dark:border-border/70 dark:bg-muted/30 dark:text-foreground focus:ring-ring cursor-pointer rounded-md border px-2.5 py-1.5 text-sm transition-colors focus:ring-1 focus:outline-none"
          :disabled="loading"
        >
          <option
            v-for="opt in modelOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <button
          class="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/30 dark:disabled:bg-primary/30 ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed"
          :disabled="!canSummarize"
          @click="onGenerate"
        >
          <svg
            v-if="loading"
            class="h-3.5 w-3.5 animate-spin"
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
          {{
            loading
              ? '总结中...'
              : summaryHasGenerated
                ? '重新总结'
                : '生成总结'
          }}
        </button>
      </template>
      <template v-else>
        <button
          v-if="messages.length > 0"
          class="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground ml-auto cursor-pointer rounded-md px-2.5 py-1 text-sm transition-colors"
          :disabled="loading"
          @click="clearChat"
        >
          清空对话
        </button>
      </template>
    </div>

    <!-- Error message -->
    <p
      v-if="errorMessage"
      class="text-destructive dark:text-destructive px-5 pb-3 text-sm"
    >
      {{ errorMessage }}
    </p>

    <!-- Summary content -->
    <template v-if="cardMode === CardMode.SUMMARY">
      <div class="border-border/40 border-t px-5 pt-4 pb-5">
        <Transition name="summary-fade" mode="out-in">
          <div
            v-if="summary"
            key="result"
            class="prose max-w-none"
            v-html="renderedSummary"
          ></div>
          <div v-else key="placeholder" class="flex items-center gap-3 py-3">
            <div
              class="bg-muted/50 dark:bg-muted/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-muted-foreground"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
                />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            </div>
            <p
              class="text-muted-foreground dark:text-muted-foreground text-base leading-relaxed"
            >
              点击「生成总结」，快速提炼文章核心要点
            </p>
          </div>
        </Transition>
      </div>
    </template>

    <!-- Chat content -->
    <template v-else>
      <div class="border-border/40 border-t">
        <template v-if="!hasGenerated">
          <div class="px-5 py-6 text-center">
            <p class="text-muted-foreground text-base">
              切换到对话模式后，输入问题即可开始讨论文章内容
            </p>
          </div>
        </template>
        <template v-else>
          <div
            :ref="bindContainer"
            class="max-h-72 space-y-2.5 overflow-y-auto px-5 py-4"
          >
            <div
              v-for="(msg, idx) in messages"
              :key="idx"
              class="flex"
              :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-base leading-relaxed"
                :class="
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground whitespace-pre-line'
                    : 'bg-muted/50 text-foreground dark:bg-muted/30 dark:text-foreground prose max-w-none'
                "
              >
                <template v-if="msg.role === 'user'">
                  {{ msg.content }}
                </template>
                <template v-else>
                  <div
                    v-if="msg.content"
                    v-html="renderMarkdown(msg.content)"
                  ></div>
                  <span
                    v-if="loading && idx === messages.length - 1 && msg.content"
                    class="text-muted-foreground ml-0.5 animate-pulse"
                    >▎</span
                  >
                </template>
                <template
                  v-if="loading && idx === messages.length - 1 && !msg.content"
                >
                  <span class="text-muted-foreground animate-pulse"
                    >思考中...</span
                  >
                </template>
              </div>
            </div>
          </div>

          <div
            class="border-border/40 flex items-center gap-2 border-t px-4 py-3"
          >
            <input
              v-model="chatInput"
              type="text"
              placeholder="继续提问..."
              class="border-border/70 bg-muted/30 text-foreground placeholder-muted-foreground focus:border-ring focus:ring-ring dark:border-border/70 dark:bg-muted/20 dark:text-foreground dark:placeholder-muted-foreground dark:focus:border-ring dark:focus:ring-ring flex-1 rounded-lg border px-3.5 py-2.5 text-base transition-colors focus:ring-1 focus:outline-none"
              :disabled="loading"
              @keydown="onChatKeydown"
            />
            <button
              class="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/30 dark:disabled:bg-primary/30 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition disabled:cursor-not-allowed"
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
      </div>
    </template>
  </section>
</template>

<style scoped>
.summary-card {
  transition:
    transform 200ms ease,
    box-shadow 200ms ease,
    border-color 200ms ease;
}

.summary-card:hover {
  transform: translateY(-1px);
  box-shadow:
    0 4px 16px -2px oklch(from var(--color-primary) l c h / 0.08),
    0 1px 4px oklch(from var(--color-primary) l c h / 0.04);
}

.summary-card.is-loading {
  animation: card-breathe 2s ease-in-out infinite;
}

.summary-fade-enter-active,
.summary-fade-leave-active {
  transition: all 200ms ease;
}

.summary-fade-enter-from,
.summary-fade-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

@keyframes card-breathe {
  0%,
  100% {
    border-color: oklch(from var(--color-primary) l c h / 0.15);
  }
  50% {
    border-color: oklch(from var(--color-primary) l c h / 0.35);
    box-shadow: 0 4px 20px oklch(from var(--color-primary) l c h / 0.08);
  }
}
</style>
