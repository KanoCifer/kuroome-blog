import request from '@/api/request';

export const uploadService = {
  async uploadEditorImage(formData: FormData) {
    return request.post('/v1/upload-image', formData);
  },
};
