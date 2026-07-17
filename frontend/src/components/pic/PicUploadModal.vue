<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
      enter-from-class="opacity-0 backdrop-blur-none"
      enter-to-class="opacity-100 backdrop-blur-xl"
      leave-active-class="transition-all duration-200 ease-out"
      leave-from-class="opacity-100 backdrop-blur-xl"
      leave-to-class="opacity-0 backdrop-blur-none"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-9999 flex items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/45 backdrop-blur-md"></div>

        <!-- Modal Content -->
        <motion.div
          :initial="{ opacity: 0, scale: 0.95, y: 10 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :exit="{ opacity: 0, scale: 0.95, y: 10 }"
          :transition="{ type: 'spring', damping: 25, stiffness: 300 }"
          class="bg-background/95 border-border/60 relative z-10 w-full max-w-md rounded-[2rem] border p-6 shadow-2xl backdrop-blur-2xl md:p-8"
        >
          <!-- Close Button -->
          <button
            @click="$emit('close')"
            class="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
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
                  class="bg-background/30 rounded-full px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md"
                  >更换图片</span
                >
              </div>
            </div>

            <!-- Placeholder -->
            <div v-else class="flex flex-col items-center">
              <div
                class="bg-background ring-border/5 mb-4 flex h-14 w-14 items-center justify-center rounded-full shadow-sm ring-1 transition-transform group-hover:scale-110"
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
              class="text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground border-border/80 bg-background mt-2 w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
            />
          </div>

          <!-- Actions -->
          <div class="mt-8 flex gap-3">
            <Button
              variant="outline"
              class="flex-1 rounded-xl shadow-sm"
              @click="$emit('close')"
            >
              取消
            </Button>
            <Button
              class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl shadow-md"
              :disabled="!canSubmit"
              @click="onConfirm"
            >
              <Loader2 v-if="isUploading" class="mr-2 h-4 w-4 animate-spin" />
              {{ isUploading ? '上传中...' : '确认上传' }}
            </Button>
          </div>
        </motion.div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, UploadCloud, X } from '@lucide/vue';
import { motion } from 'motion-v';
import { useGalleryUpload } from '@/composables/pic';
import type { Picture } from '@/composables/pic';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  uploaded: [image: Picture];
}>();

const {
  fileInputRef,
  previewUrl,
  uploadDescription,
  isUploading,
  isDragging,
  canSubmit,
  triggerFileInput,
  handleFileSelect,
  handleDrop,
  uploadImage,
} = useGalleryUpload();

const onConfirm = async () => {
  const image = await uploadImage();
  if (image) {
    emit('uploaded', image);
    emit('close');
  }
};
</script>
