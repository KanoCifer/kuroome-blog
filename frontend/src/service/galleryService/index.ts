import request from "@/api/request";

export const galleryService = {
  async getGallery() {
    return request.get("/pic-gallery");
  },

  async uploadGalleryImage(formData: FormData) {
    return request.post("/upload-gallery-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  async saveGallery(payload: {
    images: Array<{
      id: string;
      url: string;
      description: string;
      uploadedAt?: string;
    }>;
  }) {
    return request.post("/set-pic-gallery", payload);
  },
};
