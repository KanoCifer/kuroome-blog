<template>
  <div class="bg-background fixed inset-0 z-40 overflow-hidden">
    <!-- Subtle Dot Pattern Background -->
    <div
      class="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20"
      style="
        background-image: radial-gradient(
          circle at 1px 1px,
          #9ca3af 1.5px,
          transparent 0
        );
        background-size: 32px 32px;
      "
    ></div>

    <!-- Header -->
    <header
      class="bg-card/70 sticky top-0 z-30 border-b border-white/40 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)] backdrop-blur-2xl dark:border-white/10 dark:shadow-none"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-end px-6 py-4">
        <div class="flex items-center gap-3">
          <Button
            v-if="canEdit"
            variant="outline"
            size="sm"
            @click="toggleEditMode"
            class="border-border/60 h-9 gap-2 rounded-full px-4 shadow-sm transition-colors"
            :class="
              isEditMode ? 'bg-primary text-primary dark:bg-primary/30' : ''
            "
          >
            <component :is="isEditMode ? Check : Edit2" class="h-4 w-4" />
            {{ isEditMode ? '完成编辑' : '编辑模式' }}
          </Button>
          <TransitionGroup name="fade">
            <Button
              v-if="isEditMode && canEdit"
              key="shuffle-btn"
              variant="outline"
              size="sm"
              @click="shuffleImages"
              class="border-border/60 h-9 gap-2 rounded-full px-4 shadow-sm"
            >
              <Shuffle class="h-4 w-4" />
              重排
            </Button>
            <Button
              v-if="isEditMode && canEdit"
              key="upload-btn"
              variant="default"
              size="sm"
              @click="openUploadModal"
              class="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-2 rounded-full px-4 shadow-md"
            >
              <Upload class="h-4 w-4" />
              上传图片
            </Button>
          </TransitionGroup>
        </div>
      </div>
    </header>

    <!-- Gallery Container -->
    <div
      ref="galleryRef"
      class="relative z-10 mx-auto h-full w-full max-w-7xl px-4 pt-24 pb-40 sm:px-6 sm:pb-12"
    >
      <!-- Polaroid Cards -->
      <motion.div
        v-for="(image, index) in images"
        :key="image.id"
        class="absolute origin-center"
        :class="
          isEditMode && canEdit
            ? 'cursor-grab active:cursor-grabbing'
            : 'cursor-pointer'
        "
        :style="getImageStyle(index)"
        :initial="{
          opacity: 0,
          scale: 0.8,
          rotate: getRandomRotation() - 10,
          y: 50,
        }"
        :animate="{ opacity: 1, scale: 1, rotate: getRandomRotation(), y: 0 }"
        :transition="{
          duration: 0.8,
          delay: index * 0.04,
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }"
        :whileHover="{
          scale: 1.05,
          zIndex: 100,
          transition: { duration: 0.2 },
        }"
        :whileDrag="
          isEditMode && canEdit
            ? {
                scale: 1.1,
                zIndex: 150,
                rotate: 0,
                cursor: 'grabbing',
                transition: { type: 'spring', stiffness: 400, damping: 25 },
              }
            : undefined
        "
        :whileTap="{
          scale: 1.05,
          cursor: isEditMode && canEdit ? 'grabbing' : 'pointer',
        }"
        drag
        :drag-constraints="galleryRef!"
        :drag-elastic="0.2"
        :drag-momentum="false"
        @dragstart="bringToFront(index)"
        @pointerdown="onPointerDown"
        @click="(e) => handlePhotoClick(image, index, e)"
      >
        <!-- Polaroid Frame -->
        <div
          class="group bg-card ring-border/5 relative flex flex-col items-center rounded-sm p-2 shadow-xl ring-1 transition-shadow hover:shadow-2xl sm:p-3"
          :style="{ width: `${getImageSize(index) + 24}px` }"
        >
          <div
            class="bg-muted relative w-full overflow-hidden rounded-sm"
            :style="{
              height: `${getImageSize(index) * getAspectRation(index)}px`,
            }"
          >
            <img
              :src="image.url"
              :alt="image.description"
              class="pointer-events-none h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              draggable="false"
            />

            <!-- Hover Overlay icon -->
            <div
              class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            >
              <div
                class="translate-y-4 transform rounded-full bg-white/20 p-3 text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
              >
                <Maximize2 class="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <!-- Empty State -->
      <div
        v-if="images.length === 0"
        class="flex h-[60vh] flex-col items-center justify-center"
      >
        <motion.div
          initial="{ opacity: 0, y: 20 }"
          animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.8, type: 'spring' }"
          class="bg-card/60 relative max-w-md rounded-[2rem] border border-white/80 p-10 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-gray-800/80"
        >
          <div
            class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-50 to-indigo-50 text-blue-500 shadow-inner dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-400"
          >
            <ImageOff class="h-10 w-10" stroke-width="1.5" />
          </div>
          <h3 class="text-foreground text-xl font-bold tracking-tight">
            还没有图片
          </h3>
          <p class="text-muted-foreground mt-2 text-sm">
            你的图片墙就像一张白纸，点击上方按钮上传第一张照片吧
          </p>
          <Button
            v-if="canEdit"
            class="mt-6 rounded-full px-8 shadow-sm"
            @click="openUploadModal"
          >
            开始上传
          </Button>
        </motion.div>
      </div>
    </div>

    <div
      class="bg-card/80 rounded-2xl border border-white/50 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10"
    >
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          @click="toggleEditMode"
          class="border-border/70 h-10 flex-1 gap-2 rounded-xl px-3 shadow-sm"
          :class="isEditMode ? 'bg-primary/15 text-primary' : ''"
        >
          <component :is="isEditMode ? Check : Edit2" class="h-4 w-4" />
          {{ isEditMode ? '完成编辑' : '编辑模式' }}
        </Button>

        <Button
          v-if="isEditMode"
          variant="outline"
          size="sm"
          @click="shuffleImages"
          class="border-border/70 h-10 rounded-xl px-3 shadow-sm"
        >
          <Shuffle class="h-4 w-4" />
        </Button>

        <Button
          v-if="isEditMode"
          variant="default"
          size="sm"
          @click="openUploadModal"
          class="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-xl px-3 shadow-sm"
        >
          <Upload class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Image Detail Modal -->
    <Teleport to="body">
      <transition
        enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
        enter-from-class="opacity-0 backdrop-blur-none"
        enter-to-class="opacity-100 backdrop-blur-xl"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 backdrop-blur-xl"
        leave-to-class="opacity-0 backdrop-blur-none"
      >
        <div
          v-if="selectedImage"
          class="fixed inset-0 z-9999 flex items-center justify-center p-4 md:p-8"
          @click.self="closeImageDetail"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/40 backdrop-blur-md"></div>

          <!-- Modal Content -->
          <motion.div
            :initial="{ opacity: 0, scale: 0.95, y: 10 }"
            :animate="{ opacity: 1, scale: 1, y: 0 }"
            :exit="{ opacity: 0, scale: 0.95, y: 10 }"
            :transition="{ type: 'spring', damping: 25, stiffness: 300 }"
            class="bg-card/95 relative z-10 flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-white/20 backdrop-blur-2xl md:flex-row dark:ring-white/10"
          >
            <!-- Close Button -->
            <button
              @click="closeImageDetail"
              class="text-muted-foreground absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/10 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/20 active:scale-95 md:hidden dark:bg-white/10 dark:hover:bg-white/20"
            >
              <X class="h-5 w-5" />
            </button>

            <!-- Image Area -->
            <div
              class="bg-muted/50 relative flex max-h-[70vh] w-full items-center justify-center p-4 md:max-h-[85vh] md:w-2/3 md:p-8"
            >
              <img
                :src="selectedImage.url"
                :alt="selectedImage.description"
                class="h-auto max-h-full w-auto max-w-full rounded-xl object-contain shadow-lg ring-1 ring-black/5 dark:ring-white/10"
              />
            </div>

            <!-- Details Area -->
            <div class="bg-card/50 flex w-full flex-col p-6 md:w-1/3 md:p-10">
              <div class="flex-1">
                <div class="mb-8 hidden justify-end md:flex">
                  <button
                    @click="closeImageDetail"
                    class="text-muted-foreground hover:bg-accent bg-muted/80 flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                  >
                    <X class="h-5 w-5" />
                  </button>
                </div>

                <div
                  class="text-muted-foreground mb-8 flex items-center text-sm font-medium"
                >
                  <Calendar class="mr-1.5 h-4 w-4" />
                  {{ formatDate(selectedImage.uploadedAt) }}
                </div>

                <!-- Edit Description -->
                <div v-if="canEdit && isEditMode" class="space-y-3">
                  <label
                    class="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
                  >
                    修改描述
                  </label>
                  <textarea
                    v-model="editDescription"
                    rows="3"
                    placeholder="输入新的描述..."
                    class="text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground border-border/80 bg-card w-full resize-none rounded-xl border px-4 py-3 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
                  ></textarea>
                  <div class="flex justify-end gap-4 pt-2">
                    <Button
                      variant="ghost"
                      class="text-destructive hover:bg-destructive/10 rounded-full px-5 shadow-sm"
                      @click="deleteImage(selectedImage.id)"
                    >
                      <Trash2 class="h-4 w-4" />
                      删除图片
                    </Button>
                    <Button
                      variant="secondary"
                      class="rounded-full px-5 shadow-sm"
                      @click="updateDescription"
                    >
                      保存修改
                    </Button>
                  </div>
                </div>

                <div
                  v-else
                  class="text-foreground bg-muted/80 rounded-md p-4 text-base whitespace-pre-wrap"
                >
                  {{ selectedImage.description || '暂无描述' }}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </transition>
    </Teleport>

    <!-- Upload Modal -->
    <Teleport to="body">
      <transition
        enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
        enter-from-class="opacity-0 backdrop-blur-none"
        enter-to-class="opacity-100 backdrop-blur-xl"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 backdrop-blur-xl"
        leave-to-class="opacity-0 backdrop-blur-none"
      >
        <div
          v-if="showUploadModal && canEdit"
          class="fixed inset-0 z-9999 flex items-center justify-center p-4"
          @click.self="showUploadModal = false"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/40 backdrop-blur-md"></div>

          <!-- Modal Content -->
          <motion.div
            :initial="{ opacity: 0, scale: 0.95, y: 10 }"
            :animate="{ opacity: 1, scale: 1, y: 0 }"
            :exit="{ opacity: 0, scale: 0.95, y: 10 }"
            :transition="{ type: 'spring', damping: 25, stiffness: 300 }"
            class="bg-card/95 relative z-10 w-full max-w-md rounded-[2rem] p-6 shadow-2xl ring-1 ring-white/20 backdrop-blur-2xl md:p-8 dark:ring-white/10"
          >
            <!-- Close Button -->
            <button
              @click="showUploadModal = false"
              class="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            >
              <X class="h-5 w-5" />
            </button>

            <!-- Header -->
            <div class="mb-6 text-center">
              <div
                class="bg-primary/10 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              >
                <UploadCloud class="h-6 w-6" />
              </div>
              <h3 class="text-foreground text-xl font-bold tracking-tight">
                上传新图片
              </h3>
              <p class="text-muted-foreground mt-1 text-sm">添加到你的照片墙</p>
            </div>

            <!-- Upload Area -->
            <div
              class="group border-border/80 bg-muted/50 hover:border-muted-foreground hover:bg-muted relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all"
              @click="triggerFileInput"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              :class="{
                'border-foreground bg-muted scale-[0.98]': isDragging,
              }"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileSelect"
              />

              <!-- Preview -->
              <div v-if="previewUrl" class="relative w-full">
                <img
                  :src="previewUrl"
                  alt="Preview"
                  class="mx-auto max-h-48 rounded-xl object-contain shadow-md"
                />
                <div
                  class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <span
                    class="rounded-full bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md"
                    >更换图片</span
                  >
                </div>
              </div>

              <!-- Placeholder -->
              <div v-else class="flex flex-col items-center">
                <div
                  class="bg-card ring-border/5 mb-4 flex h-14 w-14 items-center justify-center rounded-full shadow-sm ring-1 transition-transform group-hover:scale-110"
                >
                  <ImagePlus
                    class="text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors"
                    stroke-width="1.5"
                  />
                </div>
                <p class="text-foreground text-sm font-medium">
                  点击或拖拽图片到此处
                </p>
                <p class="text-muted-foreground mt-2 text-xs">
                  支持 JPG、PNG、GIF、WebP (最大 5MB)
                </p>
              </div>
            </div>

            <!-- Description Input -->
            <div class="mt-6">
              <label
                class="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
              >
                照片描述（可选）
              </label>
              <input
                v-model="uploadDescription"
                type="text"
                placeholder="为这张图片添加描述..."
                class="text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground border-border/80 bg-card mt-2 w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
              />
            </div>

            <!-- Actions -->
            <div class="mt-8 flex gap-3">
              <Button
                variant="outline"
                class="flex-1 rounded-xl shadow-sm"
                @click="showUploadModal = false"
              >
                取消
              </Button>
              <Button
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl shadow-md"
                :disabled="!selectedFile || isUploading"
                @click="uploadImage"
              >
                <Loader2 v-if="isUploading" class="mr-2 h-4 w-4 animate-spin" />
                {{ isUploading ? '上传中...' : '确认上传' }}
              </Button>
            </div>
          </motion.div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { galleryGateway } from '@/api/galleryGateway';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import dayjs from 'dayjs';
import {
  Calendar,
  Check,
  Edit2,
  ImageOff,
  ImagePlus,
  Loader2,
  Maximize2,
  Shuffle,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from '@lucide/vue';
import { motion } from 'motion-v';
import { v4 } from 'uuid';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

// 照片墙图片接口
interface Picture {
  id: string;
  uploadedAt?: string;
  url: string;
  description: string;
}

const images = ref<Picture[]>([]);
const galleryRef = ref<HTMLElement | null>(null);
const authStore = useAuthStore();
const canEdit = computed(() => authStore.isAdmin);

// Random layout seeds (cached per image index)
const layoutSeeds = ref<
  Map<number, { x: number; y: number; rotation: number; zIndex: number }>
>(new Map());

// Max z-index to bring dragging items to front
const maxZIndex = ref(10);

// Upload modal state
const showUploadModal = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const uploadDescription = ref('');
const isUploading = ref(false);
const isDragging = ref(false);

// Edit mode state
const isEditMode = ref(false);
const dragStartPos = ref({ x: 0, y: 0 });

const ensureAdminPermission = () => {
  if (!canEdit.value) {
    useNotificationStore().error('仅管理员可编辑图片');
    return false;
  }
  return true;
};

const toggleEditMode = () => {
  if (!ensureAdminPermission()) return;
  isEditMode.value = !isEditMode.value;
};

const openUploadModal = () => {
  if (!ensureAdminPermission()) return;
  showUploadModal.value = true;
};

watch(canEdit, (value) => {
  if (!value) {
    isEditMode.value = false;
    showUploadModal.value = false;
  }
});

const onPointerDown = (e: PointerEvent) => {
  dragStartPos.value = { x: e.clientX, y: e.clientY };
};

const handlePhotoClick = (image: Picture, index: number, e: MouseEvent) => {
  const dx = Math.abs(e.clientX - dragStartPos.value.x);
  const dy = Math.abs(e.clientY - dragStartPos.value.y);

  if (dx > 5 || dy > 5) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  openImageDetail(image, index);
};

// Image detail modal state
const selectedImage = ref<Picture | null>(null);
const selectedIndex = ref(-1);
const editDescription = ref('');

// 获取照片墙图片数据
const fetchGalleryImages = async () => {
  try {
    const response = await galleryGateway.getGallery();
    images.value = response.images;
    generateLayoutSeeds();
    console.log(images.value);
  } catch {
    useNotificationStore().error('获取照片墙数据失败');
  }
};

// Generate random layout seeds for each image (Polaroid pile look)
const generateLayoutSeeds = () => {
  layoutSeeds.value.clear();
  maxZIndex.value = images.value.length;
  images.value.forEach((_, index) => {
    // Keep them roughly within the center but scattered
    const xRange = Math.random() * 60 + 10; // 10-70% from left
    const yRange = Math.random() * 50 + 10; // 10-60% from top

    layoutSeeds.value.set(index, {
      x: xRange,
      y: yRange,
      rotation: (Math.random() - 0.5) * 30, // -15 to 15 degrees for casual scatter
      zIndex: index + 1,
    });
  });
};

// Shuffle images layout
const shuffleImages = () => {
  if (!ensureAdminPermission()) return;
  generateLayoutSeeds();
  useNotificationStore().success('照片已重新洗牌');
};

const bringToFront = (index: number) => {
  const seed = layoutSeeds.value.get(index);
  if (seed) {
    maxZIndex.value += 1;
    seed.zIndex = maxZIndex.value;
  }
};

// Get style for each image card
const getImageStyle = (index: number) => {
  const seed = layoutSeeds.value.get(index);
  if (!seed) return {};
  return {
    left: `${seed.x}%`,
    top: `${seed.y}%`,
    zIndex: seed.zIndex,
  };
};

// Get random size for variety, slightly larger for polaroids
const getImageSize = (index: number) => {
  // Use index to consistently determine size for the same image
  const seed = (index * 137) % 100;
  return 220 + seed;
};

// Get random aspect ratio, prefer standard photo formats
const getAspectRation = (index: number) => {
  const ratios = [1, 1.25, 0.8, 1.5]; // 1:1, 4:5, 5:4, 2:3
  return ratios[index % ratios.length];
};

// Get random initial rotation
const getRandomRotation = () => {
  return (Math.random() - 0.5) * 30; // -15 to 15 degrees
};

// Format date
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  return dayjs(dateStr).format('YYYY年MM月DD日 HH:mm');
};

// File input trigger
const triggerFileInput = () => {
  if (!canEdit.value) return;
  fileInputRef.value?.click();
};

// Handle file selection
const handleFileSelect = (event: Event) => {
  if (!canEdit.value) return;
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFile(target.files[0]);
  }
};

// Handle drag and drop
const handleDrop = (event: DragEvent) => {
  if (!canEdit.value) return;
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    processFile(event.dataTransfer.files[0]);
  }
};

// Process selected file
const processFile = (file: File) => {
  if (!canEdit.value) return;
  if (!file.type.startsWith('image/')) {
    useNotificationStore().error('请选择图片文件');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    useNotificationStore().error('图片大小不能超过 5MB');
    return;
  }

  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
};

// Upload image
const uploadImage = async () => {
  if (!ensureAdminPermission()) return;
  if (!selectedFile.value) return;

  isUploading.value = true;
  try {
    const url = await uploadPic(selectedFile.value);
    if (!url) return;

    const newImage: Picture = {
      id: v4().slice(0, 8),
      uploadedAt: dayjs().toISOString(),
      url: url,
      description: uploadDescription.value || '',
    };

    images.value.push(newImage);
    await saveGallery();

    // Reset upload state
    selectedFile.value = null;
    previewUrl.value = null;
    uploadDescription.value = '';
    showUploadModal.value = false;

    // Generate new layout seed for the new image
    generateLayoutSeeds();
  } finally {
    isUploading.value = false;
  }
};

// 上传图片到照片墙
const uploadPic = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await galleryGateway.uploadGalleryImage(formData);
    useNotificationStore().success('图片上传成功');
    return res.url;
  } catch {
    useNotificationStore().error('图片上传失败');
    return null;
  }
};

// 保存照片墙数据
const saveGallery = async () => {
  try {
    await galleryGateway.saveGallery({
      images: images.value.map((img) => ({
        id: img.id,
        url: img.url,
        description: img.description,
        uploadedAt: img.uploadedAt,
      })),
    });
  } catch {
    useNotificationStore().error('保存失败');
  }
};

// Open image detail
const openImageDetail = (image: Picture, index: number) => {
  selectedImage.value = image;
  selectedIndex.value = index;
  editDescription.value = image.description;
};

// Close image detail
const closeImageDetail = () => {
  selectedImage.value = null;
  selectedIndex.value = -1;
  editDescription.value = '';
};

// Update description
const updateDescription = async () => {
  if (!ensureAdminPermission()) return;
  if (!selectedImage.value) return;

  const index = images.value.findIndex(
    (img) => img.id === selectedImage.value!.id,
  );
  if (index !== -1) {
    images.value[index].description = editDescription.value;
    selectedImage.value.description = editDescription.value;
    await saveGallery();
    useNotificationStore().success('描述已更新');
  }
};

// Delete image
const deleteImage = async (id: string) => {
  if (!ensureAdminPermission()) return;
  const index = images.value.findIndex((img) => img.id === id);
  if (index !== -1) {
    images.value.splice(index, 1);
    generateLayoutSeeds();
    await saveGallery();
    closeImageDetail();
    useNotificationStore().success('图片已删除');
  }
};

onMounted(() => {
  fetchGalleryImages();
});
onUnmounted(() => {
  // Revoke object URL to free memory
  if (images.value) {
    images.value = [];
  }
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Kalam:wght@400;700&display=swap');
</style>
