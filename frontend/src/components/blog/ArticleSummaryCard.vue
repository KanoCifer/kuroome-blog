<script setup lang="ts">
import request, { fetchAndStoreCSRF } from "@/request";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import type { ApiResponse } from "@/types";
import { AnimatePresence, motion } from "motion-v";
import { computed, onUnmounted, ref, watch } from "vue";
interface SummaryPayload {
  summary: string;
}

enum SummaryMode {
  NORMAL = "normal",
  STREAM = "stream",
}

const props = defineProps<{
  title?: string;
  content: string;
}>();
const auth = useAuthStore();
const notifier = useNotificationStore();
const loading = ref<boolean>(false);
const summary = ref<string>("");
const hasGenerated = ref<boolean>(false);
const errorMessage = ref<string>("");
const mode = ref<SummaryMode>(SummaryMode.STREAM);

const pureContent = computed(() =>
  props.content.replaceAll(/<[^>]+>/g, "").trim(),
);

const canSummarize = computed(() => {
  return pureContent.value.length > 0 && !loading.value;
});

// 普通生成总结的函数
const generateSummary = async () => {
  if (!canSummarize.value) {
    notifier.error("文章内容为空，无法总结");
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const res = await request.post<ApiResponse<SummaryPayload>>(
      "/agent/summary",
      {
        title: props.title || "",
        content: pureContent.value,
      },
    );

    if (res.data.status === "success" && res.data.data?.summary) {
      summary.value = res.data.data.summary;
      hasGenerated.value = true;
      return;
    }
    throw new Error(res.data.message || "生成总结失败");
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : "生成总结失败，请稍后重试";
    notifier.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
};
// 流式生成总结的函数
const generateSummaryStream = async () => {
  if (!canSummarize.value) {
    notifier.error("文章内容为空，无法总结");
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  summary.value = "";

  try {
    // ========== 第1步：发送请求，获取响应流 ==========
    const response = await fetch("/api/v1/agent/summary/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 携带 Cookie
      body: JSON.stringify({
        title: props.title || "",
        content: pureContent.value,
      }),
    });

    // 检查 HTTP 状态码是否正常
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // ========== 第2步：从响应中获取流读取器 ==========
    // response.body 是浏览器提供的 ReadableStream 对象
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法读取响应流");
    }

    // 创建文本解码器，用于将字节流转换为字符串
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    // ========== 第3步：循环读取流数据 ==========
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const messages = buffer.split("\n\n");
      buffer = messages.pop() || ""; // 最后一部分保留在缓冲区

      for (const msg of messages) {
        if (msg.trim() === "") continue; // 跳过空消息

        // SSE 事件格式：data: {...}\n\n
        if (!msg.startsWith("data:")) {
          console.warn("未知消息格式：", msg);
          continue;
        }

        const jsonStr = msg.replace(/^data:\s*/, "").trim(); // 去掉 "data:" 前缀
        if (jsonStr === "[DONE]") {
          // 服务器表示总结完成了
          hasGenerated.value = true;
          break;
        }

        try {
          const data = JSON.parse(jsonStr);
          if (data.content) {
            summary.value += data.content;
          }
          if (data.is_end) {
            hasGenerated.value = true;
          }
        } catch (e) {
          console.warn("JSON 解析失败错误：", e);
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
};

const onGenerate = async () => {
  if (!auth.isAuthenticated) {
    notifier.error("请先登录以使用AI总结功能");
    return;
  }
  await fetchAndStoreCSRF();
  if (mode.value === SummaryMode.STREAM) {
    await generateSummaryStream();
    return;
  }
  await generateSummary();
};

// 处理流光文字
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
        if (first) {
          textShimmer.value.push(first);
        }
      }, 2000);
    } else {
      if (textShimmerInterval) {
        clearInterval(textShimmerInterval);
        textShimmerInterval = null;
      }
    }
  },
);

onUnmounted(() => {
  if (textShimmerInterval) {
    clearInterval(textShimmerInterval);
  }
});
</script>

<template>
  <section
    class="summary-card shadow-glow mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/70 p-5 transition-all dark:border-slate-700 dark:bg-slate-800/70"
    :class="{ 'is-loading': loading }"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <h3 class="text-base font-semibold text-blue-900 dark:text-blue-100">
        AI 文章总结
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
            mode === SummaryMode.STREAM
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-slate-200'
          "
          :disabled="loading"
          @click="mode = SummaryMode.STREAM"
        >
          流式
        </button>
        <button
          class="cursor-pointer rounded-md px-2 py-1 text-xs"
          :class="
            mode === SummaryMode.NORMAL
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-700 dark:bg-slate-700 dark:text-slate-200'
          "
          :disabled="loading"
          @click="mode = SummaryMode.NORMAL"
        >
          普通
        </button>
        <button
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
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-500 dark:text-red-400">
      {{ errorMessage }}
    </p>

    <Transition name="summary-fade" mode="out-in">
      <p
        v-if="summary"
        key="result"
        class="text-sm leading-7 whitespace-pre-line text-slate-700 dark:text-slate-200"
      >
        {{ summary
        }}<span
          v-if="loading && mode === 'stream'"
          class="animate-breathe ml-0.5"
          >|</span
        >
      </p>
      <p
        v-else
        key="placeholder"
        class="text-sm text-slate-500 dark:text-slate-400"
      >
        点击“生成总结”，快速提炼当前文章重点。
      </p>
    </Transition>
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

@keyframes caret-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
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
