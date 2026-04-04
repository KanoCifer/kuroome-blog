import request, { extractData } from '@/api/request';

export interface Picture {
  id: string;
  uploadedAt?: string;
  url: string;
  description: string;
}

export interface GalleryData {
  images: Picture[];
}

export interface SaveGalleryPayload {
  images: Array<{
    id: string;
    url: string;
    description: string;
    uploadedAt?: string;
  }>;
}

export interface GalleryService {
  getGallery(): Promise<GalleryData>;
  uploadGalleryImage(formData: FormData): Promise<string>;
  saveGallery(payload: SaveGalleryPayload): Promise<void>;
}

export const galleryService = (): GalleryService => ({
  async getGallery() {
    const res = await request.get('/pic-gallery');
    const data = extractData(res) as { images?: Picture[] } | undefined;
    return {
      images: data?.images ?? [],
    };
  },

  async uploadGalleryImage(formData: FormData) {
    const res = await request.post('/upload-gallery-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = extractData(res) as { url?: string } | undefined;
    if (!data?.url) {
      throw new Error('上传成功但未返回图片地址');
    }
    return data.url;
  },

  async saveGallery(payload) {
    await request.post('/set-pic-gallery', payload);
  },
});
