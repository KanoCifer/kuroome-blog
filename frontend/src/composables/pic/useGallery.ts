import { galleryGateway } from '@/api/weread/galleryGateway';
import { useNotificationStore } from '@/stores/notification';
import dayjs from 'dayjs';
import { v4 } from 'uuid';
import { ref } from 'vue';

// 照片墙图片接口
export interface ExifInfo {
  camera?: string;
  lens?: string;
  iso?: number;
  exposure?: string;
  aperture?: string;
  focalLength?: string;
  focalLength35?: string;
  takenAt?: string;
  gps?: { lat: number; lng: number };
}

export interface Picture {
  id: string;
  uploadedAt?: string;
  url: string;
  description: string;
  exif?: ExifInfo | null;
}

// API base URL for constructing full media URLs
const apiBase = import.meta.env.VITE_API_BASE || 'https://api.kanocifer.chat';

// Construct full media URL from relative path
export const getFullMediaUrl = (relativeUrl: string): string => {
  if (!relativeUrl) return '';
  // If already a full URL, return as is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  // Extract origin from apiBase to avoid duplicating path prefix (e.g. /api)
  try {
    const url = new URL(apiBase);
    return `${url.origin}${relativeUrl}`;
  } catch {
    return `${apiBase}${relativeUrl}`;
  }
};

// 照片墙数据与持久化
export const useGallery = () => {
  const images = ref<Picture[]>([]);

  // 获取照片墙图片数据
  const fetchGalleryImages = async () => {
    try {
      const response = await galleryGateway.getGallery();
      // Convert relative URLs to full media URLs
      images.value = response.images.map((img) => ({
        ...img,
        url: getFullMediaUrl(img.url),
      }));
    } catch {
      useNotificationStore().error('获取照片墙数据失败');
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

  // Update description for a picture by id
  const updateDescription = async (id: string, description: string) => {
    const index = images.value.findIndex((img) => img.id === id);
    if (index !== -1) {
      images.value[index].description = description;
      await saveGallery();
      useNotificationStore().success('描述已更新');
    }
  };

  // Delete image by id (returns true if removed)
  const deleteImage = async (id: string): Promise<boolean> => {
    const index = images.value.findIndex((img) => img.id === id);
    if (index !== -1) {
      images.value.splice(index, 1);
      await saveGallery();
      useNotificationStore().success('图片已删除');
      return true;
    }
    return false;
  };

  // Format date helper
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('YYYY年MM月DD日 HH:mm');
  };

  return {
    images,
    fetchGalleryImages,
    saveGallery,
    updateDescription,
    deleteImage,
    formatDate,
  };
};

// Generate a short id for a newly uploaded picture
export const newPictureId = () => v4().slice(0, 8);
