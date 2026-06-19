import { galleryGateway } from '@/api/weread/galleryGateway';
import { useNotificationStore } from '@/stores/notification';
import { rewriteMediaUrl } from '@/composables/shared';
import dayjs from 'dayjs';
import { computed, ref, watch } from 'vue';
import { newPictureId, type Picture } from './useGallery';

// 上传流程：文件校验、预览、上传（不含持久化，由调用方处理新图片）
export const useGalleryUpload = () => {
  const fileInputRef = ref<HTMLInputElement | null>(null);
  const selectedFile = ref<File | null>(null);
  const previewUrl = ref<string | null>(null);
  const uploadDescription = ref('');
  const isUploading = ref(false);
  const isDragging = ref(false);

  const canSubmit = computed(() => !!selectedFile.value && !isUploading.value);

  // File input trigger
  const triggerFileInput = () => {
    fileInputRef.value?.click();
  };

  // Process selected file (validation + preview)
  const processFile = (file: File) => {
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

  // Handle file selection
  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      processFile(target.files[0]);
    }
  };

  // Handle drag and drop
  const handleDrop = (event: DragEvent) => {
    isDragging.value = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      processFile(event.dataTransfer.files[0]);
    }
  };

  // 上传图片到照片墙，返回新图片（持久化由调用方处理）
  const uploadImage = async (): Promise<Picture | null> => {
    if (!selectedFile.value) return null;

    isUploading.value = true;
    try {
      const formData = new FormData();
      formData.append('file', selectedFile.value);

      let url: string | null;
      try {
        const res = await galleryGateway.uploadGalleryImage(formData);
        useNotificationStore().success('图片上传成功');
        url = rewriteMediaUrl(res.url);
      } catch {
        useNotificationStore().error('图片上传失败');
        return null;
      }

      const newImage: Picture = {
        id: newPictureId(),
        uploadedAt: dayjs().toISOString(),
        url: url,
        description: uploadDescription.value || '',
      };

      // Reset form state for next upload
      selectedFile.value = null;
      previewUrl.value = null;
      uploadDescription.value = '';

      return newImage;
    } finally {
      isUploading.value = false;
    }
  };

  // Revoke object URL to free memory when preview changes/unmounts
  watch(previewUrl, (next, prev) => {
    if (prev) URL.revokeObjectURL(prev);
    void next;
  });

  return {
    fileInputRef,
    selectedFile,
    previewUrl,
    uploadDescription,
    isUploading,
    isDragging,
    canSubmit,
    triggerFileInput,
    handleFileSelect,
    handleDrop,
    uploadImage,
  };
};
