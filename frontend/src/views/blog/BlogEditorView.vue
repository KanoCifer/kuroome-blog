<script setup lang="ts">
import BasicDetail from "@/components/basic/BasicDetail.vue";
import MarkdownEditor from "@/components/editor/MarkdownEditor.vue";
import TiptapEditor from "@/components/editor/TiptapEditor.vue";
import IconSave from "@/components/icons/IconSave.vue";
import { blogService } from "@/service/blogService";
import { useNotificationStore } from "@/stores/notification";
import type { Category, CategoryResponseItem } from "@/types";
import { marked } from "marked";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const notification = useNotificationStore();

// Editor mode
type EditorMode = "tiptap" | "markdown";
const editorMode = ref<EditorMode>("markdown");

// Post state
const isEdit = ref(false);
const postId = ref<string | null>(null);
const title = ref("");
const debouncedTitle = ref("");
const category = ref("");
const pin = ref(false);
const categories = ref<Category[]>([]);
const loading = ref(false);
const error = ref("");

// Tiptap state
const tiptapBody = ref("");
const tiptapEditorRef = ref<InstanceType<typeof TiptapEditor> | null>(null);

// Markdown state
const markdownBody = ref("");
const markdownEditorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null);

// Category dropdown
const categoryMenuOpen = ref(false);

// Computed current category name
const currentCategory = computed(() => {
  if (!category.value) return "";
  const selectedCategory = categories.value.find((cat) => String(cat.id) === category.value);
  return selectedCategory ? selectedCategory.name : "";
});

// Debounce title for draft storage key
let titleDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(title, (newTitle) => {
  if (titleDebounceTimer) {
    clearTimeout(titleDebounceTimer);
  }
  titleDebounceTimer = setTimeout(() => {
    debouncedTitle.value = newTitle;
  }, 5000);
});

// Category dropdown handlers
let closeTimeout: ReturnType<typeof setTimeout> | null = null;
const handleCategoryMouseEnter = () => {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  categoryMenuOpen.value = true;
};

const handleCategoryMouseLeave = () => {
  closeTimeout = setTimeout(() => {
    categoryMenuOpen.value = false;
  }, 150);
};

// Get current content based on mode
const getCurrentContent = (): string => {
  if (editorMode.value === "tiptap") {
    return tiptapEditorRef.value?.getContent() || tiptapBody.value;
  }
  // Convert markdown to HTML for backend
  return marked.parse(markdownBody.value, { async: false }) as string;
};

// Save draft
const handleSaveDraft = () => {
  if (editorMode.value === "tiptap") {
    tiptapEditorRef.value?.saveDraft();
  } else {
    // Save markdown draft to localStorage
    const safeKey = (debouncedTitle.value || "default").trim().replace(/[^\w\u4e00-\u9fa5-]/g, "_");
    localStorage.setItem(`markdown-draft-${safeKey}`, markdownBody.value);
  }
  notification.success("草稿已保存");
};

// Switch editor mode with content conversion
const handleModeSwitch = (newMode: EditorMode) => {
  if (newMode === editorMode.value) return;

  if (newMode === "markdown") {
    // Convert Tiptap HTML to Markdown (simplified - tiptap-markdown handles this better)
    // For now, just set the raw HTML as markdown source
    const html = tiptapEditorRef.value?.getContent() || tiptapBody.value;
    // Strip HTML tags for basic markdown view (you could use turndown for better conversion)
    markdownBody.value = html;
  } else {
    // Convert Markdown to HTML for Tiptap
    const html = marked.parse(markdownBody.value, { async: false }) as string;
    tiptapBody.value = html;
  }

  editorMode.value = newMode;
};

// Fetch categories
const fetchCategories = async () => {
  try {
    const legacyCategories = await blogService.getLegacyCategories();
    categories.value = legacyCategories.map(
      (cat): CategoryResponseItem => ({
        id: cat.id,
        name: cat.name,
        description: "",
        post_count: cat.post_count,
        posts: [],
      }),
    ) as unknown as Category[];
  } catch (err) {
    console.error(err);
    notification.error("加载分类失败");
  }
};

// Fetch existing post
const fetchPost = async (id: string) => {
  loading.value = true;
  try {
    const post = await blogService.getLegacyPost(id);
    title.value = post.title || "";
    debouncedTitle.value = post.title || "";
    category.value = post.category_id ? String(post.category_id) : "";
    pin.value = Boolean(post.is_pinned);

    // Load content into both editors
    tiptapBody.value = post.body || "";
    markdownBody.value = post.body || "";
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "加载文章失败";
    notification.error(error.value);
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// Form ref for DOM check
const formRef = ref<HTMLElement | null>(null);

// Submit handler
const handleSubmit = async () => {
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

  // 获取内容，markdown 模式下先上传图片
  let currentContent: string;
  if (editorMode.value === "markdown" && markdownEditorRef.value) {
    try {
      // 上传所有 blob 图片，获取替换后的 markdown 内容
      const markdownWithServerUrls = await markdownEditorRef.value.getContentForPublish();
      // 转换为 HTML
      currentContent = marked.parse(markdownWithServerUrls, { async: false }) as string;
    } catch (err) {
      error.value = "图片上传失败";
      notification.error(error.value);
      console.error(err);
      return;
    }
  } else {
    currentContent = getCurrentContent();
  }

  if (!currentContent.trim()) {
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
      body: currentContent,
      is_pinned: pin.value ? 1 : 0,
    };

    if (isEdit.value && postId.value) {
      const updatePayload = { ...payload, _id: postId.value };
      await blogService.updateLegacyPost(updatePayload);
      notification.success("文章更新成功");
    } else {
      await blogService.createLegacyPost(payload);
      notification.success("文章发布成功");
    }

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

onMounted(async () => {
  await fetchCategories();
  const id = route.params.id;
  if (id && id !== "new") {
    isEdit.value = true;
    postId.value = String(id);
    await fetchPost(postId.value);
  }
});
</script>

<template>
  <BasicDetail
    :title="isEdit ? '编辑文章' : '发布新文章'"
    :subtitle="isEdit && postId ? `ID: ${postId}` : '选择编辑模式，开始创作'"
  >
    <div class="col-span-full mx-auto w-full">
      <!-- Error Message -->
      <div v-if="error" class="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
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
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        <p class="mt-2 text-gray-600 dark:text-gray-400">加载文章中...</p>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" ref="formRef" class="space-y-4">
        <!-- Title and Controls Bar -->
        <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <!-- Title Input -->
            <div class="flex-1">
              <input
                v-model="title"
                type="text"
                required
                placeholder="输入文章标题..."
                class="w-full border-0 bg-transparent text-2xl font-bold text-slate-900 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-600"
              />
            </div>

            <!-- Controls -->
            <div class="flex flex-wrap items-center gap-3">
              <!-- Mode Toggle -->
              <div
                class="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  type="button"
                  @click="handleModeSwitch('tiptap')"
                  :class="[
                    'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                    editorMode === 'tiptap'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  ]"
                >
                  富文本
                </button>
                <button
                  type="button"
                  @click="handleModeSwitch('markdown')"
                  :class="[
                    'rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                    editorMode === 'markdown'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  ]"
                >
                  Markdown
                </button>
              </div>

              <!-- Pin Button -->
              <button
                type="button"
                @click="pin = !pin"
                :class="[
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                  pin
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                ]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
                  <path
                    d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
                  />
                  <path
                    d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
                  />
                </svg>
                {{ pin ? "已置顶" : "置顶" }}
              </button>

              <!-- Category Selector -->
              <div class="group relative" @mouseenter="handleCategoryMouseEnter" @mouseleave="handleCategoryMouseLeave">
                <button
                  type="button"
                  @click="categoryMenuOpen = !categoryMenuOpen"
                  class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span>{{ currentCategory || "选择分类" }}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="h-3.5 w-3.5 text-slate-400"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
                <transition
                  enter-active-class="transition-all duration-200 ease-out"
                  enter-from-class="opacity-0 scale-95 -translate-y-1"
                  enter-to-class="opacity-100 scale-100 translate-y-0"
                  leave-active-class="transition-all duration-150 ease-in"
                  leave-from-class="opacity-100 scale-100 translate-y-0"
                  leave-to-class="opacity-0 scale-95 -translate-y-1"
                >
                  <div
                    v-if="categoryMenuOpen"
                    class="absolute top-full right-0 z-50 mt-1 w-48 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div class="p-1">
                      <button
                        type="button"
                        v-for="cat in categories"
                        :key="cat.id"
                        @click="
                          category = String(cat.id);
                          categoryMenuOpen = false;
                        "
                        :class="[
                          'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          category === String(cat.id)
                            ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/50',
                        ]"
                      >
                        {{ cat.name }}
                      </button>
                    </div>
                  </div>
                </transition>
              </div>

              <!-- Save Draft Button -->
              <button
                type="button"
                @click="handleSaveDraft"
                class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                <IconSave />
                保存草稿
              </button>
            </div>
          </div>
        </div>

        <!-- Editor Area -->
        <div
          class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <!-- Tiptap Editor -->
          <div v-show="editorMode === 'tiptap'" class="h-[calc(100vh-320px)] min-h-[500px]">
            <TiptapEditor ref="tiptapEditorRef" v-model="tiptapBody" v-model:storageKey="debouncedTitle" />
          </div>

          <!-- Markdown Editor -->
          <div v-show="editorMode === 'markdown'" class="h-[calc(100vh-320px)] min-h-[500px]">
            <MarkdownEditor ref="markdownEditorRef" v-model="markdownBody" />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pb-12">
          <button
            type="button"
            @click="handleCancel"
            class="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <svg
              v-if="loading"
              class="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ isEdit ? "保存修改" : "发布文章" }}
          </button>
        </div>
      </form>
    </div>
  </BasicDetail>
</template>
