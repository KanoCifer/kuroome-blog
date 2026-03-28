<template>
  <BasicDetail title="图片工具箱" subtitle="本地压缩与格式转换">
    <div class="col-span-full">
      <div
        class="squircle overflow-hidden border border-gray-200/60 bg-white/50 shadow-sm dark:border-gray-700/60 dark:bg-gray-900/70"
      >
        <div class="flex flex-col lg:flex-row lg:items-stretch">
          <!-- 左侧配置面板 -->
          <aside
            class="w-full shrink-0 border-b border-gray-200/60 p-6 lg:w-80 lg:border-r lg:border-b-0 dark:border-gray-700/60"
          >
            <header class="mb-8">
              <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">参数配置</h2>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">本地处理，保护隐私安全</p>
            </header>

            <div class="space-y-8">
              <!-- 尺寸限制 -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label for="max-width" class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    最大宽度限制
                  </label>
                  <input
                    v-model="enableMaxWidth"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
                <div class="relative">
                  <input
                    id="max-width"
                    v-model.number="maxWidth"
                    type="number"
                    min="1"
                    :disabled="!enableMaxWidth"
                    class="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-gray-900 focus:ring-0 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-100"
                  />
                  <span class="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-gray-400"> px </span>
                </div>
              </div>

              <!-- 压缩质量 -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label for="quality" class="text-sm font-semibold text-gray-700 dark:text-gray-300"> 压缩质量 </label>
                  <span class="font-mono text-xs font-medium text-gray-500"> {{ Math.round(quality * 100) }}% </span>
                </div>
                <Slider :default-value="[0.8]" :min="0.3" :max="1" :step="0.1" v-model="qualityArray" />
                <div class="flex justify-between text-[10px] text-gray-400 uppercase">
                  <span>高压缩</span>
                  <span>原画</span>
                </div>
              </div>

              <!-- 输出格式 -->
              <div class="space-y-3">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"> 输出格式 </span>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="option in outputTypes"
                    :key="option.value"
                    type="button"
                    class="rounded-xl border py-2 text-xs font-medium transition-all"
                    :class="
                      outputType === option.value
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
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
                  class="group relative overflow-hidden rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                  @click="handleProcess"
                >
                  <span v-if="processing" class="flex items-center justify-center gap-2">
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
                  class="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  @click="downloadProcessedImage"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  class="py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  @click="resetAll"
                >
                  清空并重置
                </button>
              </div>
            </div>
          </aside>

          <!-- 右侧工作区 -->
          <main class="flex-1 bg-gray-50/50 p-6 dark:bg-black/20">
            <div class="mx-auto max-w-5xl space-y-6">
              <!-- 拖放上传区 -->
              <div
                ref="dropZoneRef"
                class="group relative flex min-h-50 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500"
                :class="
                  isOverDropZone
                    ? 'border-gray-900 bg-gray-900/5 dark:border-gray-100 dark:bg-gray-100/5'
                    : originalFile
                      ? 'border-transparent bg-white shadow-sm dark:bg-gray-800'
                      : 'border-gray-200 bg-white hover:border-gray-400 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-gray-600'
                "
                @click="openFilePicker"
              >
                <!-- 动态背景装饰 -->
                <div
                  v-if="isOverDropZone"
                  class="absolute inset-0 animate-pulse bg-gray-900/5 dark:bg-gray-100/5"
                ></div>

                <div class="relative z-10 p-8 text-center">
                  <div v-if="!originalFile" class="space-y-4">
                    <div
                      class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 transition-transform group-hover:scale-110 dark:bg-gray-800"
                    >
                      <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p class="text-base font-bold text-gray-900 dark:text-gray-100">
                        {{ isOverDropZone ? "即刻上传" : "点击或拖拽图片" }}
                      </p>
                      <p class="mt-1 text-xs text-gray-500">支持 JPG, PNG, WebP, GIF, AVIF (最大 20MB)</p>
                    </div>
                  </div>

                  <div v-else class="flex flex-wrap items-center justify-center gap-6">
                    <div class="flex items-center gap-4">
                      <div class="h-12 w-12 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                        <img :src="originalPreviewUrl" class="h-full w-full object-cover" />
                      </div>
                      <div class="text-left">
                        <p class="max-w-50 truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                          {{ originalFile.name }}
                        </p>
                        <p class="text-xs text-gray-500">
                          {{ formatBytes(originalFile.size) }}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                      @click.stop="openFilePicker"
                    >
                      更换图片
                    </button>
                  </div>
                </div>

                <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
              </div>

              <!-- 预览对比区 -->
              <div v-if="originalFile" class="grid grid-cols-1 gap-6 md:grid-cols-2">
                <!-- 原图预览 -->
                <div
                  class="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-gray-800"
                >
                  <div class="flex items-center justify-between border-b border-gray-50 p-4 dark:border-gray-700/50">
                    <span class="text-xs font-bold tracking-wider text-gray-400 uppercase">原始图像</span>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-gray-500">缩放: {{ Math.round(originalPreviewZoom * 100) }}%</span>
                      <button
                        @click="originalPreviewZoom = 1"
                        class="text-[10px] text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                  <div
                    class="relative flex min-h-[320px] items-center justify-center overflow-auto bg-gray-50/50 p-8 dark:bg-gray-900/50"
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
                      class="h-1 w-full accent-gray-900"
                    />
                  </div>
                </div>

                <!-- 处理后预览 -->
                <div
                  class="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-gray-800"
                >
                  <div class="flex items-center justify-between border-b border-gray-50 p-4 dark:border-gray-700/50">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold tracking-wider text-gray-400 uppercase"
                        >处理后:{{ formatBytes(processedBlob?.size ?? 0) || "0 KB" }}</span
                      >
                      <span
                        v-if="processedBlob"
                        class="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-500/10"
                      >
                        {{ compressionRatio }} 节省
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-gray-500">缩放: {{ Math.round(processedPreviewZoom * 100) }}%</span>
                      <button
                        @click="processedPreviewZoom = 1"
                        class="text-[10px] text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                  <div
                    class="relative flex min-h-[320px] items-center justify-center overflow-auto bg-gray-50/50 p-8 dark:bg-gray-900/50"
                  >
                    <div v-if="processing" class="flex flex-col items-center gap-3">
                      <div
                        class="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-gray-100"
                      ></div>
                      <span class="text-xs text-gray-500">正在渲染...</span>
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
                      <svg class="mx-auto h-12 w-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.5"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <p class="mt-2 text-xs">调整参数后点击“开始处理”</p>
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
                      class="h-1 w-full accent-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p
              v-if="errorMessage"
              class="mx-auto mt-6 max-w-md rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-500 dark:bg-red-500/10"
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
interface ImageItem {
  id: string; // crypto.randomUUID()
  file: File;
  originalUrl: string; // URL.createObjectURL
  processedBlob: Blob | null;
  processedUrl: string | null;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  compressionRatio?: number;
}

const images = ref<ImageItem[]>([]);

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
  dataTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
});

const compressionRatio = computed(() => {
  if (!originalFile.value || !processedBlob.value) {
    return "-";
  }

  const ratio = ((originalFile.value.size - processedBlob.value.size) / originalFile.value.size) * 100;
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
