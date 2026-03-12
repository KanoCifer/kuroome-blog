<script setup lang="ts">
import ArticleDetailLayout from "@/components/article/ArticleDetailLayout.vue";
import ArticleComments from "@/components/blog/ArticleComments.vue";
import ArticleSummaryCard from "@/components/blog/ArticleSummaryCard.vue";
import request from "@/request";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import type { Post, PostResponse } from "@/types";
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
    const res = await request.get<PostResponse>("/post", {
      params: { _id: postId.value },
    });

    if (res.data.status === "success") {
      post.value = res.data.data;
    } else {
      throw new Error(res.data.message || "获取文章失败");
    }
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
    const res = await request.delete<{
      status: string;
      message: string;
      data?: { _id: string };
    }>(`/admin/post/${postId.value}/delete`);

    if (res.data.status === "success") {
      useNotificationStore().success("文章删除成功");
      router.push("/blog");
    } else {
      throw new Error(res.data.message || "删除文章失败");
    }
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
  <ArticleDetailLayout
    :title="post?.title || ''"
    :author="post?.author"
    :published-date="post?.created_at"
    :updated-date="post?.updated_at"
    :category="post?.category"
    :is-loading="isLoading"
    :error-message="errorMessage"
    back-link="/blog"
    back-text="返回博客列表"
    :show-category="true"
    @retry="handleRetry"
  >
    <template #actions>
      <div v-if="showEditButton && post" class="flex items-center gap-2">
        <router-link
          :to="`/blog/edit/${post._id}`"
          class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
        >
          <EditIcon />
          编辑
        </router-link>
        <button
          @click="showDeleteConfirm"
          class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
        >
          <DelIcon />
          删除
        </button>
      </div>
    </template>

    <!-- Article Content -->
    <div
      v-if="post"
      class="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div class="border-b border-blue-100 p-8 dark:border-slate-700">
        <h1
          class="mb-4 text-3xl leading-tight font-bold text-blue-900 dark:text-white"
        >
          {{ post.title }}
        </h1>

        <div
          class="flex flex-wrap gap-x-6 gap-y-3 text-sm text-blue-600 dark:text-blue-400"
        >
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
        <div class="prose prose-base dark:prose-invert max-w-none">
          <div v-if="post.body" v-html="post.body" />
          <div v-else class="text-gray-400 italic">暂无内容</div>
        </div>
      </div>

      <ArticleComments
        :post-id="postId"
        :comments="comments"
        @refresh="fetchPost"
      />
    </div>
  </ArticleDetailLayout>
</template>
