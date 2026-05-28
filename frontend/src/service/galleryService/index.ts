import { galleryGateway } from '@/api/galleryGateway';

export interface GalleryService {
  getGallery(): Promise<{
    images: Array<{
      id: string;
      url: string;
      description: string;
      uploadedAt?: string;
    }>;
  }>;
  uploadGalleryImage(formData: FormData): Promise<{ url: string }>;
  saveGallery(payload: {
    images: Array<{
      id: string;
      url: string;
      description: string;
      uploadedAt?: string;
    }>;
  }): Promise<void>;
}

export const galleryService: GalleryService = {
  async getGallery() {
    return galleryGateway.getGallery();
  },

  async uploadGalleryImage(formData: FormData) {
    return galleryGateway.uploadGalleryImage(formData);
  },

  async saveGallery(payload) {
    await galleryGateway.saveGallery(payload);
  },
};
