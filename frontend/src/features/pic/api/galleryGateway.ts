import request from '@/shared/api/request';
import type { ExifInfo } from '@/features/pic/composables';

export interface GalleryImage {
  id: string;
  url: string;
  description: string;
  uploadedAt?: string;
  exif?: ExifInfo | null;
}

export interface GalleryResponse {
  images: GalleryImage[];
}

export interface GalleryGateway {
  getGallery(): Promise<GalleryResponse>;
  uploadGalleryImage(formData: FormData): Promise<{ url: string }>;
  saveGallery(payload: { images: GalleryImage[] }): Promise<void>;
}

export const galleryGateway: GalleryGateway = {
  async getGallery(): Promise<GalleryResponse> {
    const res = await request.get<{ data: GalleryResponse }>('v1/pic-gallery');
    return res.data.data;
  },

  async uploadGalleryImage(formData: FormData): Promise<{ url: string }> {
    const res = await request.post<{ data: { url: string } }>(
      'v3/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data.data;
  },

  async saveGallery(payload: { images: GalleryImage[] }): Promise<void> {
    await request.post('v1/set-pic-gallery', payload);
  },
};
