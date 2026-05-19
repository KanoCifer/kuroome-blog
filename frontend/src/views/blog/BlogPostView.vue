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
import CalendarIcon from "../../components/icons/CalendarIcon.vue";
import DelIcon from "../../components/icons/DelIcon.vue";
import EditIcon from "../../components/icons/EditIcon.vue";
import ArticleComments from "./components/ArticleComments.vue";

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
  title: post.value
    ? `${post.value.title} - ReadingList`
    : "文章未找到 - ReadingList",
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

const comments = computed(() => {
  return post.value?.comments || [];
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
          <div class="prose prose-base dark:prose-invert max-w-none">
            <div v-if="post.body" v-html="post.body" />
            <div v-else class="text-muted-foreground italic">暂无内容</div>
          </div>
        </div>
      </div>

      <div v-if="post" class="sm:col-span-2 lg:col-span-3">
        <ArticleComments
          :post-id="postId"
          :comments="comments"
          @refresh="fetchPost"
        />
      </div>
    </template>
  </BasicDetail>
</template>
