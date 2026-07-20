<script setup lang="ts">
/**
 * SpotFormPanel —— 新增钓点(悬浮圆角卡片,desktop-only)。
 *
 * 取代原 SpotFormModal(居中 UiModal xl 两栏弹窗),对齐 SpotDetailPanel /
 * AnalysisPanel 书房纸卡语系:
 * - 桌面右侧浮动(mx-4 my-6 呼吸边)、rounded-3xl、四层 color-mix 阴影
 * - 无背景模糊;仅 ✕ / Esc / 触发按钮关闭
 * - 内容堆叠:顶交互迷你地图选点 + 下方表单(480px 内放弃两栏)
 *
 * 与 SpotDetailPanel / AnalysisPanel 三者互斥(父组件 useFishingDashboard 保证)。
 */
import SpotMiniMap from '@/features/fishing/components/SpotMiniMap.vue';
import type { CreateFishingSpotPayload } from '@/features/fishing/api/fishing';
import { fishingSpotsGateway } from '@/features/fishing/api/fishing';
import { DEFAULT_MAP_CENTER } from '@/features/fishing/stores/fishingMap';
import { useGalleryUpload, type Picture } from '@/features/pic/composables';
import {
  ImagePlus,
  ImageOff,
  Loader2,
  MapPin,
  RefreshCw,
  Star,
  X,
} from '@lucide/vue';
import { computed, nextTick, ref, watch } from 'vue';
import { SlideFadeTransitionX } from '@/shared/components/ui/slide-fade-transition-x';

const props = withDefaults(
  defineProps<{
    open: boolean;
    /** 地图初始聚焦位置(默认用户定位 / 默认中心) */
    initialCenter?: [number, number];
  }>(),
  { initialCenter: () => DEFAULT_MAP_CENTER },
);

const emit = defineEmits<{
  (e: 'close'): void;
  /** 创建成功,回传新钓点名称(后端 create 不返回实体,父组件按名称匹配刷新 + 打开详情) */
  (e: 'created', name: string): void;
}>();

/*
 * 卡片阴影 —— 三层向右 ambient + 顶部 inset 纸面反光。
 * 与 SpotDetailPanel / SettingsModal 共用同一套书房阴影语系。
 */
const CARD_SHADOW = [
  '0 -1px 1px color-mix(in oklch, var(--ink) 6%, transparent)',
  '0 -8px 18px color-mix(in oklch, var(--ink) 8%, transparent)',
  '0 -24px 40px color-mix(in oklch, var(--ink) 5%, transparent)',
  'inset 0 1px 0 0 oklch(from var(--paper) l c h / 0.6)',
].join(', ');

// ── 表单字段 ──
const name = ref('');
const description = ref('');
const tags = ref('');
const rating = ref(0);
const coordinate = ref<[number, number] | null>(null);

// ── 图片上传:复用 useGalleryUpload composable,串行上传,单钓点最多 9 张 ──
const MAX_PICTURES = 9;
const pictures = ref<Picture[]>([]);
const pendingError = ref<string | null>(null);

const upload = useGalleryUpload();
const {
  fileInputRef,
  previewUrl,
  isUploading,
  isDragging,
  triggerFileInput,
  handleFileSelect,
  handleDrop,
  uploadImage,
} = upload;

const canAddMore = computed(() => pictures.value.length < MAX_PICTURES);

// ── 提交状态 ──
const submitting = ref(false);
const error = ref('');

// ── 校验 ──
const canSubmit = computed(
  () =>
    name.value.trim().length > 0 &&
    coordinate.value !== null &&
    !isUploading.value,
);

// ── 上传流:composable 选中文件后立刻触发 uploadImage ──
watch(upload.selectedFile, async (file) => {
  if (!file) return;
  if (!canAddMore.value) {
    // 防御性:上限后不应再有 selectedFile(+ 瓦片已隐藏),清空避免残留预览
    upload.selectedFile.value = null;
    upload.previewUrl.value = null;
    return;
  }
  pendingError.value = null;
  const result = await uploadImage();
  if (result) {
    pictures.value.push(result);
  } else {
    pendingError.value = '图片上传失败,请重试';
  }
});

/** 打开时重置草稿 */
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = '';
      description.value = '';
      tags.value = '';
      rating.value = 0;
      coordinate.value = null;
      error.value = '';
      pictures.value = [];
      pendingError.value = null;
      upload.selectedFile.value = null;
      upload.previewUrl.value = null;
    }
  },
);

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return;
  submitting.value = true;
  error.value = '';
  try {
    const tagsArr = tags.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const payload: CreateFishingSpotPayload = {
      name: name.value.trim(),
      location: coordinate.value!,
      description: description.value.trim(),
      tags: tagsArr,
      rating: rating.value,
      images: pictures.value.map((p) => p.url),
    };
    await fishingSpotsGateway.create(payload);
    emit('created', payload.name);
    emit('close');
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : '创建钓点失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
}

// ── 图片操作 ──
async function retryUpload(): Promise<void> {
  if (!upload.selectedFile.value || isUploading.value) return;
  pendingError.value = null;
  const result = await uploadImage();
  if (result) {
    pictures.value.push(result);
  } else {
    pendingError.value = '图片上传失败,请重试';
  }
}

function removePicture(p: Picture): void {
  pictures.value = pictures.value.filter((x) => x.id !== p.id);
}

function removeFailed(): void {
  upload.selectedFile.value = null;
  upload.previewUrl.value = null;
  pendingError.value = null;
}

function onPickerChange(event: Event): void {
  handleFileSelect(event);
  // 重置 input value,使再次选择同一文件能触发 change
  (event.target as HTMLInputElement).value = '';
}

// ── 无障碍:focus trap + Esc + restore focus ──
const panelRef = ref<HTMLElement | null>(null);
let triggerEl: HTMLElement | null = null;
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function trapFocus(e: KeyboardEvent): void {
  if (e.key !== 'Tab' || !panelRef.value) return;
  const nodes = panelRef.value.querySelectorAll<HTMLElement>(FOCUSABLE);
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      triggerEl = (document.activeElement as HTMLElement) ?? null;
      await nextTick();
      const first = panelRef.value?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    } else {
      triggerEl?.focus();
      triggerEl = null;
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <!--
      新增钓点 —— 悬浮圆角卡片(对齐 SpotDetailPanel / AnalysisPanel)。
      · 桌面右侧浮动,rounded-3xl 书房纸卡
      · 四层 color-mix 阴影,无背景模糊,仅 ✕ / Esc 关闭
    -->

    <SlideFadeTransitionX>
      <aside
        v-if="open"
        ref="panelRef"
        class="bg-background border-border/60 fixed top-6 right-6 bottom-6 z-50 flex w-full max-w-[480px] flex-col overflow-hidden rounded-3xl border"
        :style="CARD_SHADOW"
        role="dialog"
        aria-modal="true"
        aria-label="新增钓点"
        @keydown="trapFocus"
        @keydown.esc="emit('close')"
      >
        <!-- 顶栏 -->
        <header
          class="border-border flex items-start justify-between gap-3 border-b px-6 pt-6 pb-5"
        >
          <div class="min-w-0">
            <h2
              class="text-foreground font-family-averia text-2xl leading-snug"
            >
              新增钓点
            </h2>
            <p class="text-muted-foreground mt-0.5 text-xs">
              在地图上选择位置，填写钓点信息
            </p>
          </div>
          <button
            type="button"
            class="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
            aria-label="关闭"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </header>

        <!-- 错误提示 -->
        <div
          v-if="error"
          class="border-destructive/30 bg-destructive/10 text-destructive mx-6 mt-4 rounded-lg border px-3 py-2 text-sm"
          role="alert"
        >
          {{ error }}
        </div>

        <!-- 可滚动主体 -->
        <div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <!-- 交互迷你地图选点 -->
          <div class="space-y-3">
            <div class="text-muted-foreground flex items-center gap-1.5">
              <MapPin class="h-3.5 w-3.5" />
              <span class="text-xs">点击地图选择钓点位置</span>
            </div>
            <SpotMiniMap
              :center="initialCenter"
              :position="coordinate ?? undefined"
              interactive
              @update:position="coordinate = $event"
            />
            <div
              class="bg-muted flex items-center justify-between rounded-xl px-4 py-2.5"
            >
              <span class="text-muted-foreground text-xs">坐标</span>
              <span
                class="text-foreground font-mono text-xs tabular-nums"
                :class="{ 'text-muted-foreground/50': !coordinate }"
              >
                {{
                  coordinate
                    ? `${coordinate[0].toFixed(6)}, ${coordinate[1].toFixed(6)}`
                    : '点击右侧地图选点'
                }}
              </span>
            </div>
          </div>

          <!-- 表单 -->
          <div class="space-y-4">
            <!-- 名称(必填) -->
            <div>
              <label
                class="text-foreground mb-1.5 block text-sm font-medium"
                for="spot-form-name"
                >名称</label
              >
              <input
                id="spot-form-name"
                v-model="name"
                type="text"
                placeholder="例如:南沙天后宫矶钓位"
                class="bg-muted text-foreground placeholder:text-muted-foreground/60 focus:ring-primary/30 w-full rounded-xl border-0 px-4 py-3 text-sm focus:ring-2 focus:outline-none"
              />
            </div>

            <!-- 描述 -->
            <div>
              <label
                class="text-foreground mb-1.5 block text-sm font-medium"
                for="spot-form-desc"
                >描述</label
              >
              <textarea
                id="spot-form-desc"
                v-model="description"
                rows="3"
                placeholder="水情、目标鱼、最佳出钓时段..."
                class="bg-muted text-foreground placeholder:text-muted-foreground/60 focus:ring-primary/30 w-full resize-none rounded-xl border-0 px-4 py-3 text-sm leading-relaxed focus:ring-2 focus:outline-none"
              />
            </div>

            <!-- 标签 -->
            <div>
              <label
                class="text-foreground mb-1.5 block text-sm font-medium"
                for="spot-form-tags"
                >标签</label
              >
              <input
                id="spot-form-tags"
                v-model="tags"
                type="text"
                placeholder="矶钓, 海鲈, 夜钓(逗号分隔)"
                class="bg-muted text-foreground placeholder:text-muted-foreground/60 focus:ring-primary/30 w-full rounded-xl border-0 px-4 py-3 text-sm focus:ring-2 focus:outline-none"
              />
              <p class="text-muted-foreground mt-1 text-xs">
                多个标签以逗号分隔
              </p>
            </div>

            <!-- 评分 -->
            <div>
              <span class="text-foreground mb-1.5 block text-sm font-medium"
                >评分</span
              >
              <div class="flex items-center gap-1">
                <button
                  v-for="i in 5"
                  :key="i"
                  type="button"
                  class="p-0.5"
                  :aria-label="`${i} 星`"
                  @click="rating = i"
                >
                  <Star
                    class="h-5 w-5 transition-colors"
                    :class="
                      i <= rating
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground/30'
                    "
                  />
                </button>
                <span
                  v-if="rating > 0"
                  class="text-muted-foreground ml-2 text-xs tabular-nums"
                >
                  {{ rating.toFixed(1) }}
                </span>
              </div>
            </div>

            <!-- 图片(上传:3 列缩略图网格 + 末尾 + 瓦片,最多 9 张) -->
            <div>
              <span class="text-foreground mb-1.5 block text-sm font-medium"
                >图片</span
              >

              <!-- 隐藏 file input:由空态按钮 / + 瓦片 click() 触发 -->
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onPickerChange"
              />

              <!-- 空态:大块 drop-zone -->
              <button
                v-if="pictures.length === 0 && !previewUrl"
                type="button"
                class="border-border bg-muted hover:bg-muted/70 group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10 transition-colors"
                :class="{ 'border-foreground bg-muted': isDragging }"
                @click="triggerFileInput"
                @dragover.prevent
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <div
                  class="bg-background ring-border/5 mb-3 flex h-12 w-12 items-center justify-center rounded-full shadow-sm ring-1 transition-transform group-hover:scale-110"
                >
                  <ImagePlus
                    class="text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors"
                    :stroke-width="1.5"
                  />
                </div>
                <p class="text-foreground text-sm font-medium">
                  点击或拖拽图片到此处
                </p>
                <p class="text-muted-foreground mt-1.5 text-xs">
                  最多 {{ MAX_PICTURES }} 张,单张 ≤5MB
                </p>
              </button>

              <!-- 非空态:3 列缩略图网格 -->
              <div v-else class="grid grid-cols-3 gap-2">
                <!-- 已上传图片 -->
                <div
                  v-for="p in pictures"
                  :key="p.id"
                  class="group bg-muted relative aspect-square overflow-hidden rounded-xl"
                >
                  <img :src="p.url" alt="" class="h-full w-full object-cover" />
                  <button
                    type="button"
                    class="bg-background/80 text-foreground hover:bg-background absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full opacity-0 shadow-sm backdrop-blur-md transition-opacity group-hover:opacity-100"
                    aria-label="移除图片"
                    @click="removePicture(p)"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </div>

                <!-- 上传中 / 失败瓦片 -->
                <div
                  v-if="previewUrl"
                  class="bg-muted relative aspect-square overflow-hidden rounded-xl"
                  :class="pendingError ? '' : 'opacity-60'"
                  aria-busy="true"
                >
                  <img
                    :src="previewUrl"
                    alt=""
                    class="h-full w-full object-cover"
                  />

                  <!-- 上传中:中央 spinner -->
                  <div
                    v-if="!pendingError"
                    class="absolute inset-0 flex items-center justify-center bg-black/30"
                  >
                    <Loader2 class="h-5 w-5 animate-spin text-white" />
                  </div>

                  <!-- 失败:错误态 -->
                  <div
                    v-else
                    class="border-destructive bg-background/95 absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-2 text-center backdrop-blur-md"
                    role="alert"
                  >
                    <ImageOff class="text-destructive h-5 w-5" />
                    <p
                      class="text-destructive text-xs leading-tight font-medium"
                    >
                      {{ pendingError }}
                    </p>
                    <div class="flex gap-1.5">
                      <button
                        type="button"
                        class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
                        @click="retryUpload"
                      >
                        <RefreshCw class="h-3 w-3" />
                        重试
                      </button>
                      <button
                        type="button"
                        class="bg-muted text-foreground hover:bg-muted/70 rounded-md px-2 py-1 text-xs font-medium"
                        @click="removeFailed"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                </div>

                <!-- + 瓦片 -->
                <button
                  v-if="canAddMore && !previewUrl"
                  type="button"
                  class="border-border bg-muted hover:bg-muted/70 group relative aspect-square overflow-hidden rounded-xl border-2 border-dashed transition-colors"
                  :class="{ 'border-foreground': isDragging }"
                  :aria-label="'添加图片'"
                  :title="`还可上传 ${MAX_PICTURES - pictures.length} 张`"
                  @click="triggerFileInput"
                  @dragover.prevent
                  @dragleave.prevent="isDragging = false"
                  @drop.prevent="handleDrop"
                >
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <ImagePlus
                      class="text-muted-foreground group-hover:text-foreground h-5 w-5 transition-colors"
                      :stroke-width="1.5"
                    />
                    <span class="text-muted-foreground mt-1 text-xs">添加</span>
                  </div>
                </button>
              </div>

              <p class="text-muted-foreground mt-1.5 text-xs tabular-nums">
                {{ pictures.length }} / {{ MAX_PICTURES }}
              </p>
            </div>
          </div>
        </div>

        <!-- 底栏 -->
        <footer
          class="border-border flex items-center justify-end gap-2 border-t px-6 py-4"
        >
          <button
            type="button"
            class="text-muted-foreground hover:bg-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            :disabled="submitting"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canSubmit || submitting"
            @click="handleSubmit"
          >
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            {{ submitting ? '创建中...' : '添加钓点' }}
          </button>
        </footer>
      </aside>
    </SlideFadeTransitionX>
  </Teleport>
</template>
