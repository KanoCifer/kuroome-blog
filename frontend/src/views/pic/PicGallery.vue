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

    <PicGalleryHeader
      :can-edit="canEdit"
      :is-edit-mode="isEditMode"
      @toggle-edit="toggleEditMode"
      @shuffle="shuffleImages"
      @upload="openUploadModal"
    />

    <!-- Gallery Container -->
    <div
      ref="galleryRef"
      class="relative z-10 mx-auto h-full w-full max-w-7xl px-4 pt-24 pb-40 sm:px-6 sm:pb-12"
    >
      <!-- Polaroid Cards -->
      <PolaroidCard
        v-for="(image, index) in images"
        :key="image.id"
        :image="image"
        :index="index"
        :size="getImageSize(index)"
        :aspect="getAspectRatio(index)"
        :rotation="getRotation(index)"
        :layout-style="getImageStyle(index)"
        :is-draggable="isEditMode && canEdit"
        :drag-constraints="galleryRef"
        @select="openImageDetail"
        @dragstart="bringToFront"
      />

      <!-- Empty State -->
      <div
        v-if="images.length === 0"
        class="flex h-[60vh] flex-col items-center justify-center"
      >
        <motion.div
          initial="{ opacity: 0, y: 20 }"
          animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.8, type: 'spring' }"
          class="bg-background/60 relative max-w-md rounded-[2rem] border border-white/80 p-10 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-gray-800/80"
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

    <PicDetailModal
      :image="selectedImage"
      :editable="canEdit && isEditMode"
      :formatted-date="selectedImage ? formatDate(selectedImage.uploadedAt) : ''"
      @close="closeImageDetail"
      @update="onUpdateDescription"
      @delete="onDeleteImage"
    />

    <PicUploadModal
      :visible="showUploadModal"
      @close="showUploadModal = false"
      @uploaded="onImageUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import PicGalleryHeader from '@/components/pic/PicGalleryHeader.vue';
import PicDetailModal from '@/components/pic/PicDetailModal.vue';
import PicUploadModal from '@/components/pic/PicUploadModal.vue';
import PolaroidCard from '@/components/pic/PolaroidCard.vue';
import { Button } from '@/components/ui/button';
import { useGallery, usePolaroidLayout, type Picture } from '@/composables/pic';
import { useAuthStore } from '@/auth/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { ImageOff } from '@lucide/vue';
import { motion } from 'motion-v';
import { computed, onMounted, ref, watch } from 'vue';

const authStore = useAuthStore();
const canEdit = computed(() => authStore.isAdmin);

const galleryRef = ref<HTMLElement | null>(null);

// --- domain composables ---
const {
  images,
  fetchGalleryImages,
  saveGallery,
  updateDescription,
  deleteImage,
  formatDate,
} = useGallery();

const {
  generateLayoutSeeds,
  shuffleImages,
  bringToFront,
  getImageStyle,
  getImageSize,
  getAspectRatio,
  getRotation,
} = usePolaroidLayout({ images });

// --- edit mode ---
const isEditMode = ref(false);

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
  }
});

// --- detail modal ---
const selectedImage = ref<Picture | null>(null);

const openImageDetail = (image: Picture) => {
  selectedImage.value = image;
};

const closeImageDetail = () => {
  selectedImage.value = null;
};

const onUpdateDescription = async (id: string, description: string) => {
  if (!ensureAdminPermission()) return;
  await updateDescription(id, description);
};

const onDeleteImage = async (id: string) => {
  if (!ensureAdminPermission()) return;
  const removed = await deleteImage(id);
  if (removed) {
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
  await fetchGalleryImages();
  generateLayoutSeeds();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Kalam:wght@400;700&display=swap');
</style>
