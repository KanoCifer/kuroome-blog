<script setup lang="ts">
import ArticleToc from "@/components/ArticleToc.vue";
import CommentForm from "@/components/CommentForm.vue";
import CommentItem from "@/components/CommentItem.vue";
import request from "@/request";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import type { Comment, Post, PostResponse } from "@/types";
import { formatDate } from "@/utils/formatdate";
import { useHead } from "@unhead/vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const postId = ref<string>(route.params.id as string);

const post = ref<Post | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");
const notFound = ref(false);

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
    errorMessage.value = err instanceof Error ? err.message : "加载文章失败，请稍后重试。";
    useNotificationStore().error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
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

// 设置页面 meta 标签
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

const comments = computed(() => {
  return post.value?.comments || [];
});

const goBack = () => {
  router.push("/blog");
};

// 处理评论回复
const handleReply = async (commentId: string, body: string) => {
  try {
    // 递归查找评论的方法
    const findComment = (commentsList: Comment[], id: string): Comment | undefined => {
      for (const comment of commentsList) {
        if (comment._id === id) {
          return comment;
        }
        if (comment.comments && comment.comments.length > 0) {
          const found = findComment(comment.comments, id);
          if (found) {
            return found;
          }
        }
      }
      return undefined;
    };

    // 获取被回复的评论信息
    const parentComment = findComment(post.value?.comments || [], commentId);

    if (!parentComment) {
      useNotificationStore().error("找不到要回复的评论");
      return;
    }

    // 提交回复到后端
    const res = await request.post("/comments", {
      post_id: postId.value,
      body: body,
      reply_to: commentId, // 被回复的评论ID
      reply_to_author: parentComment.author, // 被回复者用户名
      author: auth.isAuthenticated && auth.user ? auth.user.username : "",
    });

    if (res.data.status === "success" || res.status === 200 || res.status === 201) {
      useNotificationStore().success("评论已提交，待审核后显示");
      // 刷新文章数据以获取最新评论
      await fetchPost();
    } else {
      throw new Error(res.data.message || "提交评论失败");
    }
  } catch (err: unknown) {
    console.error("提交回复失败:", err);
    const errorMsg = err instanceof Error ? err.message : "提交评论失败，请稍后重试";
    useNotificationStore().error(errorMsg);
  }
};
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <router-link
      to="/blog"
      class="group mb-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
    >
      <svg
        class="h-4 w-4 transition-transform group-hover:-translate-x-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      返回博客列表
    </router-link>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex min-h-[60vh] flex-col items-center justify-center">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
      ></div>
      <p class="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="errorMessage"
      class="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center dark:border-red-800 dark:bg-red-900/20"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="mb-4 h-12 w-12 text-red-400"
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
      <p class="text-lg font-medium text-red-600 dark:text-red-400">加载失败</p>
      <p class="mt-1 text-sm text-red-500">{{ errorMessage }}</p>
      <div class="mt-4 space-x-4">
        <button
          class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
          @click="fetchPost"
        >
          重试
        </button>
        <button
          class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
          @click="goBack"
        >
          返回列表
        </button>
      </div>
    </div>

    <!-- 404 Not Found -->
    <div
      v-else-if="notFound || !post"
      class="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div class="mb-4 text-9xl font-bold text-gray-200 dark:text-gray-700">404</div>
      <h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">文章未找到</h2>
      <p class="mb-6 text-gray-600 dark:text-gray-400">抱歉，您请求的文章不存在或已被删除。</p>
      <button
        class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        @click="goBack"
      >
        返回文章列表
      </button>
    </div>

    <!-- Main Content -->
    <div v-else class="relative mx-auto max-w-7xl">
      <div class="flex flex-col gap-8 lg:flex-row">
        <!-- 文章内容卡片 - 占据主要空间并居中 -->
        <div class="min-w-0 flex-1">
          <div
            class="w-full min-w-0 rounded-[36px] bg-gray-100/90 p-8 shadow-2xl backdrop-blur-xl dark:bg-gray-800/90"
          >
            <!-- 文章头部区域 -->
            <div class="p-6">
              <h1 class="mb-6 text-3xl font-bold dark:text-white">
                {{ post.title || "" }}
              </h1>

              <!-- 作者和日期信息 -->
              <div
                class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-sky-600 text-lg font-bold text-white"
                  >
                    {{ post.author?.charAt(0).toUpperCase() || "K" }}
                  </div>
                  <span class="font-medium text-gray-900 dark:text-gray-200"
                    >@{{ post.author || "Kurroome" }}</span
                  >
                </div>
                <span class="text-gray-400">·</span>
                <div class="flex items-center gap-1">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span v-if="post.created_at && post.updated_at !== post.created_at">{{
                    formatDate(post.updated_at)
                  }}</span>
                  <span v-else>{{ formatDate(post.created_at) }}</span>
                </div>
                <span v-if="post.category" class="flex items-center gap-1">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <router-link
                    :to="`/blog/category/${post.category.id}`"
                    class="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {{ post.category.name }}
                  </router-link>
                </span>
              </div>
            </div>

            <!-- 文章内容区 -->
            <div class="mb-8 px-6">
              <div class="prose prose-base dark:prose-invert max-w-none">
                <!-- 使用 v-html 渲染 HTML 内容（取消转译） -->
                <div v-if="post.body" v-html="post.body" />
                <div v-else class="text-gray-400 italic">暂无内容</div>
              </div>
            </div>

            <!-- 评论区 - 独立卡片 -->
            <div id="comments" class="p-8">
              <div
                class="mb-8 flex items-center gap-4 border-b border-gray-100 pb-6 dark:border-gray-700"
              >
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white">评论</h3>
                <span
                  v-if="post.comments && post.comments.length > 0"
                  class="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                >
                  {{ post.comments.length }}
                </span>
              </div>

              <div v-if="comments.length > 0" class="space-y-6">
                <CommentItem
                  v-for="comment in comments"
                  :key="comment._id"
                  :comment="comment"
                  :post-id="postId"
                  @reply="handleReply"
                />
              </div>

              <!-- Empty State -->
              <div
                v-else
                class="mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center dark:border-gray-700 dark:bg-gray-800/30"
              >
                <div
                  class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
                >
                  <svg
                    class="h-8 w-8 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">暂无评论</h3>
                <p class="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                  成为第一个评论的人吧！
                </p>
              </div>

              <CommentForm :post-id="postId" />
            </div>

            <!-- 底部导航 -->
            <div class="mt-8 flex justify-center">
              <router-link
                v-if="showEditButton"
                :to="`/blog/edit/${post._id}`"
                class="ml-4 inline-flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700 shadow-md transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                编辑文章
              </router-link>
            </div>
          </div>
        </div>

        <!-- 目录侧边栏卡片 - 大屏显示在右侧 -->
        <div class="hidden lg:block lg:w-64 lg:shrink-0">
          <div class="sticky top-24">
            <ArticleToc :content="post.body" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
