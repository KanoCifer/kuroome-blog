<script setup lang="ts">
import { fetchAndStoreCSRF } from "@/api/csrf";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import { AnimatePresence, motion } from "motion-v";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

enum CardMode {
  SUMMARY = "summary",
  CHAT = "chat",
}

const props = defineProps<{
  title?: string;
  content: string;
}>();

const auth = useAuthStore();
const notifier = useNotificationStore();

const cardMode = ref<CardMode>(CardMode.SUMMARY);
const loading = ref<boolean>(false);
const summary = ref<string>("");
const hasGenerated = ref<boolean>(false);
const errorMessage = ref<string>("");

const messages = ref<ChatMessage[]>([]);
const chatInput = ref<string>("");
const sessionId = ref<string>("");
const messagesContainer = ref<HTMLElement | null>(null);

const pureContent = computed(() =>
  props.content.replaceAll(/<[^>]+>/g, "").trim(),
);

const canSummarize = computed(
  () => pureContent.value.length > 0 && !loading.value,
);

const canChat = computed(
  () =>
    hasGenerated.value && chatInput.value.trim().length > 0 && !loading.value,
);

/** 生成对话会话 ID（新对话或清空时使用） */
function generateSessionId() {
  return `summary_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 检查是否有已缓存的文章总结
 * 使用 POST + JSON body 传递文章内容，避免 GET 查询参数过长导致 431 错误
 * 页面加载时自动调用，命中缓存则直接显示历史总结
 */
async function checkCachedSummary() {
  if (!auth.isAuthenticated || !pureContent.value) return;
  try {
    const res = await fetch("/api/v1/agent/history/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        article_content: pureContent.value,
        article_title: props.title || undefined,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.cached && data.summary) {
      summary.value = data.summary;
      hasGenerated.value = true;
    }
  } catch {
    // 缓存查询失败不影响正常使用，静默忽略
  }
}

/**
 * 加载历史对话记录
 * 切换到对话模式时调用，恢复之前与 AI 的聊天上下文
 * 同样使用 POST 避免 431 错误
 */
async function loadChatHistory() {
  if (!auth.isAuthenticated || !pureContent.value) return;
  try {
    const res = await fetch("/api/v1/agent/history/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        article_content: pureContent.value,
        article_title: props.title || undefined,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.cached && data.messages?.length > 0) {
      messages.value = data.messages;
      sessionId.value = data.session_id;
    }
  } catch {
    // 缓存查询失败不影响正常使用，静默忽略
  }
}

onMounted(async () => {
  await fetchAndStoreCSRF();
  // 页面加载时自动检查是否有已缓存的总结
  await checkCachedSummary();
});

// 登录状态变化时重新检查缓存（兼容登录后切换回页面的场景）
watch(
  () => auth.isAuthenticated,
  async (isAuth) => {
    if (isAuth && !summary.value && !loading.value) {
      await checkCachedSummary();
    }
  },
);

async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

async function generateSummaryStream() {
  if (!canSummarize.value) {
    notifier.error("文章内容为空，无法总结");
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  summary.value = "";

  try {
    const response = await fetch("/api/v1/agent/summary/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: props.title || "",
        content: pureContent.value,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim() || !part.startsWith("data:")) continue;
        const jsonStr = part.replace(/^data:\s*/, "").trim();
        if (jsonStr === "[DONE]") {
          hasGenerated.value = true;
          break;
        }
        try {
          const data = JSON.parse(jsonStr);
          if (data.content) summary.value += data.content;
          if (data.is_end) hasGenerated.value = true;
        } catch {
          // ignore parse errors
        }
      }
    }
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : "AI总结失败，请稍后重试";
    notifier.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function sendChatMessage() {
  if (!canChat.value) return;

  const userMessage = chatInput.value.trim();
  chatInput.value = "";

  if (!sessionId.value) {
    sessionId.value = generateSessionId();
  }

  messages.value.push({ role: "user", content: userMessage });
  messages.value.push({ role: "assistant", content: "" });
  await scrollToBottom();

  loading.value = true;
  errorMessage.value = "";

  const assistantIdx = messages.value.length - 1;
  const isFirstMessage =
    messages.value.filter((m) => m.role === "user").length === 1;

  try {
    const body: Record<string, string> = {
      message: userMessage,
      session_id: sessionId.value,
    };
    if (isFirstMessage) {
      body.article_content = pureContent.value;
      body.article_title = props.title || "";
    }

    const response = await fetch("/api/v1/agent/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim() || !part.startsWith("data:")) continue;
        const jsonStr = part.replace(/^data:\s*/, "").trim();
        if (jsonStr === "[DONE]") break;
        try {
          const data = JSON.parse(jsonStr);
          if (data.content) {
            messages.value[assistantIdx].content += data.content;
            await scrollToBottom();
          }
          if (data.is_end) break;
        } catch {
          // ignore parse errors
        }
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "对话失败，请稍后重试";
    messages.value[assistantIdx].content = `[ERROR] ${msg}`;
    notifier.error(msg);
  } finally {
    loading.value = false;
  }
}

async function onGenerate() {
  if (!auth.isAuthenticated) {
    notifier.error("请先登录以使用AI功能");
    return;
  }
  await fetchAndStoreCSRF();
  await generateSummaryStream();
}

async function onSendChat() {
  if (!auth.isAuthenticated) {
    notifier.error("请先登录以使用AI功能");
    return;
  }
  await fetchAndStoreCSRF();
  await sendChatMessage();
}

function onChatKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSendChat();
  }
}

/** 切换到对话模式：加载历史对话或创建新会话 */
async function switchToChat() {
  cardMode.value = CardMode.CHAT;
  if (!sessionId.value) {
    await loadChatHistory();
    if (!sessionId.value) {
      sessionId.value = generateSessionId();
    }
  }
}

function clearChat() {
  messages.value = [];
  sessionId.value = generateSessionId();
}

const textShimmer = ref<string[]>([
  "正在分析文章结构...",
  "正在提取关键信息...",
  "正在生成总结内容...",
]);
let textShimmerInterval: ReturnType<typeof setInterval> | null = null;

watch(
  () => loading.value,
  (newVal) => {
    if (newVal) {
      textShimmerInterval = setInterval(() => {
        const first = textShimmer.value.shift();
        if (first) textShimmer.value.push(first);
      }, 2000);
    } else if (textShimmerInterval) {
      clearInterval(textShimmerInterval);
      textShimmerInterval = null;
    }
  },
);

onUnmounted(() => {
  if (textShimmerInterval) clearInterval(textShimmerInterval);
});
</script>

<template>
  <section
    class="summary-card shadow-glow mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/70 p-5 transition-all dark:border-slate-700 dark:bg-slate-800/70"
    :class="{ 'is-loading': loading }"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <h3 class="text-base font-semibold text-blue-900 dark:text-blue-100">
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
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-slate-200'
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
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-slate-200'
          "
          :disabled="loading"
          @click="switchToChat"
        >
          对话
        </button>
        <button
          v-if="cardMode === CardMode.SUMMARY"
          class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-slate-600"
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
          {{ loading ? "总结中..." : hasGenerated ? "重新总结" : "生成总结" }}
        </button>
        <button
          v-if="cardMode === CardMode.CHAT && messages.length > 0"
          class="cursor-pointer rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          :disabled="loading"
          @click="clearChat"
        >
          清空
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-500 dark:text-red-400">
      {{ errorMessage }}
    </p>

    <template v-if="cardMode === CardMode.SUMMARY">
      <Transition name="summary-fade" mode="out-in">
        <p
          v-if="summary"
          key="result"
          class="text-sm leading-7 whitespace-pre-line text-slate-700 dark:text-slate-200"
        >
          {{ summary
          }}<span v-if="loading" class="animate-breathe ml-0.5">|</span>
        </p>
        <p
          v-else
          key="placeholder"
          class="text-sm text-slate-500 dark:text-slate-400"
        >
          点击"生成总结"，快速提炼当前文章重点。
        </p>
      </Transition>
    </template>

    <template v-else>
      <div
        v-if="!hasGenerated"
        class="text-sm text-slate-500 dark:text-slate-400"
      >
        请先生成文章总结，再开始对话。
      </div>
      <template v-else>
        <div
          ref="messagesContainer"
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200'
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
                <span class="animate-pulse text-slate-400">思考中...</span>
              </template>
            </div>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <input
            v-model="chatInput"
            type="text"
            placeholder="继续提问..."
            class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            :disabled="loading"
            @keydown="onChatKeydown"
          />
          <button
            class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-slate-600"
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
