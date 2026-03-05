<script setup lang="ts">
import TiptapEditor from "@/components/TiptapEditor.vue";
import request from "@/request";
import { useNotificationStore } from "@/stores/notification";
import type { ApiResponse, Category, Post } from "@/types";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const notification = useNotificationStore();

const isEdit = ref(false);
const postId = ref<string | null>(null);

const title = ref("");
const debouncedTitle = ref("");
const category = ref("");
const body = ref("");
const pin = ref(false);
const categoryMenuOpen = ref(false);
const draftMenuOpen = ref(false);
const editorRef = ref<InstanceType<typeof TiptapEditor> | null>(null);
// 用于强制更新草稿列表的响应式触发器
const draftListRefreshTrigger = ref(0);
// 生成安全的 storage key
const getSafeStorageKey = (key: string): string => {
  if (!key || key.trim() === "") {
    return "tiptap-draft-default";
  }
  const safeKey = key.trim().replace(/[^\w\u4e00-\u9fa5-]/g, "_");
  return `tiptap-draft-${safeKey}`;
};

// 获取草稿列表
const draftList = computed(() => {
  // 访问触发器以建立响应式依赖
  void draftListRefreshTrigger.value;
  return editorRef.value?.getAllDrafts() || [];
});

// 切换到指定草稿
const handleSwitchDraft = (draftKey: string, draftTitle: string) => {
  // 清除防抖定时器，立即更新
  if (titleDebounceTimer) {
    clearTimeout(titleDebounceTimer);
    titleDebounceTimer = null;
  }
  // 立即更新标题和防抖标题
  const actualTitle = draftTitle === "未命名草稿" ? "" : draftTitle;
  title.value = actualTitle;
  debouncedTitle.value = actualTitle;
  // 然后切换草稿
  editorRef.value?.switchToDraft(draftKey, draftTitle);
  draftMenuOpen.value = false;
  notification.success(`已切换到草稿：${draftTitle}`);
};

// 删除草稿
const handleDeleteDraft = (e: Event, draftKey: string, draftTitle: string) => {
  e.stopPropagation();
  if (confirm(`确定要删除草稿 "${draftTitle}" 吗？`)) {
    editorRef.value?.deleteDraft(draftKey);
    // 刷新草稿列表
    draftListRefreshTrigger.value++;
    notification.success(`已删除草稿：${draftTitle}`);
  }
};

let draftCloseTimeout: ReturnType<typeof setTimeout> | null = null;
const handleDraftMouseEnter = () => {
  if (draftCloseTimeout) {
    clearTimeout(draftCloseTimeout);
    draftCloseTimeout = null;
  }
  draftMenuOpen.value = true;
};

const handleDraftMouseLeave = () => {
  draftCloseTimeout = setTimeout(() => {
    draftMenuOpen.value = false;
  }, 200);
};

// 计算当前选中的分类名称
const currentCategory = computed(() => {
  if (!category.value) return "";
  const selectedCategory = categories.value.find(
    (cat) => String(cat.id) === category.value,
  );
  return selectedCategory ? selectedCategory.name : "";
});

const categories = ref<Category[]>([]);

const loading = ref(false);
const error = ref("");

// 保存草稿
const handleSaveDraft = () => {
  editorRef.value?.saveDraft();
  notification.success("草稿已保存");
};

let titleDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(title, (newTitle) => {
  if (titleDebounceTimer) {
    clearTimeout(titleDebounceTimer);
  }
  titleDebounceTimer = setTimeout(() => {
    debouncedTitle.value = newTitle;
  }, 5000);
});

onMounted(async () => {
  await fetchCategories();
  // Check if editing existing post
  const id = route.params.id;
  if (id && id !== "new") {
    isEdit.value = true;
    postId.value = String(id);
    await fetchPost(postId.value);
  }
});

const fetchCategories = async () => {
  try {
    const res =
      await request.get<ApiResponse<{ categories: Category[] } | Category[]>>(
        "/categories",
      );
    if (res.data.status === "success") {
      // 兼容新旧两种 API 格式
      const data = res.data.data;
      if (Array.isArray(data)) {
        categories.value = data;
      } else if (data && "categories" in data) {
        categories.value = data.categories;
      } else {
        categories.value = [];
      }
    }
  } catch (err) {
    console.error(err);
    notification.error("加载分类失败");
  }
};

const fetchPost = async (id: string) => {
  loading.value = true;
  try {
    const res = await request.get<ApiResponse<Post>>("/post", {
      params: { _id: id },
    });
    if (res.data.status === "success" && res.data.data) {
      const post = res.data.data;
      title.value = post.title || "";
      debouncedTitle.value = post.title || "";
      category.value = post.category_id ? String(post.category_id) : "";
      body.value = post.body || "";
      pin.value = Boolean(post.is_pinned);
    } else {
      throw new Error(res.data.message);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Failed to load post";
    notification.error(error.value);
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const formRef = ref<HTMLElement | null>(null);

const handleSubmit = async () => {
  // 检查表单是否仍然连接到 DOM
  if (!formRef.value || !document.body.contains(formRef.value)) {
    console.warn("Form submission canceled because the form is not connected");
    return;
  }

  if (!title.value.trim()) {
    error.value = "标题不能为空";
    notification.error(error.value);
    return;
  }

  if (!category.value) {
    error.value = "请选择分类";
    notification.error(error.value);
    return;
  }

  if (!body.value.trim()) {
    error.value = "内容不能为空";
    notification.error(error.value);
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const payload = {
      title: title.value,
      category_id: Number(category.value),
      body: body.value,
      is_pinned: pin.value ? 1 : 0,
    };

    if (isEdit.value && postId.value) {
      const updatePayload = { ...payload, _id: postId.value };
      const res = await request.put<ApiResponse<{ _id: string }>>(
        "/admin/post/update",
        updatePayload,
      );
      if (res.data.status === "success") {
        notification.success("文章更新成功");
      } else {
        throw new Error(res.data.message);
      }
    } else {
      const res = await request.post<ApiResponse<{ _id: string }>>(
        "/admin/post/add",
        payload,
      );
      if (res.data.status === "success") {
        notification.success("文章创建成功");
      } else {
        throw new Error(res.data.message);
      }
    }

    // Redirect to previous page
    router.back();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "保存文章失败";
    notification.error(error.value);
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.back();
};

let closeTimeout: ReturnType<typeof setTimeout> | null = null;
const handleCategoryMouseEnter = () => {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  categoryMenuOpen.value = true;
};

// Close dropdown with delay
const handleCategoryMouseLeave = () => {
  // 延迟关闭，给用户时间移动到菜单上
  closeTimeout = setTimeout(() => {
    categoryMenuOpen.value = false;
  }, 150);
};
</script>
<template>
  <div class="container mx-auto mt-24 px-4 py-8">
    <div
      class="squircle mx-auto max-w-6xl bg-gray-100/90 px-12 py-8 shadow-2xl backdrop-blur-sm dark:bg-gray-900/90"
    >
      <!-- Header -->
      <!-- Header -->
      <div class="mb-8">
        <h1
          class="font-serif text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
        >
          {{ isEdit ? "Edit Post" : "New Post" }}
        </h1>
        <p
          v-if="isEdit && postId"
          class="mt-1 text-sm text-gray-500 dark:text-gray-400"
        >
          ID: {{ postId }}
        </p>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200"
      >
        <div class="flex items-center">
          <svg class="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          {{ error }}
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && isEdit" class="py-12 text-center">
        <div
          class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
        ></div>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Loading post...</p>
      </div>

      <!-- Form -->
      <form
        v-else
        @submit.prevent="handleSubmit"
        ref="formRef"
        class="space-y-6"
      >
        <!-- Title, Category, and Pin -->
        <div class="space-y-4">
          <!-- Title -->
          <div
            class="group relative rounded-3xl border border-gray-200 bg-white p-2 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
          >
            <label for="title" class="sr-only">Post Title</label>
            <input
              id="title"
              v-model="title"
              type="text"
              required
              placeholder="Enter post title..."
              class="block w-full border-0 bg-transparent px-4 py-3 text-3xl font-bold text-gray-900 outline-0 placeholder:text-gray-400 focus:ring-0 sm:text-2xl dark:text-white"
            />
          </div>

          <!-- Category and Pin 分类选项和置顶按钮 -->
          <div class="flex items-center justify-center gap-4">
            <!-- Pin Button -->
            <button
              type="button"
              @click="pin = !pin"
              :class="[
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none',
                pin
                  ? 'border-amber-500 bg-amber-50 text-amber-700 ring-amber-500 hover:bg-amber-100 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30'
                  : 'border-gray-300 bg-white text-gray-600 ring-blue-500 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-700',
              ]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                :class="[
                  'h-4 w-4 transition-transform duration-200',
                  pin ? 'rotate-0' : 'rotate-45',
                ]"
              >
                <path
                  d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
                />
                <path
                  d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
                />
              </svg>
              {{ pin ? "已置顶" : "置顶" }}
            </button>
            <div
              class="group relative flex w-auto items-center"
              @mouseenter="handleCategoryMouseEnter"
              @mouseleave="handleCategoryMouseLeave"
            >
              <button
                type="button"
                @click="categoryMenuOpen = !categoryMenuOpen"
                class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <div class="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="mr-2 h-4 w-4 shrink-0 text-gray-400 transition-colors group-focus-within:text-blue-500 dark:text-gray-500"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M2.5 3A1.5 1.5 0 001 4.5v4A1.5 1.5 0 002.5 10h6A1.5 1.5 0 0010 8.5v-4A1.5 1.5 0 008.5 3h-6zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM2.5 11A1.5 1.5 0 001 12.5v4A1.5 1.5 0 002.5 18h6a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 0010 11H2.5zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM11.5 3A1.5 1.5 0 0010 4.5v4a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 0017.5 3h-6zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM11.5 11a1.5 1.5 0 011.5 1.5v4a1.5 1.5 0 01-1.5 1.5h6a1.5 1.5 0 01-1.5-1.5v-4a1.5 1.5 0 01-1.5-1.5h-6z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span
                    class="mr-2 text-sm font-medium text-gray-500 dark:text-gray-400"
                    >分类</span
                  >
                  <span class="text-sm font-medium">
                    {{ currentCategory || "请选择分类..." }}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  :class="[
                    'h-4 w-4 text-gray-400 transition-transform duration-200',
                    categoryMenuOpen ? 'rotate-180' : '',
                  ]"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <transition
                enter-active-class="transition-all transform-gpu duration-200 ease-out"
                enter-from-class="opacity-0 scale-95 -translate-y-1"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition-all transform-gpu duration-150 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 -translate-y-1"
              >
                <div
                  v-if="categoryMenuOpen"
                  class="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  <div class="py-1">
                    <button
                      type="button"
                      v-for="cat in categories"
                      :key="cat.id"
                      @click="
                        category = String(cat.id);
                        categoryMenuOpen = false;
                      "
                      :class="[
                        'w-full px-4 py-2 text-left text-sm transition-colors',
                        category === String(cat.id)
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                      ]"
                    >
                      {{ cat.name }}
                    </button>
                  </div>
                </div>
              </transition>
            </div>
            <!-- 保存草稿按钮 -->
            <button
              type="button"
              @click="handleSaveDraft"
              class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-4 w-4"
              >
                <path
                  d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
                />
                <path
                  d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
                />
              </svg>
              保存草稿
            </button>
            <!-- 草稿下拉菜单 -->
            <div
              class="group relative flex w-auto items-center"
              @mouseenter="handleDraftMouseEnter"
              @mouseleave="handleDraftMouseLeave"
            >
              <button
                type="button"
                @click="draftMenuOpen = !draftMenuOpen"
                class="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-4 w-4"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>草稿</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  :class="[
                    'h-4 w-4 text-gray-400 transition-transform duration-200',
                    draftMenuOpen ? 'rotate-180' : '',
                  ]"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <transition
                enter-active-class="transition-all transform-gpu duration-200 ease-out"
                enter-from-class="opacity-0 scale-95 -translate-y-1"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition-all transform-gpu duration-150 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 -translate-y-1"
              >
                <div
                  v-if="draftMenuOpen"
                  class="absolute top-full right-0 z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  <div
                    v-if="draftList.length === 0"
                    class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                  >
                    暂无草稿
                  </div>
                  <div v-else class="py-1">
                    <div
                      v-for="draft in draftList"
                      :key="draft.key"
                      @click="handleSwitchDraft(draft.key, draft.title)"
                      :class="[
                        'flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left text-sm transition-colors',
                        getSafeStorageKey(title) === draft.key
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                      ]"
                    >
                      <span class="flex-1 truncate">
                        {{ draft.title }}
                        <span
                          v-if="!draft.hasContent"
                          class="ml-1 text-xs text-gray-400"
                          >(空)</span
                        >
                      </span>
                      <button
                        type="button"
                        @click="
                          handleDeleteDraft($event, draft.key, draft.title)
                        "
                        class="ml-2 p-1 text-gray-400 hover:text-red-500"
                        title="删除草稿"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          class="h-4 w-4"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19H12.4a2.75 2.75 0 002.734-2.483l.84-10.52.15.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 5c.646 0 1.283.02 1.912.06.332.022.66.045.985.07l.726 9.11a1.25 1.25 0 01-1.24 1.126H7.617a1.25 1.25 0 01-1.24-1.126l.726-9.11c.325-.025.653-.048.985-.07A39.533 39.533 0 0110 5zM8.28 7.75a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5zm4.94 0a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>

        <!-- Tiptap Editor -->
        <div>
          <TiptapEditor
            ref="editorRef"
            v-model="body"
            v-model:storageKey="debouncedTitle"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            @click="handleCancel"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            @click="handleSubmit"
            :disabled="loading"
            class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              v-if="loading"
              class="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
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
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="mr-2 h-4 w-4"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clip-rule="evenodd"
              />
            </svg>
            {{ isEdit ? "Save Changes" : "Create Post" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
