import request from '@/api/request';

export interface UploadGateway {
  uploadEditorImage(formData: FormData): Promise<{ url: string }>;
}

export const uploadGateway: UploadGateway = {
  async uploadEditorImage(formData: FormData): Promise<{ url: string }> {
    const res = await request.post<{ data: { url: string } }>(
      'v1/upload-image',
      formData,
    );
    return res.data.data;
  },
};
