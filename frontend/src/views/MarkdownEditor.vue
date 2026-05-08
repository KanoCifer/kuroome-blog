<script setup lang="ts">
import BasicDetail from "@/components/basic/BasicDetail.vue";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { computed, onBeforeUnmount, ref } from "vue";

interface ImageItem {
  id: string;
  file: File;
  url: string; // 本地预览 URL
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  align?: "left" | "center" | "right";
}

const images = ref<ImageItem[]>([]);
const markdownText = ref<string>("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const replaceInputRef = ref<HTMLInputElement | null>(null);

const isImageEditorOpen = ref<boolean>(false);
const editingImageId = ref<string | null>(null);
const editingImageUrl = ref<string>("");
const editingOriginalUrl = ref<string>("");
const editingImageAlt = ref<string>("");
const editingImageTitle = ref<string>("");
const editingImageWidth = ref<string>("");
const editingImageHeight = ref<string>("");
const editingImageAlign = ref<"left" | "center" | "right">("center");
const editingImageFile = ref<File | null>(null);

const createImageId = () => `${dayjs()}-${Math.random().toString(16).slice(2)}`;

const revokeObjectUrl = (url: string) => {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

const handleInsertImage = (url: string) => {
  const md = `![image](${url})`;

  // 将 Markdown 插入到文本中
  markdownText.value += `${md}\n\n`;
};

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files) return;

  const newImages: ImageItem[] = [];
  for (const file of target.files) {
    const id = createImageId();
    const url = URL.createObjectURL(file);
    const alt = file.name;
    newImages.push({ id, file, url, alt, align: "center" });
  }
  images.value.push(...newImages);

  // 将图片 Markdown 插入到文本中
  handleInsertImage(newImages[0].url);

  target.value = "";
};

const openImageEditor = (payload: {
  id?: string | null;
  url: string;
  alt?: string;
  title?: string;
  width?: string | null;
  height?: string | null;
  align?: "left" | "center" | "right";
}) => {
  editingImageId.value = payload.id ?? null;
  editingImageUrl.value = payload.url;
  editingOriginalUrl.value = payload.url;
  editingImageAlt.value = payload.alt ?? "";
  editingImageTitle.value = payload.title ?? "";
  editingImageWidth.value = payload.width ?? "";
  editingImageHeight.value = payload.height ?? "";
  editingImageAlign.value = payload.align ?? "center";
  editingImageFile.value = null;
  isImageEditorOpen.value = true;
};

const closeImageEditor = () => {
  if (
    editingImageFile.value &&
    editingImageUrl.value !== editingOriginalUrl.value
  ) {
    revokeObjectUrl(editingImageUrl.value);
  }
  isImageEditorOpen.value = false;
  editingImageId.value = null;
  editingImageUrl.value = "";
  editingOriginalUrl.value = "";
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

  const img = target as HTMLImageElement;
  const id = img.getAttribute("data-md-id");
  const alignAttr = img.getAttribute("data-align");
  const alignFromClass = img.classList.contains("md-img-left")
    ? "left"
    : img.classList.contains("md-img-right")
      ? "right"
      : "center";
  const align =
    alignAttr === "left" || alignAttr === "center" || alignAttr === "right"
      ? alignAttr
      : alignFromClass;

  openImageEditor({
    id,
    url: img.currentSrc || img.src,
    alt: img.alt,
    title: img.getAttribute("title") ?? "",
    width: img.getAttribute("width"),
    height: img.getAttribute("height"),
    align,
  });
};

const openImageInNewTab = (url: string) => {
  window.open(url);
};

const handleReplaceImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  const newUrl = URL.createObjectURL(file);
  editingImageUrl.value = newUrl;
  editingImageFile.value = file;
  if (!editingImageAlt.value) {
    editingImageAlt.value = file.name;
  }

  target.value = "";
};

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderedMarkdown = computed<string>(() => {
  if (!markdownText.value) return "";
  const rawHtml = marked.parse(markdownText.value, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["data-md-id", "data-align"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|blob):|[^a-z]*|[a-z0-9.+-]*$)/i,
  });
});

onBeforeUnmount(() => {
  images.value.forEach((img) => revokeObjectUrl(img.url));
});
</script>

<template>
  <BasicDetail title="Markdown 编辑器" subtitle="实时预览">
    <div
      class="col-span-full h-175 overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-900"
    >
      <div
        class="col-span-full h-175 overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-900"
      >
        <div class="flex h-full w-full flex-col md:flex-row">
          <!-- Left Column: Editor -->
          <div
            class="flex h-1/2 w-full flex-col border-b border-slate-200 md:h-full md:w-1/2 md:border-r md:border-b-0 dark:border-slate-800"
          >
            <div
              class="flex h-12 shrink-0 items-center border-b border-slate-200 px-4 dark:border-slate-800"
            >
              <div class="flex w-full items-center justify-between">
                <h1
                  class="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400"
                >
                  MARKDOWN
                </h1>
                <div class="flex items-center gap-2">
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/*"
                    multiple
                    class="hidden"
                    @change="handleImageUpload"
                  />
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    @click="fileInputRef?.click()"
                  >
                    插入图片
                  </button>
                </div>
              </div>
            </div>
            <textarea
              v-model="markdownText"
              class="flex-1 resize-none bg-transparent p-6 font-mono text-sm leading-relaxed outline-none placeholder:text-slate-300 focus:ring-0 dark:placeholder:text-slate-700"
              placeholder="# Welcome to Markdown Editor&#10;&#10;Type some Markdown here...&#10;&#10;- Lists&#10;- **Bold text**&#10;- *Italic text*&#10;&#10;```js&#10;console.log('Hello World!');&#10;```"
            ></textarea>
          </div>

          <!-- Right Column: Preview -->
          <div class="flex h-1/2 w-full flex-col md:h-full md:w-1/2">
            <div
              class="flex h-12 shrink-0 items-center border-b border-slate-200 px-4 dark:border-slate-800"
            >
              <h2
                class="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400"
              >
                PREVIEW
              </h2>
            </div>
            <!-- Use Tailwind Typography plugin (prose) for styling the markdown output -->
            <div
              class="prose prose-slate dark:prose-invert max-w-none flex-1 overflow-y-auto p-6"
            >
              <div v-html="renderedMarkdown" @click="handlePreviewClick"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
          <div
            class="w-full max-w-3xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
          >
            <div
              class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800"
            >
              <h3
                class="text-base font-semibold text-slate-800 dark:text-slate-100"
              >
                编辑图片
              </h3>
              <button
                type="button"
                class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="closeImageEditor"
              >
                关闭
              </button>
            </div>

            <div class="grid gap-6 p-6 md:grid-cols-2">
              <div class="flex h-full flex-col gap-3">
                <div
                  class="flex-1 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"
                >
                  <img
                    :src="editingImageUrl"
                    :alt="editingImageAlt"
                    @click.stop="openImageInNewTab(editingImageUrl)"
                    class="h-full max-h-80 w-full rounded-xl object-contain"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <input
                    ref="replaceInputRef"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleReplaceImageUpload"
                  />
                  <button
                    type="button"
                    class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    @click="replaceInputRef?.click()"
                  >
                    替换图片
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    删除
                  </button>
                </div>
              </div>

              <div class="flex flex-col gap-4">
                <label
                  class="text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >Alt 文本</label
                >
                <input
                  v-model="editingImageAlt"
                  type="text"
                  class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="图片说明"
                />

                <label
                  class="text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >标题</label
                >
                <input
                  v-model="editingImageTitle"
                  type="text"
                  class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="可选标题"
                />

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label
                      class="text-xs font-semibold text-slate-500 dark:text-slate-400"
                      >宽度</label
                    >
                    <input
                      v-model="editingImageWidth"
                      type="number"
                      min="0"
                      placeholder="自动"
                      class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label
                      class="text-xs font-semibold text-slate-500 dark:text-slate-400"
                      >高度</label
                    >
                    <input
                      v-model="editingImageHeight"
                      type="number"
                      min="0"
                      placeholder="自动"
                      class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <label
                    class="text-xs font-semibold text-slate-500 dark:text-slate-400"
                    >对齐</label
                  >
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="rounded-full px-3 py-1 text-xs font-semibold transition"
                      :class="
                        editingImageAlign === 'left'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      "
                      @click="editingImageAlign = 'left'"
                    >
                      左
                    </button>
                    <button
                      type="button"
                      class="rounded-full px-3 py-1 text-xs font-semibold transition"
                      :class="
                        editingImageAlign === 'center'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      "
                      @click="editingImageAlign = 'center'"
                    >
                      中
                    </button>
                    <button
                      type="button"
                      class="rounded-full px-3 py-1 text-xs font-semibold transition"
                      :class="
                        editingImageAlign === 'right'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      "
                      @click="editingImageAlign = 'right'"
                    >
                      右
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800"
            >
              <button
                type="button"
                class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                @click="closeImageEditor"
              >
                取消
              </button>
              <button
                type="button"
                class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </BasicDetail>
</template>

<style scoped>
:deep(.md-img) {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: pointer;
}

:deep(.md-img-left) {
  margin-left: 0;
  margin-right: auto;
}

:deep(.md-img-center) {
  margin-left: auto;
  margin-right: auto;
}

:deep(.md-img-right) {
  margin-left: auto;
  margin-right: 0;
}
</style>
