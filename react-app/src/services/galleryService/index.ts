import request, { extractData } from '@/api/request';

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
    const res = await request.get('v1/pic-gallery');
    const data = extractData(res) as { images?: Picture[] } | undefined;
    return {
      images: data?.images ?? [],
    };
  },

  async uploadGalleryImage(formData: FormData) {
    const res = await request.post('v1/upload-gallery-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = extractData(res) as { url?: string } | undefined;
    if (!data?.url) {
      throw new Error('上传成功但未返回图片地址');
    }
    return data.url;
  },

  async saveGallery(payload) {
    await request.post('v1/set-pic-gallery', payload);
  },
});
