<script setup lang="ts">
import BasicDetail from "@/components/basic/BasicDetail.vue";
import MarkdownEditor from "@/components/editor/MarkdownEditor.vue";
import IconSave from "@/components/icons/IconSave.vue";
import { blogService } from "@/service/blogService";
import { useNotificationStore } from "@/stores/notification";
import type { Category, CategoryResponseItem } from "@/types";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const notification = useNotificationStore();

// Post state
const isEdit = ref(false);
const postId = ref<string | null>(null);
const title = ref("");
const summary = ref("");
const debouncedTitle = ref("");
const category = ref("");
const pin = ref(false);
const categories = ref<Category[]>([]);
const loading = ref(false);
const error = ref("");

// Markdown state
const markdownBody = ref("");
const markdownEditorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null);

// Category dropdown
const categoryMenuOpen = ref(false);

// Computed current category name
const currentCategory = computed(() => {
  if (!category.value) return "";
  const selectedCategory = categories.value.find(
    (cat) => String(cat.id) === category.value,
  );
  return selectedCategory ? selectedCategory.name : "";
});

// Draft management
const draftKey = computed(() => `blog-draft-${postId.value || "new"}`);
const lastSavedAt = ref<Date | null>(null);
const hasUnsavedChanges = ref(false);
const autoSaveEnabled = ref(true);

// Auto-save with debounce
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const saveDraft = () => {
  const draft = {
    title: title.value,
    summary: summary.value,
    markdownBody: markdownBody.value,
    category: category.value,
    pin: pin.value,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(draftKey.value, JSON.stringify(draft));
  lastSavedAt.value = new Date();
  hasUnsavedChanges.value = false;
};

// Watch changes and trigger auto-save
watch(
  [title, summary, markdownBody, category, pin],
  () => {
    hasUnsavedChanges.value = true;
    if (autoSaveEnabled.value) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(saveDraft, 3000);
    }
  },
  { deep: true },
);

// Restore draft from localStorage
const restoreDraft = (): boolean => {
  const saved = localStorage.getItem(draftKey.value);
  if (!saved) return false;
  try {
    const draft = JSON.parse(saved);
    title.value = draft.title || "";
    summary.value = draft.summary || "";
    markdownBody.value = draft.markdownBody || "";
    category.value = draft.category || "";
    pin.value = draft.pin || false;
    if (draft.savedAt) lastSavedAt.value = new Date(draft.savedAt);
    return true;
  } catch {
    return false;
  }
};

// Clear draft after successful publish
const clearDraft = () => {
  localStorage.removeItem(draftKey.value);
  lastSavedAt.value = null;
};

// Check if draft exists
const hasDraft = computed(() => !!localStorage.getItem(draftKey.value));
const showDraftRestore = ref(false);

// Prevent closing with unsaved changes
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault();
    e.returnValue = "";
  }
};

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

// Get current markdown content (stored as-is, no HTML conversion)
const getCurrentContent = (): string => {
  return markdownBody.value;
};

// Manual save draft (Cmd+S)
const handleSaveDraft = () => {
  saveDraft();
  notification.success("草稿已保存");
};

// Keyboard shortcut for save
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    handleSaveDraft();
  }
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
    summary.value = post.summary || "";
    debouncedTitle.value = post.title || "";
    category.value = post.category_id ? String(post.category_id) : "";
    pin.value = Boolean(post.is_pinned);

    // Load content - convert HTML to markdown for editor
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

  // Get content and upload images
  let currentContent: string;
  if (markdownEditorRef.value) {
    try {
      // Upload all blob images and get markdown content with server URLs
      // Store raw markdown — conversion to HTML happens at display time
      currentContent = await markdownEditorRef.value.getContentForPublish();
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
      summary: summary.value,
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

    clearDraft();
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
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("beforeunload", handleBeforeUnload);

  await fetchCategories();
  const id = route.params.id;

  if (id && id !== "new") {
    isEdit.value = true;
    postId.value = String(id);

    // Check for draft first
    if (hasDraft.value) {
      showDraftRestore.value = true;
    } else {
      await fetchPost(postId.value);
    }
  } else {
    // New post - try restore draft
    if (hasDraft.value && restoreDraft()) {
      showDraftRestore.value = false;
      notification.success("已恢复上次草稿");
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
});
</script>

<template>
  <BasicDetail
    :title="isEdit ? '编辑文章' : '发布新文章'"
    :subtitle="isEdit && postId ? `ID: ${postId}` : '选择编辑模式，开始创作'"
  >
    <div class="col-span-full mx-auto w-full">
      <!-- Draft Restore Dialog -->
      <div
        v-if="showDraftRestore"
        class="bg-primary/5 border-primary/20 mb-6 rounded-2xl border p-4"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 text-primary rounded-full p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
              >
                <path
                  fill-rule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p class="text-foreground text-sm font-medium">
                检测到未保存的草稿
              </p>
              <p class="text-muted-foreground text-xs">
                上次保存于
                {{ lastSavedAt ? lastSavedAt.toLocaleString() : "未知" }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="
                showDraftRestore = false;
                if (postId) fetchPost(postId);
              "
              class="text-muted-foreground hover:text-foreground text-sm transition"
            >
              放弃
            </button>
            <button
              type="button"
              @click="
                restoreDraft();
                showDraftRestore = false;
                notification.success('已恢复草稿');
              "
              class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-1.5 text-sm font-medium transition"
            >
              恢复草稿
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="bg-destructive/10 text-destructive mb-6 rounded-lg p-4"
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
          class="border-border/50 border-t-primary mx-auto h-8 w-8 animate-spin rounded-full border-2"
        ></div>
        <p class="text-muted-foreground mt-2">加载文章中...</p>
      </div>

      <!-- Form -->
      <form
        v-else
        @submit.prevent="handleSubmit"
        ref="formRef"
        class="space-y-4"
      >
        <!-- Title and Summary -->
        <div class="border-border bg-card rounded-3xl border p-2 shadow-sm">
          <!-- Title -->
          <div
            class="group focus-within:bg-accent/30 rounded-2xl transition-colors"
          >
            <input
              v-model="title"
              type="text"
              required
              placeholder="在此输入文章标题..."
              class="text-foreground placeholder:text-muted-foreground block w-full border-0 bg-transparent px-4 py-4 text-3xl font-bold outline-0 focus:ring-0 sm:text-2xl"
            />
          </div>

          <!-- Divider -->
          <div class="bg-border mx-4 h-px"></div>

          <!-- Summary -->
          <div
            class="group focus-within:bg-accent/30 flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors"
          >
            <span class="text-muted-foreground shrink-0 text-sm font-medium"
              >摘要</span
            >
            <input
              v-model="summary"
              type="text"
              placeholder="添加文章描述..."
              class="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent text-base outline-0 focus:ring-0"
            />
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Save Status -->
          <div class="text-muted-foreground flex items-center gap-2 text-xs">
            <span
              :class="[
                'h-2 w-2 rounded-full transition-colors',
                hasUnsavedChanges ? 'bg-warning animate-pulse' : 'bg-success',
              ]"
            ></span>
            <span v-if="hasUnsavedChanges">未保存更改</span>
            <span v-else-if="lastSavedAt"
              >已保存 {{ lastSavedAt.toLocaleTimeString() }}</span
            >
            <span v-else>准备就绪</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Pin Button -->
            <button
              type="button"
              @click="pin = !pin"
              :class="[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                pin
                  ? 'border-warning bg-warning/10 text-warning'
                  : 'border-border bg-card text-muted-foreground hover:border-border/80',
              ]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-3.5 w-3.5"
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

            <!-- Category Selector -->
            <div
              class="group relative"
              @mouseenter="handleCategoryMouseEnter"
              @mouseleave="handleCategoryMouseLeave"
            >
              <button
                type="button"
                @click="categoryMenuOpen = !categoryMenuOpen"
                :class="[
                  'flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                  category
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-border/80',
                ]"
              >
                <span>{{ currentCategory || "选择分类" }}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="text-muted-foreground h-3.5 w-3.5"
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
                  class="border-border bg-card absolute top-full right-0 z-50 mt-1 w-48 rounded-xl border shadow-lg"
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
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent/50',
                      ]"
                    >
                      {{ cat.name }}
                    </button>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Auto-save Toggle -->
            <button
              type="button"
              @click="autoSaveEnabled = !autoSaveEnabled"
              :class="[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                autoSaveEnabled
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-border bg-card text-muted-foreground',
              ]"
              :title="
                autoSaveEnabled
                  ? '自动保存已开启 (Cmd+S 手动触发)'
                  : '自动保存已关闭'
              "
            >
              <svg
                v-if="autoSaveEnabled"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-3.5 w-3.5"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>{{ autoSaveEnabled ? "自动" : "手动" }}</span>
            </button>

            <!-- Save Draft Button -->
            <button
              type="button"
              @click="handleSaveDraft"
              class="border-border bg-card text-muted-foreground hover:border-border/80 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
            >
              <IconSave />
              保存草稿
            </button>
          </div>
        </div>

        <!-- Editor Area -->
        <div
          class="border-border bg-card overflow-hidden rounded-3xl border shadow-sm"
        >
          <!-- Markdown Editor -->
          <div class="h-[calc(100vh-320px)] min-h-[500px]">
            <MarkdownEditor ref="markdownEditorRef" v-model="markdownBody" />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pb-12">
          <button
            type="button"
            @click="handleCancel"
            class="border-border bg-card text-muted-foreground hover:bg-accent rounded-full border px-6 py-2 text-sm font-medium transition-all"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
            {{ isEdit ? "保存修改" : "发布文章" }}
          </button>
        </div>
      </form>
    </div>
  </BasicDetail>
</template>
