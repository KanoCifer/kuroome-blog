import { uploadGateway } from "@/api/uploadGateway";

export interface UploadService {
  uploadEditorImage(formData: FormData): Promise<{ url: string }>;
}

export const uploadService: UploadService = {
  async uploadEditorImage(formData: FormData) {
    return uploadGateway.uploadEditorImage(formData);
  },
};
