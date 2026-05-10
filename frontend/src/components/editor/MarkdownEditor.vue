<script setup lang="ts">
import { uploadService } from "@/service/uploadService";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";
import { marked } from "marked";
import TurndownService from "turndown"; // HTML → Markdown 转换
import { computed, onBeforeUnmount, ref, watch } from "vue";

const turndownService = new TurndownService();

// v-model support
const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
});

// 检测字符串是否像 HTML（简单检测）
const isHtmlLike = (str: string): boolean => {
  if (!str) return false;
  return (
    /<\/?[a-z][\s\S]*>/i.test(str) ||
    str.includes("&lt;") ||
    str.includes("&gt;")
  );
};

// 初始化时如果是 HTML 则转换为 Markdown
const initialContent = isHtmlLike(props.modelValue)
  ? turndownService.turndown(props.modelValue)
  : props.modelValue;

const markdownText = ref<string>(initialContent);
const fileInputRef = ref<HTMLInputElement | null>(null);
const replaceInputRef = ref<HTMLInputElement | null>(null);

// blob URL → File 映射，用于发布时批量上传
const blobFileMap = ref<Map<string, File>>(new Map());

// 拖拽状态（计数法避免子元素触发 dragleave 闪烁）
const dragCounter = ref(0);
const isDraggingOver = ref(false);

// Image editor state
const isImageEditorOpen = ref<boolean>(false);
const editingImageUrl = ref<string>("");
const editingImageAlt = ref<string>("");
const editingImageTitle = ref<string>("");
const editingImageWidth = ref<string>("");
const editingImageHeight = ref<string>("");
const editingImageAlign = ref<"left" | "center" | "right">("center");
const editingImageFile = ref<File | null>(null);

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== markdownText.value) {
      markdownText.value = turndownService.turndown(newValue);
    }
  },
  { immediate: true },
);

// Update parent when content changes
watch(markdownText, (newValue) => {
  emit("update:modelValue", newValue);
});

const handleInsertImage = (url: string) => {
  const md = `![image](${url})`;
  markdownText.value += `${md}\n\n`;
};

const handleDrop = (event: DragEvent) => {
  isDraggingOver.value = false;
  dragCounter.value = 0;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const blobUrl = URL.createObjectURL(file);
    blobFileMap.value.set(blobUrl, file);
    handleInsertImage(blobUrl);
  }
};

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  const blobUrl = URL.createObjectURL(file);
  blobFileMap.value.set(blobUrl, file);
  handleInsertImage(blobUrl);
  target.value = "";
};

const openImageEditor = (img: HTMLImageElement) => {
  editingImageUrl.value = img.currentSrc || img.src;
  editingImageAlt.value = img.alt || "";
  editingImageTitle.value = img.getAttribute("title") || "";
  editingImageWidth.value = img.getAttribute("width") || "";
  editingImageHeight.value = img.getAttribute("height") || "";
  editingImageAlign.value = "center";
  editingImageFile.value = null;
  isImageEditorOpen.value = true;
};

const closeImageEditor = () => {
  isImageEditorOpen.value = false;
  editingImageUrl.value = "";
  editingImageAlt.value = "";
  editingImageTitle.value = "";
  editingImageWidth.value = "";
  editingImageHeight.value = "";
  editingImageAlign.value = "center";
  editingImageFile.value = null;
};

const handlePreviewClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target || target.tagName !== "IMG") return;
  openImageEditor(target as HTMLImageElement);
};

const handleReplaceImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  const newBlobUrl = URL.createObjectURL(file);
  blobFileMap.value.set(newBlobUrl, file);
  editingImageUrl.value = newBlobUrl;
  editingImageFile.value = file;
  if (!editingImageAlt.value) {
    editingImageAlt.value = file.name;
  }
  target.value = "";
};

const openImageInNewTab = (url: string) => {
  window.open(url);
};

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderedMarkdown = computed<string>(() => {
  if (!markdownText.value) return "";
  const rawHtml = marked.parse(markdownText.value, { async: false }) as string;
  hljs.highlightAll();
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["data-md-id", "data-align"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|blob):|[^a-z]*|[a-z0-9.+-]*$)/i,
  });
});

// 上传单个图片到服务器
const uploadImageToServer = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await uploadService.uploadEditorImage(formData);
  return response.url;
};

// 发布前上传所有 blob 图片并返回最终内容
const getContentForPublish = async (): Promise<string> => {
  let content = markdownText.value;

  for (const [blobUrl, file] of blobFileMap.value) {
    try {
      const serverUrl = await uploadImageToServer(file);
      content = content.replaceAll(blobUrl, serverUrl);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("图片上传失败:", error);
      throw error;
    }
  }

  blobFileMap.value.clear();
  return content;
};

// 暴露方法给父组件
defineExpose({ getContentForPublish });

onBeforeUnmount(() => {
  // 清理所有 blob URL
  for (const blobUrl of blobFileMap.value.keys()) {
    URL.revokeObjectURL(blobUrl);
  }
  blobFileMap.value.clear();
});
</script>

<template>
  <div class="flex h-full flex-col md:flex-row">
    <!-- Editor -->
    <div
      class="border-border relative flex h-1/2 w-full flex-col border-b md:h-full md:w-1/2 md:border-r md:border-b-0"
      @dragover.prevent="dragCounter++"
      @dragleave.prevent="
        dragCounter--;
        isDraggingOver = dragCounter > 0;
      "
      @drop.prevent="
        dragCounter = 0;
        handleDrop($event);
      "
    >
      <!-- Drag overlay -->
      <div
        v-if="isDraggingOver"
        class="border-primary/50 bg-primary/10 pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed"
      >
        <span class="text-primary text-sm font-semibold">释放以添加图片</span>
      </div>

      <div class="border-border flex h-12 shrink-0 items-center border-b px-4">
        <div class="flex w-full items-center justify-between">
          <h1 class="text-muted-foreground text-xs font-bold tracking-wider">
            MARKDOWN
          </h1>
          <div class="flex items-center gap-2">
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleImageUpload"
            />
            <button
              type="button"
              class="text-muted-foreground hover:bg-accent border-border rounded-full border px-3 py-1 text-xs font-semibold transition"
              @click="fileInputRef?.click()"
            >
              插入图片
            </button>
          </div>
        </div>
      </div>
      <textarea
        v-model="markdownText"
        class="placeholder:text-muted-foreground flex-1 resize-none bg-transparent p-6 font-mono text-sm leading-relaxed outline-none focus:ring-0"
        placeholder="# 在此编写 Markdown 内容&#10;&#10;- 支持列表&#10;- **粗体**&#10;- *斜体*&#10;&#10;```js&#10;console.log('Hello!');&#10;```"
      ></textarea>
    </div>

    <!-- Preview -->
    <div class="flex h-1/2 w-full flex-col md:h-full md:w-1/2">
      <div class="border-border flex h-12 shrink-0 items-center border-b px-4">
        <h2 class="text-muted-foreground text-xs font-bold tracking-wider">
          PREVIEW
        </h2>
      </div>
      <div
        class="prose prose-slate dark:prose-invert max-w-none flex-1 overflow-y-auto p-6"
      >
        <div v-html="renderedMarkdown" @click="handlePreviewClick"></div>
      </div>
    </div>

    <!-- Image Editor Modal -->
    <teleport to="body">
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isImageEditorOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          @click.self="closeImageEditor"
        >
          <div class="bg-card w-full max-w-md rounded-3xl shadow-2xl">
            <div
              class="border-border flex items-center justify-between border-b px-6 py-4"
            >
              <h3 class="text-foreground text-base font-semibold">编辑图片</h3>
              <button
                type="button"
                class="text-muted-foreground hover:bg-accent bg-muted rounded-full px-3 py-1 text-xs font-semibold transition"
                @click="closeImageEditor"
              >
                关闭
              </button>
            </div>

            <div class="p-6">
              <div
                class="bg-muted mb-4 flex items-center justify-center rounded-2xl p-4"
              >
                <img
                  :src="editingImageUrl"
                  :alt="editingImageAlt"
                  class="max-h-50 w-full rounded-xl object-contain"
                  @click.stop="openImageInNewTab(editingImageUrl)"
                />
              </div>

              <div class="space-y-3">
                <input
                  v-model="editingImageAlt"
                  type="text"
                  placeholder="图片说明 (Alt)"
                  class="text-foreground placeholder:text-muted-foreground focus:border-ring border-border bg-card w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />

                <div class="grid grid-cols-2 gap-3">
                  <input
                    v-model="editingImageWidth"
                    type="number"
                    min="0"
                    placeholder="宽度"
                    class="text-foreground placeholder:text-muted-foreground focus:border-ring border-border bg-card w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  />
                  <input
                    v-model="editingImageHeight"
                    type="number"
                    min="0"
                    placeholder="高度"
                    class="text-foreground placeholder:text-muted-foreground focus:border-ring border-border bg-card w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div
              class="border-border flex items-center justify-between border-t px-6 py-4"
            >
              <div>
                <input
                  ref="replaceInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleReplaceImageUpload"
                />
                <button
                  type="button"
                  class="text-muted-foreground hover:bg-accent border-border rounded-xl border px-3 py-2 text-xs font-semibold transition"
                  @click="replaceInputRef?.click()"
                >
                  替换图片
                </button>
              </div>
              <button
                type="button"
                class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2 text-xs font-semibold transition"
                @click="closeImageEditor"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>
