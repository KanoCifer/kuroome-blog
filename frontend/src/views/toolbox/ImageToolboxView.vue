<template>
  <BasicDetail title="图片工具箱" subtitle="本地压缩与格式转换">
    <div class="col-span-full">
      <div
        class="squircle border-border/60 bg-card/50 overflow-hidden border shadow-sm"
      >
        <div class="flex flex-col lg:flex-row lg:items-stretch">
          <!-- 左侧配置面板 -->
          <aside
            class="border-border/60 w-full shrink-0 border-b p-6 lg:w-80 lg:border-r lg:border-b-0"
          >
            <header class="mb-8">
              <h2 class="text-foreground text-xl font-bold">参数配置</h2>
              <p class="text-muted-foreground mt-1 text-xs">
                本地处理，保护隐私安全
              </p>
            </header>

            <div class="space-y-8">
              <!-- 尺寸限制 -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label
                    for="max-width"
                    class="text-foreground text-sm font-semibold"
                  >
                    最大宽度限制
                  </label>
                  <input
                    v-model="enableMaxWidth"
                    type="checkbox"
                    class="text-foreground focus:ring-foreground border-border bg-card h-4 w-4 rounded"
                  />
                </div>
                <div class="relative">
                  <input
                    id="max-width"
                    v-model.number="maxWidth"
                    type="number"
                    min="1"
                    :disabled="!enableMaxWidth"
                    class="text-foreground placeholder:text-muted-foreground focus:border-foreground border-border bg-card disabled:bg-muted disabled:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:ring-0 focus:outline-none"
                  />
                  <span
                    class="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2 text-xs"
                    >px</span
                  >
                </div>
              </div>

              <!-- 压缩质量 -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label
                    for="quality"
                    class="text-foreground text-sm font-semibold"
                  >
                    压缩质量
                  </label>
                  <span
                    class="text-muted-foreground font-mono text-xs font-medium"
                  >
                    {{ Math.round(quality * 100) }}%
                  </span>
                </div>
                <Slider
                  :default-value="[0.8]"
                  :min="0.3"
                  :max="1"
                  :step="0.1"
                  v-model="qualityArray"
                />
                <div
                  class="text-muted-foreground flex justify-between text-[10px] uppercase"
                >
                  <span>高压缩</span>
                  <span>原画</span>
                </div>
              </div>

              <!-- 输出格式 -->
              <div class="space-y-3">
                <span class="text-foreground text-sm font-semibold"
                  >输出格式</span
                >
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="option in outputTypes"
                    :key="option.value"
                    type="button"
                    class="rounded-xl border py-2 text-xs font-medium transition-all"
                    :class="
                      outputType === option.value
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'
                    "
                    @click="outputType = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="grid grid-cols-1 gap-3 pt-4">
                <button
                  type="button"
                  :disabled="!originalFile || processing"
                  class="bg-foreground text-background hover:bg-foreground/90 group relative overflow-hidden rounded-xl py-3 text-sm font-bold transition-all"
                  @click="handleProcess"
                >
                  <span
                    v-if="processing"
                    class="flex items-center justify-center gap-2"
                  >
                    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                        fill="none"
                      />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    正在处理
                  </span>
                  <span v-else>开始处理</span>
                </button>

                <button
                  type="button"
                  :disabled="!processedBlob"
                  class="text-foreground hover:bg-accent border-border bg-card flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all disabled:opacity-50"
                  @click="downloadProcessedImage"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  下载结果
                </button>

                <button
                  type="button"
                  class="text-muted-foreground hover:text-foreground py-2 text-xs font-medium"
                  @click="resetAll"
                >
                  清空并重置
                </button>
              </div>
            </div>
          </aside>

          <!-- 右侧工作区 -->
          <main class="bg-muted/50 flex-1 p-6 dark:bg-black/20">
            <div class="mx-auto max-w-5xl space-y-6">
              <!-- 拖放上传区 -->
              <div
                ref="dropZoneRef"
                class="group relative flex min-h-50 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500"
                :class="
                  isOverDropZone
                    ? 'border-foreground bg-foreground/5'
                    : originalFile
                      ? 'bg-card border-transparent shadow-sm'
                      : 'border-border bg-card hover:border-muted-foreground'
                "
                @click="openFilePicker"
              >
                <!-- 动态背景装饰 -->
                <div
                  v-if="isOverDropZone"
                  class="bg-foreground/5 absolute inset-0 animate-pulse"
                ></div>

                <div class="relative z-10 p-8 text-center">
                  <div v-if="!originalFile" class="space-y-4">
                    <div
                      class="bg-muted text-muted-foreground mx-auto flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                    >
                      <svg
                        class="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p class="text-foreground text-base font-bold">
                        {{ isOverDropZone ? "即刻上传" : "点击或拖拽图片" }}
                      </p>
                      <p class="text-muted-foreground mt-1 text-xs">
                        支持 JPG, PNG, WebP, GIF, AVIF (最大 20MB)
                      </p>
                    </div>
                  </div>

                  <div
                    v-else
                    class="flex flex-wrap items-center justify-center gap-6"
                  >
                    <div class="flex items-center gap-4">
                      <div
                        class="bg-muted h-12 w-12 overflow-hidden rounded-lg"
                      >
                        <img
                          :src="originalPreviewUrl"
                          class="h-full w-full object-cover"
                        />
                      </div>
                      <div class="text-left">
                        <p
                          class="text-foreground max-w-50 truncate text-sm font-bold"
                        >
                          {{ originalFile.name }}
                        </p>
                        <p class="text-muted-foreground text-xs">
                          {{ formatBytes(originalFile.size) }}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="text-foreground bg-card ring-border hover:bg-accent rounded-full px-4 py-1.5 text-xs font-bold shadow-sm ring-1 transition-all"
                      @click.stop="openFilePicker"
                    >
                      更换图片
                    </button>
                  </div>
                </div>

                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileChange"
                />
              </div>

              <!-- 预览对比区 -->
              <div
                v-if="originalFile"
                class="grid grid-cols-1 gap-6 md:grid-cols-2"
              >
                <!-- 原图预览 -->
                <div
                  class="group bg-card relative flex flex-col overflow-hidden rounded-3xl shadow-sm"
                >
                  <div
                    class="border-border/50 flex items-center justify-between border-b p-4"
                  >
                    <span
                      class="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                      >原始图像</span
                    >
                    <div class="flex items-center gap-2">
                      <span class="text-muted-foreground text-[10px]"
                        >缩放:
                        {{ Math.round(originalPreviewZoom * 100) }}%</span
                      >
                      <button
                        @click="originalPreviewZoom = 1"
                        class="text-muted-foreground hover:text-foreground text-[10px]"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                  <div
                    class="bg-muted/50 relative flex min-h-[320px] items-center justify-center overflow-auto p-8"
                  >
                    <button
                      type="button"
                      class="cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                      @click="openPreview(originalPreviewUrl, '原图预览')"
                    >
                      <img
                        :src="originalPreviewUrl"
                        alt="原图预览"
                        :style="{
                          transform: `scale(${originalPreviewZoom})`,
                          transformOrigin: 'center center',
                        }"
                        class="max-h-60 w-auto max-w-none rounded-lg object-contain shadow-sm"
                      />
                    </button>
                  </div>
                  <div
                    class="absolute bottom-4 left-1/2 w-32 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <input
                      v-model.number="originalPreviewZoom"
                      type="range"
                      min="1"
                      max="4"
                      step="0.1"
                      class="accent-foreground h-1 w-full"
                    />
                  </div>
                </div>

                <!-- 处理后预览 -->
                <div
                  class="group bg-card relative flex flex-col overflow-hidden rounded-3xl shadow-sm"
                >
                  <div
                    class="border-border/50 flex items-center justify-between border-b p-4"
                  >
                    <div class="flex items-center gap-2">
                      <span
                        class="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                        >处理后:{{
                          formatBytes(processedBlob?.size ?? 0) || "0 KB"
                        }}</span
                      >
                      <span
                        v-if="processedBlob"
                        class="bg-success/10 text-success rounded-full px-2 py-0.5 text-[10px] font-bold"
                      >
                        {{ compressionRatio }} 节省
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-muted-foreground text-[10px]"
                        >缩放:
                        {{ Math.round(processedPreviewZoom * 100) }}%</span
                      >
                      <button
                        @click="processedPreviewZoom = 1"
                        class="text-muted-foreground hover:text-foreground text-[10px]"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                  <div
                    class="bg-muted/50 relative flex min-h-[320px] items-center justify-center overflow-auto p-8"
                  >
                    <div
                      v-if="processing"
                      class="flex flex-col items-center gap-3"
                    >
                      <div
                        class="border-foreground h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                      ></div>
                      <span class="text-muted-foreground text-xs"
                        >正在渲染...</span
                      >
                    </div>
                    <button
                      v-else-if="processedPreviewUrl"
                      type="button"
                      class="cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                      @click="openPreview(processedPreviewUrl, '处理后预览')"
                    >
                      <img
                        :src="processedPreviewUrl"
                        alt="处理后预览"
                        :style="{
                          transform: `scale(${processedPreviewZoom})`,
                          transformOrigin: 'center center',
                        }"
                        class="max-h-60 w-auto max-w-none rounded-lg object-contain shadow-sm"
                      />
                    </button>
                    <div v-else class="text-center text-gray-300">
                      <svg
                        class="mx-auto h-12 w-12 opacity-20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <p class="mt-2 text-xs">调整参数后点击"开始处理"</p>
                    </div>
                  </div>
                  <div
                    v-if="processedPreviewUrl"
                    class="absolute bottom-4 left-1/2 w-32 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <input
                      v-model.number="processedPreviewZoom"
                      type="range"
                      min="1"
                      max="4"
                      step="0.1"
                      class="accent-foreground h-1 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p
              v-if="errorMessage"
              class="bg-destructive/10 text-destructive mx-auto mt-6 max-w-md rounded-xl p-3 text-center text-xs font-medium"
            >
              {{ errorMessage }}
            </p>
          </main>
        </div>
      </div>

      <!-- 全屏预览 -->
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
            v-if="isPreviewDialogOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
            @click.self="closePreviewDialog"
          >
            <button
              type="button"
              class="absolute top-6 right-6 h-10 w-10 rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              @click="closePreviewDialog"
            >
              ✕
            </button>
            <img
              :src="previewDialogUrl"
              :alt="previewDialogAlt"
              class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </transition>
      </teleport>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import { BasicDetail } from "@/components/basic";
import { Slider } from "@/components/ui/slider";
import { formatBytes, getFileExtension, processImage } from "@/utils/handlePic";
import { useDropZone } from "@vueuse/core";
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";

interface OutputTypeOption {
  label: string;
  value: string;
}
const fileInputRef = ref<HTMLInputElement | null>(null);
const dropZoneRef = useTemplateRef("dropZoneRef");
const originalFile = ref<File | null>(null);
const processedBlob = ref<Blob | null>(null);
const originalPreviewUrl = ref<string>("");
const processedPreviewUrl = ref<string>("");
const originalPreviewZoom = ref<number>(1);
const processedPreviewZoom = ref<number>(1);
const isPreviewDialogOpen = ref<boolean>(false);
const previewDialogUrl = ref<string>("");
const previewDialogAlt = ref<string>("");
const processing = ref<boolean>(false);
const errorMessage = ref<string>("");

const maxWidth = ref<number>(1600);
const enableMaxWidth = ref<boolean>(true);
const quality = ref<number>(0.8);
const outputType = ref<string>("image/webp");

const outputTypes: OutputTypeOption[] = [
  { label: "WebP", value: "image/webp" },
  { label: "JPEG", value: "image/jpeg" },
  { label: "PNG", value: "image/png" },
];

// Slider 组件 v-model 需要数组格式，这里做个转换
const qualityArray = computed({
  get: () => [quality.value],
  set: (val: number[]) => {
    quality.value = val[0];
  },
});

// 拖放上传：把 drop zone 结果统一交给文件处理函数，避免逻辑分叉
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop(files) {
    if (!files?.length) {
      return;
    }

    const firstImage = files.find((file) => file.type.startsWith("image/"));
    if (firstImage) {
      handleSelectedFile(firstImage);
    }
  },
  multiple: false,
  dataTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ],
});

const compressionRatio = computed(() => {
  if (!originalFile.value || !processedBlob.value) {
    return "-";
  }

  const ratio =
    ((originalFile.value.size - processedBlob.value.size) /
      originalFile.value.size) *
    100;
  return `${ratio.toFixed(1)}%`;
});

function revokePreviewUrl(url: string) {
  if (!url) {
    return;
  }
  URL.revokeObjectURL(url);
}

function resetProcessedState() {
  revokePreviewUrl(processedPreviewUrl.value);
  processedPreviewUrl.value = "";
  processedBlob.value = null;
  processedPreviewZoom.value = 1;
}

function openFilePicker() {
  fileInputRef.value?.click();
}

// 弹层预览控制：只负责显示/关闭，不直接改动图片数据
function openPreview(url: string, alt: string) {
  if (!url) {
    return;
  }

  previewDialogUrl.value = url;
  previewDialogAlt.value = alt;
  isPreviewDialogOpen.value = true;
}

function closePreviewDialog() {
  isPreviewDialogOpen.value = false;
  previewDialogUrl.value = "";
  previewDialogAlt.value = "";
}

function handlePreviewKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closePreviewDialog();
  }
}

// 统一处理点击选择和拖放上传
function handleSelectedFile(selectedFile: File) {
  errorMessage.value = "";

  if (!selectedFile.type.startsWith("image/")) {
    errorMessage.value = "请选择有效的图片文件。";
    return;
  }

  originalFile.value = selectedFile;
  resetProcessedState();
  originalPreviewZoom.value = 1;

  // 释放之前的预览 URL，避免内存泄漏
  revokePreviewUrl(originalPreviewUrl.value);
  originalPreviewUrl.value = URL.createObjectURL(selectedFile);
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0];

  if (!selectedFile) {
    return;
  }

  handleSelectedFile(selectedFile);
}

async function handleProcess() {
  if (!originalFile.value) {
    errorMessage.value = "请先选择图片文件。";
    return;
  }

  errorMessage.value = "";
  processing.value = true;

  try {
    const normalizedQuality = Math.min(Math.max(quality.value, 0.3), 1);
    const resultBlob = await processImage(originalFile.value, {
      maxWidth: enableMaxWidth.value ? maxWidth.value : undefined,
      quality: normalizedQuality,
      type: outputType.value,
    });

    resetProcessedState();
    processedBlob.value = resultBlob;
    processedPreviewUrl.value = URL.createObjectURL(resultBlob);
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = "图片处理失败，请稍后重试。";
    }
  } finally {
    processing.value = false;
  }
}

function getOutputExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".img";
  }
}

function downloadProcessedImage() {
  if (!processedBlob.value || !originalFile.value) {
    return;
  }

  const originalExtension = getFileExtension(originalFile.value.name);
  const outputExtension = getOutputExtension(outputType.value);
  const baseName = originalFile.value.name.replace(originalExtension, "");
  const downloadName = `${baseName}-processed${outputExtension}`;
  const url = URL.createObjectURL(processedBlob.value);

  const link = document.createElement("a");
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function resetAll() {
  errorMessage.value = "";
  processing.value = false;

  originalFile.value = null;
  resetProcessedState();

  revokePreviewUrl(originalPreviewUrl.value);
  originalPreviewUrl.value = "";
  originalPreviewZoom.value = 1;

  maxWidth.value = 1600;
  enableMaxWidth.value = true;
  quality.value = 0.8;
  outputType.value = "image/webp";

  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

onUnmounted(() => {
  // 组件卸载前清理对象 URL 和全局键盘监听，避免内存泄漏
  revokePreviewUrl(originalPreviewUrl.value);
  revokePreviewUrl(processedPreviewUrl.value);
  closePreviewDialog();
  window.removeEventListener("keydown", handlePreviewKeydown);
});

onMounted(() => {
  // 支持 Esc 关闭大图弹层
  window.addEventListener("keydown", handlePreviewKeydown);
});
</script>
