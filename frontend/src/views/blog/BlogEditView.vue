<script setup lang="ts">
import BasicDetail from "@/components/basic/BasicDetail.vue";
import MarkdownEditor from "@/components/editor/MarkdownEditor.vue";
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

const isEdit = ref(false);
const postId = ref<string | null>(null);

const title = ref("");
const summary = ref("");
const debouncedTitle = ref("");
const category = ref("");
const body = ref("");
const pin = ref(false);
const categoryMenuOpen = ref(false);
const markdownEditorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null);

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
  const safeKey = (debouncedTitle.value || "default")
    .trim()
    .replace(/[^\w一-龥-]/g, "_");
  localStorage.setItem(`markdown-draft-${safeKey}`, body.value);
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

const fetchPost = async (id: string) => {
  loading.value = true;
  try {
    const post = await blogService.getLegacyPost(id);
    title.value = post.title || "";
    summary.value = post.summary || "";
    debouncedTitle.value = post.title || "";
    category.value = post.category_id ? String(post.category_id) : "";
    body.value = post.body || "";
    pin.value = Boolean(post.is_pinned);
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

  // 获取当前内容
  let currentContent: string;
  if (markdownEditorRef.value) {
    try {
      // Upload blob images and get final markdown content
      const markdownWithServerUrls =
        await markdownEditorRef.value.getContentForPublish();
      // Convert to HTML
      currentContent = marked.parse(markdownWithServerUrls, {
        async: false,
      }) as string;
    } catch (err) {
      error.value = "图片上传失败";
      notification.error(error.value);
      console.error(err);
      return;
    }
  } else {
    currentContent = body.value;
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
      notification.success("文章创建成功");
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
  <BasicDetail
    :title="isEdit ? '编辑文章' : '发布新文章'"
    :subtitle="isEdit && postId ? `ID: ${postId}` : '开始创作你的文章'"
  >
    <div class="col-span-full mx-auto w-full max-w-4xl">
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
        <p class="text-muted-foreground mt-2">Loading post...</p>
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
            class="group border-border bg-card focus-within:border-primary focus-within:ring-primary hover:border-border/80 relative rounded-3xl border p-2 shadow-sm transition-all focus-within:ring-2"
          >
            <label for="title" class="sr-only">Post Title</label>
            <input
              id="title"
              v-model="title"
              type="text"
              required
              placeholder="Enter post title..."
              class="text-foreground placeholder:text-muted-foreground block w-full border-0 bg-transparent px-4 py-3 text-3xl font-bold outline-0 focus:ring-0 sm:text-2xl"
            />
          </div>

          <!-- Summary Input -->
          <div class="border-border bg-card rounded-3xl border p-2 shadow-sm">
            <input
              v-model="summary"
              type="text"
              placeholder="输入文章摘要..."
              class="text-foreground placeholder:text-muted-foreground block w-full border-0 bg-transparent px-4 py-3 text-base outline-0 focus:ring-0"
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
                  ? 'border-warning bg-warning/10 text-warning hover:bg-warning/15'
                  : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-accent',
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
                class="border-border bg-card text-foreground focus-within:border-primary focus-within:ring-primary/20 hover:border-border/80 flex w-full items-center justify-between rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 focus-within:ring-2 hover:shadow-md"
              >
                <div class="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="text-muted-foreground group-focus-within:text-primary mr-2 h-4 w-4 shrink-0 transition-colors"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M2.5 3A1.5 1.5 0 001 4.5v4A1.5 1.5 0 002.5 10h6A1.5 1.5 0 0010 8.5v-4A1.5 1.5 0 008.5 3h-6zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM2.5 11A1.5 1.5 0 001 12.5v4A1.5 1.5 0 002.5 18h6a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 0010 11H2.5zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM11.5 3A1.5 1.5 0 0010 4.5v4a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 0017.5 3h-6zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM11.5 11a1.5 1.5 0 011.5 1.5v4a1.5 1.5 0 01-1.5 1.5h6a1.5 1.5 0 01-1.5-1.5v-4a1.5 1.5 0 01-1.5-1.5h-6z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="text-muted-foreground mr-2 text-sm font-medium"
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
                    'text-muted-foreground h-4 w-4 transition-transform duration-200',
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
                  class="border-border bg-card absolute top-full left-0 z-50 mt-1 w-full rounded-lg border shadow-lg"
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
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-accent',
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
              class="border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-accent inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200"
            >
              <IconSave />
              保存草稿
            </button>
          </div>
        </div>

        <!-- Markdown Editor -->
        <div>
          <MarkdownEditor ref="markdownEditorRef" v-model="body" />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-4 pb-12">
          <button
            type="button"
            @click="handleCancel"
            class="border-border bg-card text-muted-foreground hover:bg-accent focus:ring-ring rounded-full border px-6 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="bg-foreground text-background hover:bg-foreground/90 focus-visible:outline-foreground inline-flex cursor-pointer items-center justify-center rounded-full px-6 py-2 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            {{ isEdit ? "保存修改" : "发布文章" }}
          </button>
        </div>
      </form>
    </div>
  </BasicDetail>
</template>
