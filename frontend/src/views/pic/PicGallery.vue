<template>
  <div
    class="bg-background min-h-screen w-full overflow-x-hidden overflow-y-auto"
  >
    <!-- Subtle Dot Pattern Background -->
    <div
      class="text-muted-foreground/40 pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-20"
      style="
        background-image: radial-gradient(
          circle at 1px 1px,
          currentColor 1.5px,
          transparent 0
        );
        background-size: 32px 32px;
      "
    ></div>

    <PicGalleryEditBar
      :can-edit="canEdit"
      :is-edit-mode="isEditMode"
      :selected-count="selectedIds.size"
      @toggle-edit="toggleEditMode"
      @shuffle="shuffleImages"
      @upload="openUploadModal"
      @delete-selected="deleteSelected"
    />

    <!-- Gallery Container — columns 瀑布流，整页纵向滚动 -->
    <div
      class="gallery-columns relative z-10 mx-auto w-full max-w-[1400px] px-4 pt-24 pb-32 sm:px-6"
      :style="{
        columnCount: columnsCount,
        columnGap: columnsGap + 'px',
      }"
    >
      <!-- Polaroid Cards -->
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="mb-4 inline-block w-full break-inside-avoid"
        :style="{ columnBreakInside: 'avoid' }"
      >
        <PolaroidCard
          :image="image"
          :index="index"
          :aspect="getAspectRatio(index)"
          :rotation="getRotation(index)"
          :is-edit-mode="isEditMode && canEdit"
          :selected="selectedIds.has(image.id)"
          @select="openImageDetail"
          @toggle-select="toggleSelect"
          @delete="onDeleteImage"
        />
      </div>

      <!-- Empty State -->
      <div
        v-if="images.length === 0"
        class="flex h-[60vh] flex-col items-center justify-center"
        style="column-span: all"
      >
        <motion.div
          initial="{ opacity: 0, y: 20 }"
          animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.8, type: 'spring' }"
          class="bg-background border-border relative max-w-md rounded-3xl border p-10 text-center shadow-2xl"
        >
          <div
            class="bg-primary/10 text-primary mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
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

    <PicDetailModal
      :image="selectedImage"
      :editable="canEdit && isEditMode"
      :formatted-date="
        selectedImage ? formatDate(selectedImage.uploadedAt) : ''
      "
      :frame-no="selectedIndex + 1"
      :exif="selectedImage?.exif ?? undefined"
      @close="closeImageDetail"
      @update="onUpdateDescription"
      @delete="onDeleteImage"
      @prev="navigateImage(-1)"
      @next="navigateImage(1)"
    />

    <PicUploadModal
      :visible="showUploadModal"
      @close="showUploadModal = false"
      @uploaded="onImageUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import PicGalleryEditBar from '@/components/pic/PicGalleryEditBar.vue';
import PicDetailModal from '@/components/pic/PicDetailModal.vue';
import PicUploadModal from '@/components/pic/PicUploadModal.vue';
import PolaroidCard from '@/components/pic/PolaroidCard.vue';
import { Button } from '@/components/ui/button';
import { useGallery, usePolaroidLayout, type Picture } from '@/composables/pic';
import { useAuthStore } from '@/auth/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { ImageOff } from '@lucide/vue';
import { motion } from 'motion-v';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const authStore = useAuthStore();
const canEdit = computed(() => authStore.isAdmin);

// --- domain composables ---
const {
  images,
  fetchGalleryImages,
  saveGallery,
  updateDescription,
  deleteImage,
  formatDate,
} = useGallery();

const { generateLayoutSeeds, shuffleImages, getAspectRatio, getRotation } =
  usePolaroidLayout({ images });

// --- 响应式列数：依据视口宽度决定瀑布流列数 ---
const viewportWidth = ref(
  typeof window !== 'undefined' ? window.innerWidth : 1280,
);
const onResize = () => {
  viewportWidth.value = window.innerWidth;
};
const columnsCount = computed(() => {
  const w = viewportWidth.value;
  if (w < 480) return 2; // 小屏 2 列
  if (w < 768) return 3; // 移动端 3 列
  if (w < 1100) return 4; // 平板 4 列
  if (w < 1400) return 5; // 桌面 5 列
  return 6; // 宽屏 6 列
});
const columnsGap = computed(() => (viewportWidth.value < 640 ? 10 : 14));

// --- edit mode ---
const isEditMode = ref(false);
// 编辑模式选中的图片 id 集合
const selectedIds = ref<Set<string>>(new Set());

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
  if (!isEditMode.value) selectedIds.value.clear();
};

const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
  // 触发响应式更新（Set 原地变更需要重新赋值）
  selectedIds.value = new Set(selectedIds.value);
};

const deleteSelected = async () => {
  if (selectedIds.value.size === 0) {
    useNotificationStore().info('请先选中要删除的照片');
    return;
  }
  if (!ensureAdminPermission()) return;
  const ids = Array.from(selectedIds.value);
  for (const id of ids) {
    await deleteImage(id);
  }
  selectedIds.value = new Set();
  generateLayoutSeeds();
  useNotificationStore().success(`已删除 ${ids.length} 张照片`);
};

// --- upload modal ---
const showUploadModal = ref(false);

const openUploadModal = () => {
  if (!ensureAdminPermission()) return;
  showUploadModal.value = true;
};

watch(canEdit, (value) => {
  if (!value) {
    isEditMode.value = false;
    showUploadModal.value = false;
    selectedIds.value.clear();
  }
});

// --- detail modal ---
const selectedImage = ref<Picture | null>(null);
const selectedIndex = ref(-1);

const openImageDetail = (image: Picture, index: number) => {
  if (isEditMode.value) return; // 编辑模式下不进详情
  selectedImage.value = image;
  selectedIndex.value = index;
};

const closeImageDetail = () => {
  selectedImage.value = null;
  selectedIndex.value = -1;
};

const navigateImage = (delta: number) => {
  if (images.value.length === 0) return;
  const next =
    (selectedIndex.value + delta + images.value.length) % images.value.length;
  selectedIndex.value = next;
  selectedImage.value = images.value[next];
};

const onUpdateDescription = async (id: string, description: string) => {
  if (!ensureAdminPermission()) return;
  await updateDescription(id, description);
};

const onDeleteImage = async (id: string) => {
  if (!ensureAdminPermission()) return;
  const removed = await deleteImage(id);
  if (removed) {
    selectedIds.value.delete(id);
    selectedIds.value = new Set(selectedIds.value);
    generateLayoutSeeds();
    closeImageDetail();
  }
};

const onImageUploaded = async (image: Picture) => {
  images.value.push(image);
  await saveGallery();
  generateLayoutSeeds();
};

onMounted(async () => {
  window.addEventListener('resize', onResize);
  await fetchGalleryImages();
  generateLayoutSeeds();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Kalam:wght@400;700&display=swap');

/* 瀑布流断点细化：小屏 2 列已在 JS 控制，这里补防内嵌预览极窄情况 */
@media (max-width: 380px) {
  .gallery-columns {
    column-count: 1 !important;
  }
}
</style>
