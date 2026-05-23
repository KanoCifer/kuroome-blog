<script setup lang="ts">
import { BasicDetail } from "@/components/basic";
import ArticleSummaryCard from "@/components/blog/ArticleSummaryCard.vue";
import { blogService } from "@/service/blogService";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import type { Post } from "@/types";
import { formatDate } from "@/utils/formatdate";
import { ExclamationCircleOutlined } from "@ant-design/icons-vue";
import { useHead } from "@unhead/vue";
import { Modal } from "ant-design-vue";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";
import { marked } from "marked";
import twikoo from "twikoo";
import { computed, createVNode, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import CalendarIcon from "../../components/icons/CalendarIcon.vue";
import DelIcon from "../../components/icons/DelIcon.vue";
import EditIcon from "../../components/icons/EditIcon.vue";

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
    errorMessage.value = err instanceof Error ? err.message : "加载文章失败，请稍后重试。";
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

// Twikoo 评论初始化
watch(
  () => post.value,
  async (p) => {
    if (p) {
      await nextTick();
      twikoo.init({
        envId: "https://kanocifer.chat/twikoo",
        el: "#tcomment",
        path: `/blog/${postId.value}`,
        lang: "zh-CN",
      });
    }
  },
);

watch(
  () => route.params.id,
  (newId) => {
    if (newId && newId !== postId.value) {
      postId.value = newId as string;
      fetchPost();
    }
  },
);

watch(
  () => post.value?.body,
  async (html) => {
    if (html) {
      await nextTick();
      hljs.highlightAll();
    }
  },
);

const renderedBody = computed(() => {
  if (!post.value?.body) return "";
  return marked.parse(post.value.body, { async: false, breaks: false }) as string;
});

const subtitle = computed(() => {
  if (!post.value) return "";
  const parts: string[] = [];
  if (post.value.author) {
    parts.push(post.value.author);
  }
  if (post.value.created_at) {
    parts.push(formatDate(post.value.created_at));
  }
  if (post.value.category?.name) {
    parts.push(post.value.category.name);
  }
  return parts.join(" · ");
});

useHead(() => ({
  title: post.value ? `${post.value.title} - ReadingList` : "文章未找到 - ReadingList",
  meta: [
    {
      name: "description",
      content: post.value
        ? post.value.summary || `阅读 ${post.value.title} 的完整内容`
        : "抱歉，您请求的文章不存在或已被删除",
    },
    {
      name: "keywords",
      content: post.value
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
        : "文章未找到, 阅读清单, ReadingList",
    },
    {
      property: "og:title",
      content: post.value ? post.value.title : "文章未找到",
    },
    {
      property: "og:description",
      content: post.value
        ? post.value.summary || `阅读 ${post.value.title} 的完整内容`
        : "抱歉，您请求的文章不存在或已被删除",
    },
    {
      property: "og:type",
      content: "article",
    },
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
    {
      property: "og:article:modified_time",
      content: post.value?.updated_at,
    },
    {
      property: "og:article:section",
      content: post.value?.category?.name || "博客",
    },
    {
      name: "twitter:title",
      content: post.value ? post.value.title : "文章未找到",
    },
    {
      name: "twitter:description",
      content: post.value
        ? post.value.summary || `阅读 ${post.value.title} 的完整内容`
        : "抱歉，您请求的文章不存在或已被删除",
    },
  ],
}));

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
    const errorMsg = err instanceof Error ? err.message : "删除文章失败，请稍后重试";
    useNotificationStore().error(errorMsg);
  }
};

let clickHandler: (event: Event) => void;
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
          const codeText = codeElement.innerText;
          navigator.clipboard
            .writeText(codeText)
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
    const button = document.createElement("button");
    button.innerText = "复制";
    button.className =
      "copy-btn absolute top-2 right-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 focus:outline-none";
    block.style.position = "relative";
    block.appendChild(button);
  });
};

onMounted(() => {
  watch(
    () => post.value?.body,
    async () => {
      await nextTick();
      setupCodeCopy();
    },
    { immediate: true },
  );
});

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
      <div class="border-border bg-card animate-pulse space-y-6 rounded-2xl border p-8 shadow-sm">
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
      <!-- TODO(human): Implement error retry UX -->
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
      <div v-if="showEditButton && post" class="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-3">
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
            <div v-if="post.author" class="flex items-center gap-1.5 font-medium">
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
          <!-- TODO(human): 配置阅读体验优化参数 -->
          <div class="prose prose-lg dark:prose-invert article-content max-w-none">
            <div v-if="post.body" v-html="renderedBody" />
            <div v-else class="text-muted-foreground italic">暂无内容</div>
          </div>
        </div>
      </div>

      <div v-if="post" class="sm:col-span-2 lg:col-span-3">
        <div class="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div class="border-border border-b px-8 py-5">
            <h3 class="text-foreground text-lg font-semibold">评论</h3>
          </div>
          <div class="p-8">
            <div id="tcomment" />
          </div>
        </div>
      </div>
    </template>
  </BasicDetail>
</template>

<style>
@import "twikoo/dist/twikoo.css";

/* ── Twikoo 评论区美化 ── */
#tcomment {
  font-size: 0.9375rem;
}

/* 输入框 / 文本域 */
#tcomment .el-input__inner,
#tcomment .el-textarea__inner {
  background: var(--card-bg);
  border-color: var(--warm-gray);
  border-radius: 0.75rem;
  color: var(--ink);
  font-size: 0.9375rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
#tcomment .el-input__inner:focus,
#tcomment .el-textarea__inner:focus {
  border-color: var(--workspace-accent);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--workspace-accent) 15%, transparent);
}
#tcomment .el-textarea__inner {
  line-height: 1.7;
  padding: 0.75rem 1rem;
}

/* 按钮通用 */
#tcomment .el-button {
  border-radius: 0.75rem;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
  padding: 0.5rem 1.25rem;
}

/* 主按钮 */
#tcomment .el-button--primary {
  background: var(--workspace-accent);
  border-color: var(--workspace-accent);
  color: var(--workspace-accent-contrast);
}
#tcomment .el-button--primary:hover {
  opacity: 0.88;
  background: var(--workspace-accent);
  border-color: var(--workspace-accent);
}
#tcomment .el-button--primary:active {
  opacity: 0.78;
}

/* 默认按钮 */
#tcomment .el-button--default,
#tcomment .el-button:not(.el-button--primary):not(.el-button--danger):not(.el-button--text) {
  background: var(--card-bg);
  border-color: var(--warm-gray);
  color: var(--ink);
}
#tcomment .el-button--default:hover,
#tcomment .el-button:not(.el-button--primary):not(.el-button--danger):not(.el-button--text):hover {
  border-color: var(--workspace-accent);
  color: var(--workspace-accent);
  background: color-mix(in oklch, var(--workspace-accent) 8%, var(--card-bg));
}

/* 文字按钮（回复/点赞等） */
#tcomment .el-button--text {
  color: var(--muted);
  padding: 0.25rem 0.5rem;
}
#tcomment .el-button--text:hover {
  color: var(--workspace-accent);
  background: transparent;
}

/* 评论卡片 */
#tcomment .tk-comment {
  border-bottom: 1px solid var(--warm-gray);
  padding: 1.25rem 0;
}
#tcomment .tk-comment:last-child {
  border-bottom: none;
}

/* 头像 */
#tcomment .tk-avatar {
  border-radius: 9999px;
  overflow: hidden;
}

/* 评论者昵称 */
#tcomment .tk-nick {
  color: var(--ink);
  font-weight: 600;
}

/* 时间戳 */
#tcomment .tk-time {
  color: var(--muted);
  font-size: 0.8125rem;
}

/* 评论内容 */
#tcomment .tk-content {
  color: var(--ink);
  line-height: 1.75;
}

/* 子回复缩进线 */
#tcomment .tk-replies {
  border-left: 2px solid var(--warm-gray);
  margin-left: 1.5rem;
  padding-left: 1rem;
}

/* 分页器 */
#tcomment .el-pager li {
  border-radius: 0.5rem;
  font-weight: 500;
}
#tcomment .el-pager li.active {
  background: var(--workspace-accent);
  color: var(--workspace-accent-contrast);
}

/* OwO 表情面板 */
#tcomment .OwO {
  color: var(--ink);
}
#tcomment .OwO .OwO-logo {
  border-radius: 0.5rem;
}

/* 暗色模式补充 */
.dark #tcomment .el-input__inner,
.dark #tcomment .el-textarea__inner {
  background: color-mix(in oklch, var(--card-bg) 60%, var(--paper));
}

/* ── 文章阅读体验优化 ── */
.article-content {
  /* 行高与阅读节奏 */
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

  /* 增大正文字体到 18px，行高 1.8 */
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
  background: color-mix(in oklch, var(--primary) 5%, var(--card));
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
  font-size: 0.9375em;
  padding: 0.2em 0.4em;
  border-radius: 0.375rem;
  background: color-mix(in oklch, var(--muted) 80%, var(--card));
}

.article-content :where(pre code):not(:where([class~="not-prose"] *)) {
  background: transparent;
  padding: 0;
  font-size: 0.875rem;
  line-height: 1.7;
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
.dark .article-content {
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
}
</style>
