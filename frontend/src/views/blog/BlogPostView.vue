<script setup lang="ts">
import { BasicDetail } from "@/components/basic";
import ArticleSummaryCard from "@/components/blog/ArticleSummaryCard.vue";
import TwikooComments from "@/components/blog/TwikooComments.vue";
import { blogService } from "@/service/blogService";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import type { Post } from "@/types";
import { formatDate } from "@/utils/formatdate";
import { ExclamationCircleOutlined } from "@ant-design/icons-vue";
import { useHead } from "@unhead/vue";
import { Modal } from "ant-design-vue";
import hljs from "highlight.js/lib/common";
import "highlight.js/scss/rainbow.scss";
import { marked } from "marked";
import {
  computed,
  createVNode,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import CalendarIcon from "@/components/icons/CalendarIcon.vue";
import DelIcon from "@/components/icons/DelIcon.vue";
import EditIcon from "@/components/icons/EditIcon.vue";

const route = useRoute();
const router = useRouter();
const postId = ref<string>(route.params.id as string);

const post = ref<Post | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");

const auth = useAuthStore();
const showEditButton = computed(() => !!auth.user?.is_admin);

const fetchPost = async () => {
  if (!postId.value) {
    errorMessage.value = "无效的文章 ID";
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await blogService.getLegacyPost(postId.value);
    post.value = res as unknown as Post;
  } catch (err: unknown) {
    console.error(err);
    errorMessage.value =
      err instanceof Error ? err.message : "加载文章失败，请稍后重试。";
    useNotificationStore().error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

const handleRetry = () => {
  fetchPost();
};

onMounted(() => {
  fetchPost();
});

watch(
  () => route.params.id,
  (newId): void => {
    if (newId && newId !== postId.value) {
      postId.value = newId as string;
      fetchPost();
    }
  },
);

watch(
  () => post.value?.body,
  async (html): Promise<void> => {
    if (!html) return;
    await nextTick();
    hljs.highlightAll();
    setupCodeCopy();
  },
);

const renderedBody = computed(() => {
  if (!post.value?.body) return "";
  return marked.parse(post.value.body, {
    async: false,
    breaks: false,
  }) as string;
});

const subtitle = computed(() => {
  if (!post.value) return "";
  const { author, created_at, category } = post.value;
  return [author, created_at && formatDate(created_at), category?.name]
    .filter(Boolean)
    .join(" · ");
});

useHead(() => {
  const title = post.value
    ? `${post.value.title} - ReadingList`
    : "文章未找到 - ReadingList";
  const desc = post.value
    ? post.value.summary || `阅读 ${post.value.title} 的完整内容`
    : "抱歉，您请求的文章不存在或已被删除";
  const keywords = post.value
    ? [
        post.value.title,
        post.value.author || "Kurroome",
        post.value.category?.name || "博客",
        "阅读",
        "读书笔记",
        "个人博客",
      ]
        .filter(Boolean)
        .join(", ")
    : "文章未找到, 阅读清单, ReadingList";

  return {
    title,
    meta: [
      { name: "description", content: desc },
      { name: "keywords", content: keywords },
      { property: "og:title", content: post.value?.title ?? "文章未找到" },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: `https://readinglist.example.com/blog/${postId.value}`,
      },
      {
        property: "og:article:author",
        content: post.value?.author || "Kurroome",
      },
      {
        property: "og:article:published_time",
        content: post.value?.created_at,
      },
      { property: "og:article:modified_time", content: post.value?.updated_at },
      {
        property: "og:article:section",
        content: post.value?.category?.name || "博客",
      },
      { name: "twitter:title", content: post.value?.title ?? "文章未找到" },
      { name: "twitter:description", content: desc },
    ],
  };
});

const showDeleteConfirm = () => {
  Modal.confirm({
    title: "Are you sure delete this Post?",
    icon: createVNode(ExclamationCircleOutlined),
    content: "The action cannot be undone.",
    okText: "Yes",
    okType: "danger",
    cancelText: "No",
    centered: true,
    wrapClassName: "modal",
    onOk() {
      handleDelete();
    },
    onCancel() {},
  });
};

const handleDelete = async () => {
  try {
    await blogService.deleteLegacyPost(postId.value);
    useNotificationStore().success("文章删除成功");
    router.push("/blog");
  } catch (err: unknown) {
    console.error("删除文章失败:", err);
    const errorMsg =
      err instanceof Error ? err.message : "删除文章失败，请稍后重试";
    useNotificationStore().error(errorMsg);
  }
};

let clickHandler: ((event: Event) => void) | undefined;
const setupCodeCopy = () => {
  const contentContainer = document.querySelector(".prose");
  if (!contentContainer) return;

  if (clickHandler) {
    contentContainer.removeEventListener("click", clickHandler);
  }

  clickHandler = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("copy-btn")) {
      const codeBlock = target.closest("pre");
      if (codeBlock) {
        const codeElement = codeBlock.querySelector("code");
        if (codeElement) {
          navigator.clipboard
            .writeText(codeElement.textContent ?? "")
            .then(() => {
              useNotificationStore().success("代码已复制到剪贴板");
            })
            .catch(() => {
              useNotificationStore().error("复制失败，请手动复制");
            });
        }
      }
    }
  };

  contentContainer.addEventListener("click", clickHandler);

  contentContainer.querySelectorAll(".copy-btn").forEach((btn) => btn.remove());

  const codeBlocks = contentContainer.querySelectorAll("pre");
  codeBlocks.forEach((block) => {
    block.classList.add("w-[80%]", "whitespace-pre-wrap");
    const button = document.createElement("button");
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2z"/></svg>`;
    button.className =
      "copy-btn absolute top-2 right-3 rounded-lg bg-card px-2 py-1 hover:bg-gray-300";
    block.style.position = "relative";
    block.appendChild(button);
  });
};

onUnmounted(() => {
  const contentContainer = document.querySelector(".prose");
  if (contentContainer && clickHandler) {
    contentContainer.removeEventListener("click", clickHandler);
  }
});
</script>

<template>
  <BasicDetail :title="post?.title || ''" :subtitle="subtitle">
    <!-- Loading -->
    <div v-if="isLoading" class="sm:col-span-2 lg:col-span-3">
      <div
        class="border-border bg-card animate-pulse space-y-6 rounded-2xl border p-8 shadow-sm"
      >
        <div class="bg-muted mb-6 h-8 w-3/4 rounded" />
        <div class="mb-8 flex gap-4">
          <div class="bg-muted h-4 w-24 rounded" />
          <div class="bg-muted h-4 w-32 rounded" />
        </div>
        <div class="space-y-4">
          <div class="bg-muted h-4 w-full rounded" />
          <div class="bg-muted h-4 w-full rounded" />
          <div class="bg-muted h-4 w-5/6 rounded" />
          <div class="bg-muted h-4 w-full rounded" />
          <div class="bg-muted h-4 w-4/5 rounded" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="sm:col-span-2 lg:col-span-3">
      <div
        class="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="text-destructive mb-4 h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p class="text-destructive text-lg font-medium">加载失败</p>
        <p class="text-muted-foreground mt-1 text-sm">{{ errorMessage }}</p>
        <button
          @click="handleRetry"
          class="bg-destructive/90 hover:bg-destructive mt-4 cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          重试
        </button>
      </div>
    </div>

    <!-- Content -->
    <template v-else>
      <div
        v-if="showEditButton && post"
        class="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-3"
      >
        <router-link
          :to="`/blog/edit/${post._id}`"
          class="bg-accent text-foreground hover:bg-accent/80 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          <EditIcon />
          编辑
        </router-link>
        <button
          @click="showDeleteConfirm"
          class="bg-destructive/10 text-destructive hover:bg-destructive/15 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          <DelIcon />
          删除
        </button>
      </div>

      <div
        v-if="post"
        class="border-border bg-card overflow-hidden rounded-2xl border shadow-sm sm:col-span-2 lg:col-span-3"
      >
        <div class="border-border border-b p-8">
          <h1 class="text-foreground mb-4 text-3xl leading-tight font-bold">
            {{ post.title }}
          </h1>

          <div class="text-primary flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <div
              v-if="post.author"
              class="flex items-center gap-1.5 font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="h-4 w-4"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              {{ post.author }}
            </div>

            <div v-if="post.created_at" class="flex items-center gap-1.5">
              <CalendarIcon />
              {{ formatDate(post.created_at) }}
            </div>
          </div>
        </div>

        <div class="p-8">
          <ArticleSummaryCard :title="post.title" :content="post.body || ''" />
          <div
            class="prose prose-lg dark:prose-invert article-content max-w-none"
          >
            <div v-if="post.body" v-html="renderedBody" />
            <div v-else class="text-muted-foreground italic">暂无内容</div>
          </div>
        </div>
      </div>

      <TwikooComments
        v-if="post"
        :path="`/blog/${postId}`"
        class="sm:col-span-2 lg:col-span-3"
      />
    </template>
  </BasicDetail>
</template>

<style>
@import "twikoo/dist/twikoo.css";

.copy-btn::before {
  content: "复制";
  position: absolute;
  bottom: -150%;
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  opacity: 0;
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
  padding: 4px 8px;
  background: var(--muted);
  color: white;
  border-radius: 4px;
  pointer-events: none;
  font-size: 0.875rem;
  white-space: nowrap;
}

.copy-btn:hover::before {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
/* ── 文章阅读体验优化 ── */
.article-content {
  /* 行高与阅读节奏 */
  --warm: var(--warm-gray);
  --tw-prose-body: var(--foreground);
  --tw-prose-headings: var(--foreground);
  --tw-prose-links: var(--primary);
  --tw-prose-bold: var(--foreground);
  --tw-prose-counters: var(--muted-foreground);
  --tw-prose-bullets: var(--muted-foreground);
  --tw-prose-hr: var(--border);
  --tw-prose-quotes: var(--muted-foreground);
  --tw-prose-quote-borders: var(--primary);
  --tw-prose-captions: var(--muted-foreground);
  --tw-prose-code: var(--foreground);
  --tw-prose-pre-code: var(--foreground);
  --tw-prose-pre-bg: var(--muted);
  --tw-prose-th-borders: var(--border);
  --tw-prose-td-borders: var(--border);

  font-size: 1.1rem;
  line-height: 2;
  font-weight: 500;
  font-family: "HarmonyOS Sans";
}

/* 标题层级优化 */
.article-content :where(h1):not(:where([class~="not-prose"] *)) {
  font-size: 2.25rem;
  font-weight: 700;
  margin-top: 2.5rem;
  margin-bottom: 1.25rem;
  line-height: 1.2;
}

.article-content :where(h2):not(:where([class~="not-prose"] *)) {
  font-size: 1.75rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  line-height: 1.3;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.article-content :where(h3):not(:where([class~="not-prose"] *)) {
  font-size: 1.375rem;
  font-weight: 600;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  line-height: 1.35;
}

/* 段落间距 */
.article-content :where(p):not(:where([class~="not-prose"] *)) {
  margin-bottom: 1.25rem;
}

/* 引用块美化 */
.article-content :where(blockquote):not(:where([class~="not-prose"] *)) {
  border-left-width: 4px;
  border-left-color: var(--primary);
  background: var(--warm);
  padding: 1rem 1.25rem;
  border-radius: 0 0.5rem 0.5rem 0;
  font-style: italic;
  margin: 1.5rem 0;
}

.article-content :where(blockquote p):not(:where([class~="not-prose"] *)) {
  margin-bottom: 0;
}

/* 代码块优化 */
.article-content :where(pre):not(:where([class~="not-prose"] *)) {
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin: 1.5rem 0;
  overflow-x: auto;
  background: var(--muted);
}

.article-content :where(code):not(:where([class~="not-prose"] *)) {
  font-size: 0.875em;
  padding: 0.15em 0.35em;
  border-radius: 0.25rem;
  background: var(--warm);
  border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
  font-family:
    ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", monospace;
  vertical-align: 0.05em;
}

.article-content :where(pre code):not(:where([class~="not-prose"] *)) {
  background: transparent;
  padding: 0;
  font-size: 1rem;
  line-height: 1.7;
  font-family:
    ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", monospace;
}

/* 列表优化 */
.article-content :where(ul, ol):not(:where([class~="not-prose"] *)) {
  margin: 1.25rem 0;
  padding-left: 1.75rem;
}

.article-content :where(li):not(:where([class~="not-prose"] *)) {
  margin-bottom: 0.5rem;
}

/* 图片居中 + 圆角 */
.article-content :where(img):not(:where([class~="not-prose"] *)) {
  border-radius: 0.75rem;
  margin: 1.5rem auto;
  display: block;
  max-width: 100%;
  height: auto;
}

/* 表格横向滚动 */
.article-content :where(table):not(:where([class~="not-prose"] *)) {
  display: block;
  overflow-x: auto;
  white-space: nowrap;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1.5rem 0;
  font-size: 0.9375rem;
}

.article-content :where(th, td):not(:where([class~="not-prose"] *)) {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.article-content :where(th):not(:where([class~="not-prose"] *)) {
  font-weight: 600;
  background: var(--muted);
  text-align: left;
}

.article-content :where(tr:hover):not(:where([class~="not-prose"] *)) {
  background: color-mix(in oklch, var(--muted) 30%, var(--card));
}

/* 分隔线 */
.article-content :where(hr):not(:where([class~="not-prose"] *)) {
  margin: 2.5rem 0;
  border-color: var(--border);
}

/* 链接样式 */
.article-content :where(a):not(:where([class~="not-prose"] *)) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 0.2em;
  text-decoration-thickness: 1px;
  transition: opacity 0.2s;
}

.article-content :where(a:hover):not(:where([class~="not-prose"] *)) {
  opacity: 0.8;
}

/* 暗色模式变量覆盖 */
/*.dark .article-content {
  --tw-prose-invert-body: var(--foreground);
  --tw-prose-invert-headings: var(--foreground);
  --tw-prose-invert-links: var(--primary);
  --tw-prose-invert-bold: var(--foreground);
  --tw-prose-invert-counters: var(--muted-foreground);
  --tw-prose-invert-bullets: var(--muted-foreground);
  --tw-prose-invert-hr: var(--border);
  --tw-prose-invert-quotes: var(--muted-foreground);
  --tw-prose-invert-quote-borders: var(--primary);
  --tw-prose-invert-captions: var(--muted-foreground);
  --tw-prose-invert-code: var(--foreground);
  --tw-prose-invert-pre-code: var(--foreground);
  --tw-prose-invert-pre-bg: var(--muted);
  --tw-prose-invert-th-borders: var(--border);
  --tw-prose-invert-td-borders: var(--border);
}*/
</style>
