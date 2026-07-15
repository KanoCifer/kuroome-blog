import request from '@/api/shared/request';

export interface UploadGateway {
  uploadEditorImage(formData: FormData): Promise<{ url: string }>;
}

export const uploadGateway: UploadGateway = {
  async uploadEditorImage(formData: FormData): Promise<{ url: string }> {
    const res = await request.post<{ data: { url: string } }>(
      'v3/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data.data;
  },
};
